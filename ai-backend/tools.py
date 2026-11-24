import os
import time
import requests
from bs4 import BeautifulSoup
from langchain_core.tools import tool
from duckduckgo_search import DDGS
from config import OUTPUT_DIR, MAX_SEARCH_RESULTS, MAX_SCRAPE_CHARS


def _ddg_search(query: str) -> list:
    """Try DuckDuckGo search with retries."""
    for attempt in range(3):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=MAX_SEARCH_RESULTS))
                if results:
                    return results
        except Exception:
            if attempt < 2:
                time.sleep(2 ** attempt)  # 1s, 2s backoff
    return []


def _html_search(query: str) -> list:
    """Fallback: scrape DuckDuckGo HTML directly."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
        resp = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for r in soup.select(".result__body")[:MAX_SEARCH_RESULTS]:
            title_el = r.select_one(".result__title")
            url_el = r.select_one(".result__url")
            snippet_el = r.select_one(".result__snippet")
            if title_el and snippet_el:
                results.append({
                    "title": title_el.get_text(strip=True),
                    "href": f"https://{url_el.get_text(strip=True)}" if url_el else "",
                    "body": snippet_el.get_text(strip=True),
                })
        return results
    except Exception:
        return []


# ── Tool 1: Web Search ────────────────────────────────────────────────────────
@tool
def web_search(query: str) -> str:
    """Search the web for any topic and return top results.
    Use this when you need current information or facts about any topic.
    Input should be a clear search query string.
    """
    # Try DDGS API first, fall back to HTML scrape
    results = _ddg_search(query)
    if not results:
        results = _html_search(query)

    if not results:
        return f"No results found for: {query}. Try rephrasing the query."

    formatted = []
    for r in results:
        formatted.append(
            f"Title: {r.get('title', 'N/A')}\n"
            f"URL: {r.get('href', 'N/A')}\n"
            f"Summary: {r.get('body', 'N/A')}\n"
        )
    return "\n---\n".join(formatted)


# ── Tool 2: Scrape Website ────────────────────────────────────────────────────
@tool
def scrape_website(url: str) -> str:
    """Scrape and read the text content of any webpage.
    Use this when you need to read the full content of a specific URL.
    Input must be a valid URL starting with http:// or https://
    """
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/91.0.4472.124 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove scripts, styles, navs
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        # Limit length
        if len(clean_text) > MAX_SCRAPE_CHARS:
            clean_text = clean_text[:MAX_SCRAPE_CHARS] + "\n... [truncated]"

        return clean_text if clean_text else "No readable content found."

    except requests.exceptions.Timeout:
        return "Request timed out. Try a different URL."
    except requests.exceptions.HTTPError as e:
        return f"HTTP error: {e}"
    except Exception as e:
        return f"Scraping failed: {e}"


# ── Tool 3: Save to File ──────────────────────────────────────────────────────
@tool
def save_to_file(content: str, filename: str) -> str:
    """Save any text content to a file in the agent_outputs folder.
    Use this when the user asks to save, export, or write results to a file.
    Input: content to save, and a filename like 'report.txt' or 'results.md'
    """
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        # Sanitize filename
        filename = "".join(
            c for c in filename if c.isalnum() or c in "._- "
        ).strip()
        if not filename:
            filename = "output.txt"

        # Add .txt if no extension
        if "." not in filename:
            filename += ".txt"

        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        return f"Successfully saved to {filepath}"

    except Exception as e:
        return f"Failed to save file: {e}"


# ── Tool 4: Run Python Code ───────────────────────────────────────────────────
@tool
def run_python_code(code: str) -> str:
    """Execute Python code and return the output.
    Use this for calculations, data processing, or any computational task.
    Input should be valid Python code as a string.
    The code must use print() to show results.
    """
    try:
        # Capture printed output
        import io
        import sys
        import contextlib

        output_buffer = io.StringIO()

        # Block dangerous operations
        blocked = [
            "import os", "import sys", "import subprocess",
            "open(", "__import__", "eval(", "exec(",
            "shutil", "rmdir", "remove", "delete"
        ]
        for term in blocked:
            if term in code:
                return f"Blocked: '{term}' is not allowed for safety reasons."

        with contextlib.redirect_stdout(output_buffer):
            exec(code, {"__builtins__": __builtins__})

        output = output_buffer.getvalue()
        return output if output else "Code ran successfully but produced no output. Use print() to show results."

    except Exception as e:
        return f"Code execution error: {type(e).__name__}: {e}"


# ── Tool list ─────────────────────────────────────────────────────────────────
TOOLS = [web_search, scrape_website, save_to_file, run_python_code]