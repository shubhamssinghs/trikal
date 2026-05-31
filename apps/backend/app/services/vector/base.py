"""Abstract interface for vector database operations."""
from abc import ABC, abstractmethod


class VectorService(ABC):
    """Abstract vector service — implement with Qdrant, Pinecone, Weaviate, etc."""

    @abstractmethod
    async def upsert(
        self,
        collection: str,
        id: str,
        vector: list[float],
        payload: dict | None = None,
    ) -> None:
        ...

    @abstractmethod
    async def search(
        self,
        collection: str,
        vector: list[float],
        top_k: int = 10,
        filters: dict | None = None,
    ) -> list[dict]:
        ...

    @abstractmethod
    async def delete(self, collection: str, id: str) -> None:
        ...

    @abstractmethod
    async def create_collection(
        self, name: str, vector_size: int, distance: str = "Cosine"
    ) -> None:
        ...
