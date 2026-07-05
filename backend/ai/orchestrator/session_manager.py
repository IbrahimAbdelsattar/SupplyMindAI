import uuid
import logging

LOGGER = logging.getLogger(__name__)

class SessionManager:
    """Manages AI Orchestrator sessions, tracking active intents and properties."""

    @staticmethod
    def get_or_create_session(session_id: str | None = None) -> str:
        """Resolve a session identifier, generating a uuid if None."""
        if not session_id:
            resolved = str(uuid.uuid4())
            LOGGER.debug("Generated new session ID: %s", resolved)
            return resolved
        return session_id
