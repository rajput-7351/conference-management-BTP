from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tools import TOOLS
from config import GEMINI_API_KEY, GEMINI_MODEL, MAX_ITERATIONS

SYSTEM_PROMPT = """You are ResearchAgent, a powerful AI assistant that can
take actions to help users research topics, analyze data, and save results.

You have access to these tools:
- web_search: Search the internet for current information
- scrape_website: Read the full content of any webpage
- save_to_file: Save results or reports to a file
- run_python_code: Execute Python for calculations or data processing

How to behave:
- Always think step by step before acting
- Use multiple tools together to give thorough answers
- When asked to research a topic, search first then scrape top results
- When asked to save results, always confirm what was saved and where
- If one tool fails, try an alternative approach
- Be concise in your final answer but thorough in your research
- Always cite where you found information (URLs)
"""


def create_agent():
    """Create and return a LangGraph ReAct agent with memory."""
    # Add to your ChatGoogleGenerativeAI init in agent.py
    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.1,
        convert_system_message_to_human=True,  # ← add this
    )

    memory = MemorySaver()

    agent = create_react_agent(
    model=llm,
    tools=TOOLS,
    checkpointer=memory,
    prompt=SYSTEM_PROMPT,
)

    return agent


def _extract_text(content) -> str:
    """Extract plain text from any content format Gemini returns."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)


def run_agent(agent, user_message: str, thread_id: str = "default"):
    """Run the agent with a user message and return streamed steps."""
    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": MAX_ITERATIONS,
    }

    messages = [HumanMessage(content=user_message)]
    steps = []

    try:
        for chunk in agent.stream(
            {"messages": messages},
            config=config,
            stream_mode="updates",
        ):
            for node, update in chunk.items():
                if "messages" in update:
                    for msg in update["messages"]:
                        msg_type = type(msg).__name__

                        # Tool call
                        if hasattr(msg, "tool_calls") and msg.tool_calls:
                            for tc in msg.tool_calls:
                                steps.append({
                                    "type": "tool_call",
                                    "tool": tc["name"],
                                    "input": tc["args"],
                                })

                        # Tool result
                        elif msg_type == "ToolMessage":
                            steps.append({
                                "type": "tool_result",
                                "tool": msg.name,
                                "output": _extract_text(msg.content),
                            })

                        # Final answer — extract clean text
                        elif msg_type == "AIMessage" and msg.content:
                            clean = _extract_text(msg.content)
                            if clean.strip():
                                steps.append({
                                    "type": "answer",
                                    "content": clean,
                                })

    except Exception as e:
        steps.append({
            "type": "error",
            "content": f"Agent error: {e}",
        })

    return steps


def get_final_answer(steps: list) -> str:
    """Extract the last clean answer from agent steps."""
    for step in reversed(steps):
        if step["type"] == "answer":
            return step["content"]
    return "Agent did not produce a final answer."