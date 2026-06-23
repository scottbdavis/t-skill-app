"""MCP tool: query_learning_resources

Semantic search over a ChromaDB vector store of training materials,
returning relevant learning resources based on skill gap queries.
"""

import json
from pathlib import Path

import truststore
truststore.inject_into_ssl()

import chromadb  # noqa: E402
from pydantic import BaseModel

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RESOURCES_PATH = DATA_DIR / "learning_resources" / "resources.json"
CHROMA_DIR = DATA_DIR / "chroma"

COLLECTION_NAME = "learning_resources"


class LearningResource(BaseModel):
    id: str
    title: str
    provider: str
    source_type: str  # "internal" or "external"
    url: str
    skills: list[str]
    description: str
    relevance_score: float


class LearningResourcesResult(BaseModel):
    query: str
    total_results: int
    internal_resources: list[LearningResource]
    external_resources: list[LearningResource]


def _get_collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def ingest_learning_resources() -> int:
    """Load resources from JSON into ChromaDB. Idempotent."""
    if not RESOURCES_PATH.exists():
        return 0

    with open(RESOURCES_PATH) as f:
        resources = json.load(f)

    collection = _get_collection()

    if collection.count() >= len(resources):
        return collection.count()

    ids = []
    documents = []
    metadatas = []

    for res in resources:
        doc_text = (
            f"{res['title']}. {res['description']} "
            f"Skills: {', '.join(res['skills'])}. "
            f"Provider: {res['provider']}."
        )
        ids.append(res["id"])
        documents.append(doc_text)
        metadatas.append({
            "title": res["title"],
            "provider": res["provider"],
            "source_type": res["source_type"],
            "url": res["url"],
            "skills": json.dumps(res["skills"]),
        })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    return collection.count()


def query_learning_resources(
    skill_gaps: list[str],
    top_k: int = 5,
) -> LearningResourcesResult:
    """Search the learning resources vector store for training materials
    matching the employee's skill gaps.

    Args:
        skill_gaps: List of skill names or descriptions to find resources for.
        top_k: Maximum number of results to return.

    Returns:
        Matching learning resources split by internal/external source.
    """
    collection = _get_collection()

    if collection.count() == 0:
        ingest_learning_resources()

    query_text = ", ".join(skill_gaps)
    results = collection.query(
        query_texts=[query_text],
        n_results=min(top_k, collection.count()),
    )

    internal: list[LearningResource] = []
    external: list[LearningResource] = []

    if results and results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            distance = results["distances"][0][i] if results["distances"] else 0.0
            relevance = round(1.0 - distance, 4)

            resource = LearningResource(
                id=doc_id,
                title=meta["title"],
                provider=meta["provider"],
                source_type=meta["source_type"],
                url=meta["url"],
                skills=json.loads(meta["skills"]),
                description=results["documents"][0][i],
                relevance_score=relevance,
            )

            if meta["source_type"] == "internal":
                internal.append(resource)
            else:
                external.append(resource)

    return LearningResourcesResult(
        query=query_text,
        total_results=len(internal) + len(external),
        internal_resources=internal,
        external_resources=external,
    )
