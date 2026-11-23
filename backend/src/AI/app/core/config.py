import os
from pathlib import Path
from dotenv import load_dotenv

def _find_env_file() -> str:
    """Walk up from this file's location to find the backend root .env"""
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / ".env"
        if candidate.exists() and (parent / "package.json").exists():
            return str(candidate)
    # Fallback: use local .env if backend .env not found
    local = Path(__file__).parent.parent.parent.parent / ".env"
    return str(local) if local.exists() else ".env"

# Load backend root .env into os.environ
_env_file = _find_env_file()
if os.path.exists(_env_file):
    load_dotenv(_env_file, override=False)

class Settings:
    """Application configuration loaded from backend root .env"""
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "RAG Chatbot API")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION_NAME: str = os.getenv("QDRANT_COLLECTION_NAME", "chatbot_docs")
    AI_PORT: int = int(os.getenv("AI_PORT", "8000"))

    def __init__(self):
        # Refresh attributes on instantiation
        self.PROJECT_NAME: str = os.getenv("PROJECT_NAME", self.PROJECT_NAME)
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", self.GEMINI_API_KEY)
        self.QDRANT_URL: str = os.getenv("QDRANT_URL", self.QDRANT_URL)
        self.QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", self.QDRANT_API_KEY)
        self.QDRANT_COLLECTION_NAME: str = os.getenv("QDRANT_COLLECTION_NAME", self.QDRANT_COLLECTION_NAME)
        self.AI_PORT: int = int(os.getenv("AI_PORT", str(self.AI_PORT)))

settings = Settings()


