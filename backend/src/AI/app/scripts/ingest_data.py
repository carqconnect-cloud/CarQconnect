import os
import argparse
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore

# Load environment variables if running outside fastapi
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.services.qdrant_client import get_qdrant_client, init_collection, delete_collection

def normalize_path(path: str) -> str:
    """Normalizes path and converts Windows drive paths (e.g. C:\\...) to WSL paths if running on Linux."""
    clean_path = path.strip('\'"')
    if os.name != "nt" and len(clean_path) >= 3 and clean_path[1] == ":" and clean_path[2] in ("\\", "/"):
        drive = clean_path[0].lower()
        subpath = clean_path[3:].replace("\\", "/")
        wsl_path = f"/mnt/{drive}/{subpath}"
        if os.path.exists(wsl_path):
            return wsl_path
    return clean_path

def clear_knowledgebase():
    """Deletes existing collection in Qdrant to clear old knowledge base."""
    client = get_qdrant_client()
    print(f"Clearing collection '{settings.QDRANT_COLLECTION_NAME}'...")
    delete_collection(client, settings.QDRANT_COLLECTION_NAME)

def ingest_pdf(pdf_path: str, reset: bool = False):
    """Loads a PDF, chunks it, and ingests it into Qdrant."""
    client = get_qdrant_client()
    
    if reset:
        print(f"Resetting collection '{settings.QDRANT_COLLECTION_NAME}' before ingestion...")
        delete_collection(client, settings.QDRANT_COLLECTION_NAME)

    resolved_path = normalize_path(pdf_path)
    if not os.path.exists(resolved_path):
        print(f"File not found: {pdf_path} (resolved as: {resolved_path})")
        return

    print(f"Loading PDF: {resolved_path}")
    loader = PyPDFLoader(resolved_path)
    documents = loader.load()
    
    print(f"Loaded {len(documents)} pages. Splitting into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")
    
    # Ensure collection exists
    init_collection(client, settings.QDRANT_COLLECTION_NAME, vector_size=768)
    
    # Initialize Embeddings
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.GEMINI_API_KEY,
        output_dimensionality=768,
    )
    
    print(f"Upserting vectors into Qdrant collection '{settings.QDRANT_COLLECTION_NAME}'...")
    # This automatically computes embeddings and upserts to Qdrant
    QdrantVectorStore.from_documents(
        chunks,
        embeddings,
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        collection_name=settings.QDRANT_COLLECTION_NAME,
    )
    
    print("Ingestion complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a PDF into Qdrant or manage the knowledge base collection")
    parser.add_argument("pdf_path", type=str, nargs="?", default=None, help="Path to the PDF file")
    parser.add_argument("--reset", action="store_true", help="Wipe existing collection before ingesting the new PDF")
    parser.add_argument("--clear-only", action="store_true", help="Wipe existing collection from Qdrant without ingesting a file")
    args = parser.parse_args()
    
    if args.clear_only:
        clear_knowledgebase()
    elif args.pdf_path:
        ingest_pdf(args.pdf_path, reset=args.reset)
    else:
        parser.print_help()

