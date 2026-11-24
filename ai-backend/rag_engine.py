import pymupdf as fitz  # noqa: F401
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.retrievers import BM25Retriever
from langchain.schema import Document
import requests
from config import (GEMINI_API_KEY, GEMINI_MODEL,
                    CHUNK_SIZE, CHUNK_OVERLAP, MAX_RETRIVED_DOCS)

# ── Direct REST call to Gemini v1 API (bypasses all SDK version issues) ───────
_GEMINI_URL = f"https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent"

def call_gemini(prompt: str) -> str:
    """POST to Gemini v1 generateContent endpoint using plain requests."""
    response = requests.post(
        _GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}
        },
        timeout=60
    )
    if not response.ok:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]

# ── In-memory chat history store ──────────────────────────────────────────────
# { session_id: [ {"role": "user"|"assistant", "content": str}, ... ] }
store = {}

def get_session_history(session_id: str) -> list:
    if session_id not in store:
        store[session_id] = []
    return store[session_id]


# ── PDF Processing ─────────────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_file):
    """Extract all text from an uploaded PDF file object."""
    try:
        pdf_bytes = pdf_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if not text.strip():
            raise ValueError("PDF appears to be empty or image-only (no extractable text).")
        return text
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {e}")


def split_text_into_chunks(text: str) -> list:
    """Split extracted text into overlapping chunks for retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " "],
    )
    chunks = splitter.split_text(text)
    if not chunks:
        raise ValueError("No chunks created — PDF may be empty or unreadable.")
    return chunks


def build_retriever(chunks: list) -> BM25Retriever:
    """Build a BM25 keyword retriever — no API key or model download needed."""
    docs = [Document(page_content=chunk) for chunk in chunks]
    retriever = BM25Retriever.from_documents(docs, k=MAX_RETRIVED_DOCS)
    return retriever


def process_pdf(pdf_file):
    """Full pipeline: PDF → text → chunks → BM25 retriever. Returns (retriever, num_chunks)."""
    text = extract_text_from_pdf(pdf_file)
    chunks = split_text_into_chunks(text)
    retriever = build_retriever(chunks)
    return retriever, len(chunks)


# ── RAG Q&A ───────────────────────────────────────────────────────────────────
def ask_question(retriever: BM25Retriever, question: str, session_id: str = "default"):
    """
    Retrieve relevant chunks with BM25, then generate an answer with Gemini (v1 API).
    Returns (answer_str, sources_list).
    """
    # 1. Retrieve relevant document chunks
    docs = retriever.invoke(question)
    context = "\n\n---\n\n".join(doc.page_content for doc in docs)

    # 2. Build chat history string (last 3 exchanges)
    history = get_session_history(session_id)
    history_text = ""
    for msg in history[-6:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    # 3. Compose prompt
    prompt = f"""You are a helpful assistant that answers questions strictly based on the provided document context.
If the answer is not in the context, say "I couldn't find this in the document."
Do NOT make up information.

=== Document Context ===
{context}
========================
{f"=== Previous Conversation ==={chr(10)}{history_text}========================" if history_text else ""}

User question: {question}

Answer:"""

    # 4. Call Gemini via direct REST v1 API (no SDK, no v1beta issues)
    try:
        answer = call_gemini(prompt)
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed: {e}")

    # 5. Update chat history
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})

    return answer, []  # second item kept for API compatibility
