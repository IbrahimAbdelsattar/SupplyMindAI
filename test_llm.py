import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
load_dotenv(backend_path / ".env", override=True)

from backend.llm.client import get_llm, get_llm_info

def test_llm():
    print("Testing LLM Configuration...")
    info = get_llm_info()
    print("LLM Info:", info)
    
    # Check LangSmith config
    print("\nLangSmith Tracing Info:")
    print("  TRACING ENABLED:", os.getenv("LANGSMITH_TRACING") == "true")
    print("  PROJECT:", os.getenv("LANGSMITH_PROJECT"))
    print("  API KEY SET:", bool(os.getenv("LANGSMITH_API_KEY")) and "<your-api-key>" not in os.getenv("LANGSMITH_API_KEY"))
    print()
    
    llm = get_llm()
    if llm is None:
        print("Error: get_llm() returned None.")
        sys.exit(1)
        
    print(f"Successfully initialized ChatOpenAI instance: {llm}")
    try:
        print("Invoking model test prompt: 'Hi, return the word OK only.'")
        response = llm.invoke("Hi, return the word OK only.")
        print("Model Response:", response.content)
    except Exception as e:
        print("LLM invocation failed:", e)
        sys.exit(1)

if __name__ == "__main__":
    test_llm()
