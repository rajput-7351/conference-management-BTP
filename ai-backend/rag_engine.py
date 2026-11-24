import pymupdf as fitz  # noqa: F401
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.retrievers import BM25Retriever
from langchain.schema import Document
from google import genai
from google.genai import types
from config import (GEMINI_API_KEY, GEMINI_MODEL,
                    CHUNK_SIZE, CHUNK_OVERLAP, MAX_RETRIVED_DOCS)

# ── Google GenAI client forced to v1 API (not v1beta) ────────────────────────
def get_genai_client():
    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(api_version="v1")
    )

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

    # 4. Call Gemini via google-genai SDK on v1 API (NOT v1beta)
    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        answer = response.text
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed: {e}")

    # 5. Update chat history
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})

    return answer, []  # second item kept for API compatibility
