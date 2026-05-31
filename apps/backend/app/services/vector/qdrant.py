"""Qdrant implementation of VectorService (activate when ready)."""
from app.core.config import settings
from app.services.vector.base import VectorService


class QdrantService(VectorService):
    """Qdrant vector database — requires qdrant-client package.

    Activate by:
    1. Uncomment qdrant in docker-compose.yml
    2. Set QDRANT_URL in backend .env
    3. pip install qdrant-client (or use uv add)
    """

    def __init__(self):
        if not settings.QDRANT_URL:
            raise ValueError("QDRANT_URL not configured")
        # from qdrant_client import QdrantClient
        # self.client = QdrantClient(url=settings.QDRANT_URL)

    async def upsert(self, collection, id, vector, payload=None):
        # self.client.upsert(collection_name=collection, points=[...])
        pass

    async def search(self, collection, vector, top_k=10, filters=None):
        # results = self.client.search(collection_name=collection, query_vector=vector, limit=top_k)
        pass

    async def delete(self, collection, id):
        # self.client.delete(collection_name=collection, points_selector=[id])
        pass

    async def create_collection(self, name, vector_size, distance="Cosine"):
        # self.client.create_collection(collection_name=name, vectors_config=...)
        pass
