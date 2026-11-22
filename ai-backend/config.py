import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"
EMBEDDING_MODEL = "models/text-embedding-004"   # Google's native embedding — no download needed
OUTPUT_DIR = "agent_outputs"
MAX_SEARCH_RESULTS = 5
MAX_SCRAPE_CHARS = 3000
MAX_ITERATIONS = 10

# RAG config
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
MAX_RETRIVED_DOCS = 4
