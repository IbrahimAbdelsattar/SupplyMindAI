from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class InsightsGeneratePayload(BaseModel):
    product_id: str


class ChatPayload(BaseModel):
    message: str
    context: Optional[str] = None
    selected_sku: Optional[str] = None


class ChatRequest(BaseModel):
    question: str
    selected_sku: Optional[str] = None
