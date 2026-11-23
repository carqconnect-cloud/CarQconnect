from fastapi import FastAPI  # pyrefly: ignore[missing-import]
from fastapi.middleware.cors import CORSMiddleware  # pyrefly: ignore[missing-import]
from app.api.chat import router as chat_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for RAG Chatbot using FastAPI, LangChain, and Qdrant."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn  # pyrefly: ignore[missing-import]
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
