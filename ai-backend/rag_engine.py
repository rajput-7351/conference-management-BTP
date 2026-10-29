import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from config import (GEMINI_API_KEY, EMBEDDING_MODEL, GEMINI_MODEL,
                    CHUNK_SIZE, CHUNK_OVERLAP, MAX_RETRIVED_DOCS)
# In-memory session store
store = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Return chat history for a given session."""
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
    """Split extracted text into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " "],
    )
    chunks = splitter.split_text(text)
    if not chunks:
        raise ValueError("No chunks created. PDF may be empty or unreadable.")
    return chunks


def build_vector_store(chunks):
    """Embed text chunks and store them in a FAISS vector store."""
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_store = FAISS.from_texts(chunks, embedding=embeddings)
    return vector_store


def build_rag_chain(vector_store):
    """Build a conversational RAG chain using Gemini and the vector store."""
    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.3,
    )

    # Prompt template
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant that answers questions 
        based on the provided document context. If the answer is not in 
        the context, say so clearly. Do not make up information.
        
        Context: {context}"""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ])

    # LCEL pipeline fallback
    retriever = vector_store.as_retriever(
        search_kwargs={"k": MAX_RETRIVED_DOCS}
    )

    def get_context_str(inputs):
        docs = inputs.get("context", [])
        return "\n\n".join(doc.page_content for doc in docs)

    retrieval_chain = (
        RunnablePassthrough.assign(
            context=(lambda x: x["input"]) | retriever
        )
        | RunnablePassthrough.assign(
            answer=(lambda x: {
                "context": get_context_str(x), 
                "chat_history": x.get("chat_history", []), 
                "input": x["input"]
            }) | prompt | llm | StrOutputParser()
        )
    )

    # Wrap with message history for conversational memory
    conversational_chain = RunnableWithMessageHistory(
        retrieval_chain,
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
    vector_store = build_vector_store(chunks)
    chain = build_rag_chain(vector_store)
    return chain, len(chunks)


def ask_question(chain, question, session_id="default"):
    """Ask a question and return the answer and source chunks."""
    try:
        result = chain.invoke(
            {"input": question},
            config={"configurable": {"session_id": session_id}},
        )
        answer = result.get("answer", "No answer found.")
        sources = result.get("context", [])
        return answer, sources
    except Exception as e:
        raise RuntimeError(f"Failed to get answer: {e}")
