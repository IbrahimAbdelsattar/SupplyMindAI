from fastapi import FastAPI
from pydantic import BaseModel

import json

from context_builder import build_context
from prompts import SYSTEM_PROMPT
from llm_client import ask_gemini

# =====================================================
# APP
# =====================================================

app = FastAPI(
    title="SupplyMind AI",
    version="2.0 - Gemini Powered"
)

# =====================================================
# REQUEST MODEL
# =====================================================

class ChatRequest(BaseModel):
    question: str

# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():
    return {
        "message": "SupplyMind AI running with Gemini"
    }

# =====================================================
# CHAT ENDPOINT
# =====================================================

@app.post("/chat")
def chat(request: ChatRequest):

    try:

        # -------------------------------------------------
        # STEP 1: BUILD CONTEXT
        # -------------------------------------------------

        context = build_context()

        context_json = json.dumps(
            context,
            indent=2
        )

        # -------------------------------------------------
        # STEP 2: BUILD PROMPT
        # -------------------------------------------------

        prompt = f"""
You are SupplyMind AI, an expert supply chain intelligence system.

You analyze inventory, sales, production, and forecasting data.

========================
SUPPLY CHAIN DATA
========================

{context_json}

========================
USER QUESTION
========================

{request.question}

========================
TASKS
========================

- Identify low stock products
- Detect overstock situations
- Detect demand anomalies
- Identify production inefficiencies
- Detect supplier risks
- Forecast shortages
- Recommend actions
- ALWAYS explain WHY (important for business decisions)

========================
OUTPUT FORMAT
========================

Use:
- bullet points
- clear reasoning
- product IDs
- business language (no technical ML jargon)
"""

        # -------------------------------------------------
        # STEP 3: CALL GEMINI
        # -------------------------------------------------

        answer = ask_gemini(prompt)

        return {
            "success": True,
            "model": "gemini-2.5-pro",
            "question": request.question,
            "response": answer
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }