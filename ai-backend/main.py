from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

import rag_engine
from agent import create_agent, run_agent, get_final_answer

# Global variables for simple demo state
global_rag_chain = None
research_agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler — runs on startup and shutdown."""
    global research_agent
    try:
        research_agent = create_agent()
        print("Research agent initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize research agent: {e}")
    yield  # App runs here
    # Shutdown logic (if needed) goes below yield
    print("NexGen AI Backend shutting down.")

app = FastAPI(title="NexGen AI Backend", lifespan=lifespan)

# Enable CORS for the frontend (allow all origins for public deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    session_id: str = "default"

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "NexGen AI Backend is running", "agent_ready": research_agent is not None}

@app.post("/api/rag/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global global_rag_chain
    try:
        chain, chunks = rag_engine.process_pdf(file.file)
        global_rag_chain = chain
        return {"success": True, "chunks": chunks, "message": f"Successfully indexed {chunks} chunks."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/ask")
async def ask_rag(request: QueryRequest):
    global global_rag_chain
    if not global_rag_chain:
        raise HTTPException(status_code=400, detail="No PDF processed yet. Please upload a PDF first.")
    try:
        answer, sources = rag_engine.ask_question(global_rag_chain, request.query, request.session_id)
        safe_sources = [doc.page_content[:300] + "..." for doc in sources] if sources else []
        return {"answer": answer, "sources": safe_sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/run")
async def run_research_agent_endpoint(request: QueryRequest):
    if not research_agent:
        raise HTTPException(status_code=500, detail="Agent is not initialized. Check GEMINI_API_KEY.")
    try:
        steps = run_agent(research_agent, request.query, request.session_id)
        final_answer = get_final_answer(steps)
        return {"final_answer": final_answer, "steps": steps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Render injects PORT env variable automatically
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

