# RAG Chatbot API

FastAPI backend for a RAG (Retrieval-Augmented Generation) Chatbot using LangChain, Google Gemini, and Qdrant Vector Store.

---

## 🚀 Quick Start for Testing

### 1. Prerequisites
- Python 3.10+
- (Optional) Docker for running Qdrant locally

### 2. Setup Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your `GEMINI_API_KEY` in `.env`.

If using local Qdrant via Docker:
```bash
docker run -d -p 6333:6333 -p 6334:6334 --name qdrant qdrant/qdrant
```

### 5. Run the Application
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Interactive API Documentation
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/](http://localhost:8000/)

---

## 📂 Project Structure
```text
├── app/
│   ├── api/          # FastAPI routes (/chat, /upload)
│   ├── core/         # Config and system prompts
│   ├── models/       # Pydantic schemas
│   ├── scripts/      # Data ingestion scripts
│   ├── services/     # LangChain & Qdrant clients
│   └── main.py       # FastAPI application entry point
├── docs/             # Knowledge base PDF documents
├── .env.example      # Example environment variables
└── requirements.txt  # Project dependencies
```
