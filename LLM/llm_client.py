import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# =====================================================
# OPENROUTER CONFIG
# =====================================================
# Using OpenRouter with a :free model to avoid Google's
# exhausted free-tier quota (limit: 0 errors).
#
# Currently available free models on OpenRouter:
#   - deepseek/deepseek-v4-flash:free       ← default (fast & smart)
#   - google/gemma-4-31b-it:free
#   - google/gemma-4-26b-a4b-it:free
#   - nvidia/nemotron-3-super-120b-a12b:free
#   - openai/gpt-oss-120b:free

OPENROUTER_API_KEY = os.getenv("LLM_REASONING_API_KEY") or os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
FREE_MODEL = "openai/gpt-oss-120b:free"

# =====================================================
# MAIN CALL FUNCTION
# =====================================================

def ask_gemini(prompt: str, retries: int = 3) -> str:
    """
    Send a prompt to OpenRouter (free model) and return the response text.
    Drop-in replacement for the old Gemini direct API call.
    Retries automatically on rate-limit (429) errors.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set in your .env file.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://supplymind.ai",
        "X-Title": "SupplyMind AI",
    }

    payload = {
        "model": FREE_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    for attempt in range(retries):
        try:
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)

            # Rate limited — wait and retry
            if response.status_code == 429:
                wait = 15 * (attempt + 1)
                print(f"[Rate limit] Waiting {wait}s before retry {attempt + 1}/{retries}...")
                time.sleep(wait)
                continue

            # Show useful error detail before raising
            if not response.ok:
                raise RuntimeError(
                    f"OpenRouter error {response.status_code}: {response.text}"
                )

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except RuntimeError:
            raise  # Don't retry on explicit errors (wrong model, bad key, etc.)

        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                print(f"[Request error] {e}. Retrying {attempt + 1}/{retries}...")
                time.sleep(5)
            else:
                raise RuntimeError(f"OpenRouter API failed after {retries} retries: {e}")

    raise RuntimeError(f"OpenRouter API failed after {retries} retries (rate limited).")