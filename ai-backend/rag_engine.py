import pymupdf as fitz  # noqa: F401
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.retrievers import BM25Retriever
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain.schema import Document
from config import (GEMINI_API_KEY, GEMINI_MODEL,
                    CHUNK_SIZE, CHUNK_OVERLAP, MAX_RETRIVED_DOCS)

# In-memory session store
store = {}
# Global BM25 retriever (rebuilt on each PDF upload)
_retriever = None


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]


def extract_text_from_pdf(pdf_file):
    """Extract all text from an uploaded PDF file object."""
    try:
        pdf_bytes = pdf_file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        raise RuntimeError(f"Failed to extract text from PDF: {e}")


def split_text_into_chunks(text):
    """Split extracted text into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " "],
    )
    chunks = splitter.split_text(text)
    if not chunks:
        raise ValueError("No chunks created. PDF may be empty or unreadable.")
    return chunks


def build_retriever(chunks):
    """Build a BM25 keyword retriever — no API key or model download needed."""
    global _retriever
    docs = [Document(page_content=chunk) for chunk in chunks]
    _retriever = BM25Retriever.from_documents(docs, k=MAX_RETRIVED_DOCS)
    return _retriever


def build_rag_chain(retriever):
    """Build a conversational RAG chain using Gemini LLM and BM25 retriever."""
    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.3,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant that answers questions 
        based on the provided document context. If the answer is not in 
        the context, say so clearly. Do not make up information.
        
        Context: {context}"""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ])

    def retrieve_context(inputs):
        docs = retriever.invoke(inputs["input"])
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        RunnablePassthrough.assign(context=RunnableLambda(retrieve_context))
        | RunnablePassthrough.assign(
            answer=(lambda x: {
                "context": x["context"],
                "chat_history": x.get("chat_history", []),
                "input": x["input"]
            }) | prompt | llm | StrOutputParser()
        )
    )

    conversational_chain = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )

    return conversational_chain


def process_pdf(pdf_file):
    """Full pipeline — PDF to RAG chain. Returns a ready-to-use chain."""
    text = extract_text_from_pdf(pdf_file)
    chunks = split_text_into_chunks(text)
    retriever = build_retriever(chunks)
    chain = build_rag_chain(retriever)
    return chain, len(chunks)


def ask_question(chain, question, session_id="default"):
    """Ask a question and return the answer."""
    try:
        result = chain.invoke(
            {"input": question},
            config={"configurable": {"session_id": session_id}},
        )
        answer = result.get("answer", "No answer found.")
        return answer, []
    except Exception as e:
        raise RuntimeError(f"Failed to get answer: {e}")
