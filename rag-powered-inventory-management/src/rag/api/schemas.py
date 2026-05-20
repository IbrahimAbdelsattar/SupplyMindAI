"""Request and response models for the inventory API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    selected_sku: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
