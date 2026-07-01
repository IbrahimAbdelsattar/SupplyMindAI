from __future__ import annotations


def adjust_inventory(product_id: str, quantity: int, reason: str) -> dict:
    return {
        "status": "adjusted",
        "product_id": product_id,
        "quantity": quantity,
        "reason": reason,
    }
