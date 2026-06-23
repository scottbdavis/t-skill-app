"""Orchestrator

Coordinates the multi-agent workflow:
  Planner -> Tool Agent / Retriever -> Verifier -> Synthesizer
"""

from src.agents.planner import ExecutionPlan, create_plan
from src.agents.retriever import execute_retrieval
from src.agents.synthesizer import synthesize_skill_plan
from src.agents.tool_agent import execute_step
from src.agents.verifier import verify_skill_gap_results


def run_pipeline(user_request: str) -> str:
    """Execute the full agentic RAG pipeline for a user request.

    Returns the final synthesized skill development plan as formatted text.
    """
    print("[Orchestrator] Creating execution plan...")
    plan: ExecutionPlan = create_plan(user_request)
    print(f"[Orchestrator] Plan: {plan.goal} ({len(plan.steps)} steps)")

    tool_results: list[dict] = []
    retrieval_results: list[dict] = []

    for step in plan.steps:
        print(f"[Orchestrator] Step {step.step_number}: {step.action} - {step.description}")

        if step.action == "query_learning_resources":
            result = execute_retrieval(step)
            retrieval_results.append(result)
        else:
            result = execute_step(step)
            tool_results.append(result)

        status = "OK" if result["success"] else "FAILED"
        print(f"[Orchestrator]   -> {status}")

    print("[Orchestrator] Verifying results...")
    verification = verify_skill_gap_results(tool_results)

    if not verification.is_valid:
        print(f"[Orchestrator] Verification found {len(verification.issues)} issue(s):")
        for issue in verification.issues:
            print(f"  - {issue}")
    else:
        print("[Orchestrator] Verification passed.")

    print("[Orchestrator] Synthesizing final skill plan...")
    final_plan = synthesize_skill_plan(
        plan=plan,
        tool_results=tool_results,
        retrieval_results=retrieval_results,
        verification=verification,
    )

    print("[Orchestrator] Done.")
    return final_plan
