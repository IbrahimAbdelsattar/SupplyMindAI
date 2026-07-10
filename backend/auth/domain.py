"""Domain validation — only @supplymind.tech emails are allowed."""

from __future__ import annotations

import logging

import os

ALLOWED_DOMAIN = os.getenv("ALLOWED_DOMAIN", "supplymind.tech").strip()

logger = logging.getLogger("backend.auth.domain")


def extract_domain(email: str) -> str | None:
    """Extract the domain part from an email address.

    Returns None if the email has no '@' or is malformed.
    """
    if not email or "@" not in email:
        return None
    parts = email.rsplit("@", 1)
    if len(parts) != 2 or not parts[1]:
        return None
    return parts[1].lower().strip()


def is_valid_domain(email: str) -> bool:
    """Return True if the email belongs to the allowed domain (if configured)."""
    if not ALLOWED_DOMAIN or ALLOWED_DOMAIN == "*":
        return True
    domain = extract_domain(email)
    return domain == ALLOWED_DOMAIN.lower()


def validate_domain_or_reject(email: str) -> str:
    """Validate email domain; raise ValueError if invalid.

    Returns the extracted domain on success.
    """
    domain = extract_domain(email)
    if domain is None:
        raise ValueError(f"Malformed email address: {email}")
    if ALLOWED_DOMAIN and ALLOWED_DOMAIN != "*" and domain != ALLOWED_DOMAIN.lower():
        raise ValueError(
            f"Email domain '{domain}' is not authorized. "
            f"Only @{ALLOWED_DOMAIN} corporate emails are permitted."
        )
    return domain
