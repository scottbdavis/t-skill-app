"""Verifier Agent

Validates the outputs from the tool and retriever agents to ensure:
  - Skill gap math is correct (2× sponsor gap + 1× MITRE gap)
  - Rankings follow highest skill_gap first
  - Shape classification follows logical progression (T -> N -> M)
"""

from pydantic import BaseModel

from src.tools.calculate_skill_gap import compute_skill_gap


class VerificationResult(BaseModel):
    is_valid: bool
    issues: list[str]
    corrected_data: dict | None = None


def verify_skill_gap_results(tool_results: list[dict]) -> VerificationResult:
    """Verify all tool execution results for correctness."""
    issues: list[str] = []

    for result in tool_results:
        if not result.get("success"):
            issues.append(f"Step '{result['action']}' failed: {result['result']}")
            continue

        if result["action"] == "calculate_skill_gap":
            _verify_math(result["result"], issues)
            _verify_shape(result["result"], issues)

    return VerificationResult(
        is_valid=len(issues) == 0,
        issues=issues,
    )


def _verify_math(gap_result: dict, issues: list[str]) -> None:
    """Verify skill_gap and total_score formulas and gap-based ranking."""
    ranked = gap_result.get("ranked_skills", [])
    for skill in ranked:
        expected_gap = compute_skill_gap(
            skill["skill_rating"],
            skill["value_to_sponsor"],
            skill["value_to_mitre"],
        )
        if skill.get("skill_gap") != expected_gap:
            issues.append(
                f"Gap error for '{skill['sub_skill']}': "
                f"2×({skill['value_to_sponsor']} − {skill['skill_rating']}) + "
                f"({skill['value_to_mitre']} − {skill['skill_rating']}) = {expected_gap}, "
                f"but got {skill.get('skill_gap')}"
            )
        expected_product = skill["skill_rating"] * skill["value_to_sponsor"]
        if skill["total_score"] != expected_product:
            issues.append(
                f"Product error for '{skill['sub_skill']}': "
                f"{skill['skill_rating']} * {skill['value_to_sponsor']} = {expected_product}, "
                f"but got {skill['total_score']}"
            )

    for i in range(len(ranked) - 1):
        if ranked[i]["skill_gap"] < ranked[i + 1]["skill_gap"]:
            issues.append(
                f"Ranking error: '{ranked[i]['sub_skill']}' (gap {ranked[i]['skill_gap']}) "
                f"is ranked above '{ranked[i+1]['sub_skill']}' (gap {ranked[i+1]['skill_gap']})"
            )

    if ranked:
        reported_highest = gap_result.get("highest_skill_gap")
        if reported_highest is not None and reported_highest != ranked[0]["skill_gap"]:
            issues.append(
                f"Highest gap mismatch: reported {reported_highest}, "
                f"top ranked has {ranked[0]['skill_gap']}"
            )


SHAPE_THRESHOLDS = {"T": 1, "N": 2, "M": 3}


def _verify_shape(gap_result: dict, issues: list[str]) -> None:
    """Verify that the shape classification matches the number of high-scoring pillars."""
    shape = gap_result.get("current_shape", "")
    if shape not in SHAPE_THRESHOLDS:
        issues.append(f"Unknown shape: '{shape}'. Expected one of T, N, M.")
        return

    threshold = 15
    high_scorers = [
        s for s in gap_result.get("ranked_skills", [])
        if s["total_score"] >= threshold
    ]
    count = len(high_scorers)

    if count >= 3 and shape != "M":
        issues.append(f"Shape should be 'M' ({count} pillars >= {threshold}), but got '{shape}'")
    elif count == 2 and shape != "N":
        issues.append(f"Shape should be 'N' ({count} pillars >= {threshold}), but got '{shape}'")
    elif count <= 1 and shape != "T":
        issues.append(f"Shape should be 'T' ({count} pillars >= {threshold}), but got '{shape}'")
