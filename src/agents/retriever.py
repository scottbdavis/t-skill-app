"""Retriever Agent

Handles retrieval-augmented steps by querying the ChromaDB vector store
for learning resources that match identified skill gaps.
"""

from src.agents.planner import PlanStep
from src.tools.query_learning_resources import (
    LearningResourcesResult,
    query_learning_resources,
)


def execute_retrieval(step: PlanStep) -> dict:
    """Execute a learning resource retrieval step.

    Returns a dict with keys 'action', 'success', and 'result'.
    """
    params = step.parameters

    try:
        if step.action != "query_learning_resources":
            return {
                "action": step.action,
                "success": False,
                "result": f"Retriever cannot handle action: {step.action}",
            }

        skill_gaps = params.get("skill_gaps", [])
        top_k = params.get("top_k", 5)

        result: LearningResourcesResult = query_learning_resources(
            skill_gaps=skill_gaps,
            top_k=top_k,
        )

        return {
            "action": step.action,
            "success": True,
            "result": result.model_dump(),
        }
    except Exception as e:
        return {"action": step.action, "success": False, "result": str(e)}
