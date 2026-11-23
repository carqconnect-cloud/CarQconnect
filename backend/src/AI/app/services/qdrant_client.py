from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.core.config import settings

def get_qdrant_client() -> QdrantClient:
    """Initialize and return a Qdrant client."""
    if settings.QDRANT_URL.startswith("http"):
        client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    else:
        # Fallback to local memory/disk if needed, though URL is expected
        client = QdrantClient(path=":memory:")
    return client

def init_collection(client: QdrantClient, collection_name: str, vector_size: int = 1536):
    """Ensure the Qdrant collection exists."""
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        print(f"Collection '{collection_name}' created.")
    else:
        print(f"Collection '{collection_name}' already exists.")

def delete_collection(client: QdrantClient, collection_name: str):
    """Delete a Qdrant collection if it exists."""
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name=collection_name)
        print(f"Collection '{collection_name}' deleted.")
    else:
        print(f"Collection '{collection_name}' does not exist.")


