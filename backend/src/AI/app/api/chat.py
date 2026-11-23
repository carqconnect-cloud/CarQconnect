import os
import time
import asyncio
import shutil
from fastapi import APIRouter, HTTPException, UploadFile, File  # pyrefly: ignore[missing-import]

from app.models.schemas import ChatRequest, ChatResponse
from app.services.langchain_agent import ask_question
from app.scripts.ingest_data import ingest_pdf

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    start_time = time.time()
    try:
        # Call our LangChain service
        answer, sources = ask_question(request.message, request.session_id)
        
        # Pacing: ensure response is delivered after 3 seconds for natural conversational flow
        elapsed = time.time() - start_time
        if elapsed < 3.0:
            await asyncio.sleep(3.0 - elapsed)
        
        return ChatResponse(
            answer=answer,
            session_id=request.session_id,
            source_documents=sources
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Uploads a PDF, saves it to the docs folder, and triggers the RAG ingestion pipeline."""
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
        
    os.makedirs("docs", exist_ok=True)
    file_path = f"docs/{file.filename}"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trigger the ingestion script logic directly
        ingest_pdf(file_path)
        
        return {"status": "success", "message": f"Successfully ingested {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
