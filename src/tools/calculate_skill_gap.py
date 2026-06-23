"""MCP tool: calculate_skill_gap

Pure-math implementation of the T-Skill gap formula.
No LLM involved — this guarantees deterministic, non-hallucinated rankings.

Skill gap per sub-skill:
  2 × (value_to_sponsor − skill_rating) + 1 × (value_to_mitre − skill_rating)
Ranking and development focus use the highest skill gaps.
"""

from pydantic import BaseModel, Field


def compute_skill_gap(
    skill_rating: int,
    value_to_sponsor: int,
    value_to_mitre: int,
) -> int:
    """Weighted gap: 2× sponsor gap + 1× MITRE gap."""
    sponsor_gap = value_to_sponsor - skill_rating
    mitre_gap = value_to_mitre - skill_rating
    return 2 * sponsor_gap + mitre_gap


class SkillInput(BaseModel):
    sub_skill: str
    skill_rating: int = Field(ge=1, le=5, description="Self-evaluation rating 1-5")
    value_to_sponsor: int = Field(ge=1, le=5, description="Value to sponsor rating 1-5")
    value_to_mitre: int = Field(
        default=3, ge=1, le=5, description="Value to MITRE rating 1-5"
    )


class SkillScore(BaseModel):
    sub_skill: str
    skill_rating: int
    value_to_sponsor: int
    value_to_mitre: int
    skill_gap: int
    total_score: int
    rank: int


class SkillGapResult(BaseModel):
    employee_name: str
    ranked_skills: list[SkillScore]
    top_development_focus: list[str]
    highest_skill_gap: int
    highest_skill_gap_sub_skill: str
    current_shape: str
    shape_description: str


def determine_shape(ranked_skills: list[SkillScore], threshold: int = 15) -> tuple[str, str, list[str]]:
    """Determine T/N/M shape from product scores (skill_rating × value_to_sponsor)."""
    high_scorers = [s for s in ranked_skills if s.total_score >= threshold]
    pillar_count = len(high_scorers)

    if pillar_count >= 3:
        shape = "M"
        description = "Basic M Shape: Deep expertise spanning three or more vertical pillars"
    elif pillar_count == 2:
        shape = "N"
        description = "Basic N Shape: Deep expertise spanning two vertical pillars"
    else:
        shape = "T"
        description = "Core T Shape: Deep expertise in one vertical pillar"

    deep_pillars = [s.sub_skill for s in high_scorers]
    return shape, description, deep_pillars


def calculate_skill_gap(
    employee_name: str,
    skills: list[SkillInput],
) -> SkillGapResult:
    """Compute weighted per-skill gap, rank by highest gap, and T-shape.

    Gap formula per sub-skill:
      2 × (value_to_sponsor − skill_rating) + (value_to_mitre − skill_rating)

    Args:
        employee_name: Name of the employee being evaluated.
        skills: List of skill self-evaluations with ratings and values.

    Returns:
        Ranked skill gap analysis with highest-gap summary and shape.
    """
    scored: list[SkillScore] = []
    for s in skills:
        skill_gap = compute_skill_gap(
            s.skill_rating, s.value_to_sponsor, s.value_to_mitre
        )
        total = s.skill_rating * s.value_to_sponsor
        scored.append(
            SkillScore(
                sub_skill=s.sub_skill,
                skill_rating=s.skill_rating,
                value_to_sponsor=s.value_to_sponsor,
                value_to_mitre=s.value_to_mitre,
                skill_gap=skill_gap,
                total_score=total,
                rank=0,
            )
        )

    scored.sort(key=lambda x: x.skill_gap, reverse=True)
    for i, s in enumerate(scored, start=1):
        s.rank = i

    shape, description, _ = determine_shape(scored)

    top_n = min(3, len(scored))
    top_focus = [s.sub_skill for s in scored[:top_n]]

    highest = scored[0] if scored else None
    highest_gap = highest.skill_gap if highest else 0
    highest_name = highest.sub_skill if highest else ""

    return SkillGapResult(
        employee_name=employee_name,
        ranked_skills=scored,
        top_development_focus=top_focus,
        highest_skill_gap=highest_gap,
        highest_skill_gap_sub_skill=highest_name,
        current_shape=shape,
        shape_description=description,
    )
