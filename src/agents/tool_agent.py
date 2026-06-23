"""Tool Agent

Executes plan steps by invoking the appropriate MCP tools.
This agent is deterministic — it maps plan actions to tool functions.
"""

from src.agents.planner import PlanStep
from src.tools.calculate_skill_gap import (
    SkillGapResult,
    SkillInput,
    calculate_skill_gap,
)
from src.tools.extract_hr_skills import HRSkillsResult, extract_hr_skills
from src.tools.generate_mock_hr_data import MockDataResult, generate_mock_hr_data


def execute_step(step: PlanStep) -> dict:
    """Execute a single plan step and return the result.

    Returns a dict with keys 'action', 'success', and 'result'.
    """
    params = step.parameters

    try:
        if step.action == "extract_hr_skills":
            result = extract_hr_skills(params["employee_name"])
            if isinstance(result, str):
                return {"action": step.action, "success": False, "result": result}
            return {
                "action": step.action,
                "success": True,
                "result": result.model_dump(),
            }

        elif step.action == "generate_mock_data":
            result: MockDataResult = generate_mock_hr_data(
                num_employees=params.get("num_employees", 3)
            )
            return {
                "action": step.action,
                "success": True,
                "result": result.model_dump(),
            }

        elif step.action == "calculate_skill_gap":
            skills = [SkillInput(**s) for s in params["skills"]]
            result: SkillGapResult = calculate_skill_gap(
                params["employee_name"], skills
            )
            return {
                "action": step.action,
                "success": True,
                "result": result.model_dump(),
            }

        else:
            return {
                "action": step.action,
                "success": False,
                "result": f"Unknown action: {step.action}",
            }
    except Exception as e:
        return {"action": step.action, "success": False, "result": str(e)}
