"""Career path agent pipeline.

Extrapolates a multi-year career progression from the current skills matrix,
gap analysis, and desired future T/N/M shape acquisition.
"""

from __future__ import annotations

import json
import os
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel

from src.agents.training_plan import (
    SHAPE_EMPHASIS,
    TargetShape,
    TrainingPlanContext,
    build_training_context,
)
from src.db.database import get_session
from src.db.taxonomy_crud import list_taxonomy
from src.tools.calculate_skill_gap import (
    SkillGapResult,
    SkillInput,
    SkillScore,
    calculate_skill_gap,
    determine_shape,
)
from src.tools.extract_hr_skills import extract_hr_skills

CareerHorizon = Literal["short", "medium", "long"]

HORIZON_LABELS: dict[CareerHorizon, str] = {
    "short": "1–2 years",
    "medium": "3–5 years",
    "long": "5+ years",
}


class CareerPathContext(BaseModel):
    employee_name: str
    department: str | None = None
    role: str | None = None
    career_horizon: CareerHorizon
    career_horizon_label: str
    current_shape: str
    target_shape: TargetShape
    shape_progression: dict[str, str]
    skill_trajectory: list[dict]
    matrix_analysis: dict
    recommended_pillar_categories: list[str]
    top_development_focus: list[str]


def _project_skill(
    skill: SkillScore, *, high_priority: bool
) -> dict:
    """Deterministic rating extrapolation from current state toward sponsor value."""
    gap = skill.skill_gap
    if high_priority:
        bump_12 = min(2, gap) if gap > 0 else 0
        bump_24 = min(2, max(0, gap - bump_12))
    else:
        bump_12 = min(1, gap) if gap > 0 else 0
        bump_24 = min(1, max(0, gap - bump_12))

    rating_12 = min(5, skill.skill_rating + bump_12)
    rating_24 = min(5, skill.skill_rating + bump_12 + bump_24)
    rating_36 = min(5, skill.value_to_sponsor)

    value = skill.value_to_sponsor

    def _gap_at(rating: int) -> int:
        return max(0, value - rating)

    return {
        "sub_skill": skill.sub_skill,
        "priority": "high" if high_priority else "standard",
        "current_skill_rating": skill.skill_rating,
        "current_value_to_sponsor": value,
        "current_value_to_mitre": skill.value_to_mitre,
        "current_skill_gap": gap,
        "current_total_score": skill.total_score,
        "projected_12mo_rating": rating_12,
        "projected_24mo_rating": rating_24,
        "projected_36mo_rating": rating_36,
        "projected_12mo_gap": _gap_at(rating_12),
        "projected_24mo_gap": _gap_at(rating_24),
        "projected_36mo_gap": _gap_at(rating_36),
    }


def build_skill_trajectory(ranked_skills: list[SkillScore]) -> list[dict]:
    return [
        _project_skill(s, high_priority=(i < 3))
        for i, s in enumerate(ranked_skills)
    ]


def _shape_at_horizon(trajectory: list[dict], rating_field: str) -> tuple[str, str]:
    scored: list[SkillScore] = []
    for row in trajectory:
        rating = row[rating_field]
        value = row["current_value_to_sponsor"]
        scored.append(
            SkillScore(
                sub_skill=row["sub_skill"],
                skill_rating=rating,
                value_to_sponsor=value,
                value_to_mitre=row.get("current_value_to_mitre", 3),
                skill_gap=max(0, value - rating),
                total_score=rating * value,
                rank=0,
            )
        )
    shape, description, _ = determine_shape(scored)
    return shape, description


def build_shape_progression(
    gap_result: SkillGapResult,
    trajectory: list[dict],
    target_shape: TargetShape,
) -> dict[str, str]:
    s12, _ = _shape_at_horizon(trajectory, "projected_12mo_rating")
    s24, _ = _shape_at_horizon(trajectory, "projected_24mo_rating")
    s36, d36 = _shape_at_horizon(trajectory, "projected_36mo_rating")
    return {
        "now": gap_result.current_shape,
        "now_description": gap_result.shape_description,
        "12_months": s12,
        "24_months": s24,
        "36_months": s36,
        "36_months_description": d36,
        "target_acquisition_goal": target_shape,
    }


def build_career_context(
    gap_result: SkillGapResult,
    matrix_context: TrainingPlanContext,
    target_shape: TargetShape,
    career_horizon: CareerHorizon,
    *,
    department: str | None = None,
    role: str | None = None,
) -> CareerPathContext:
    trajectory = build_skill_trajectory(gap_result.ranked_skills)
    progression = build_shape_progression(gap_result, trajectory, target_shape)

    return CareerPathContext(
        employee_name=gap_result.employee_name,
        department=department,
        role=role,
        career_horizon=career_horizon,
        career_horizon_label=HORIZON_LABELS[career_horizon],
        current_shape=gap_result.current_shape,
        target_shape=target_shape,
        shape_progression=progression,
        skill_trajectory=trajectory,
        matrix_analysis=matrix_context.model_dump(),
        recommended_pillar_categories=matrix_context.recommended_pillar_categories,
        top_development_focus=gap_result.top_development_focus,
    )


CAREER_SYNTHESIS_PROMPT = """You are a career development strategist for a T-shaped workforce model.

You will receive:
- Current skills matrix and gap analysis (skill_gap = 2× sponsor gap + MITRE gap)
- Deterministic skill trajectory projections (12 / 24 / 36 months)
- Projected T/N/M shape progression
- Target shape the employee wants to acquire (T, N, or M)
- Career planning horizon (short, medium, or long)

Your job is to **extrapolate a credible career path** from today's matrix through future
skill acquisition to roles that fit the target shape. Ground every recommendation in
the provided data; do not invent skills not in the taxonomy.

Rules:
1. Anchor the path on **closing the largest skill gaps first**, then shape-aligned depth.
2. Explain how sub-skill growth under primary categories leads to the target T/N/M matrix.
3. Use the projected shape progression (now → 12mo → 24mo → 36mo → target) explicitly.
4. Propose role archetypes (not exact job titles unless data supports it) at each stage.
5. Align timeline depth with the career horizon (short = near-term moves; long = executive/portfolio).
6. For T: specialist / principal depth in one pillar. For N: dual-domain lead. For M: balanced multi-pillar leader.

Output markdown with these sections:

## Career Path Overview
Employee, role context, horizon, current vs target shape, and north-star outcome.

## Current Skills Matrix (Today)
Summary of pillars, largest gaps, and what the current shape enables.

## Future Skills Matrix (Target Acquisition)
What the employee's matrix should look like after planned acquisition; reference projected 36-month ratings.

## Extrapolated Timeline
Table or bullets for 0–12, 12–24, 24–36 months (and beyond if long horizon): skills, shape, and career moves.

## Role Progression Archetypes
3–5 staged roles from current toward horizon, tied to skill evidence.

## Skill Acquisition Roadmap
Ordered sub-skills and primary categories; link to gap closure and pillar strategy.

## Sponsors & Organizational Fit
How value_to_sponsor alignment supports promotion or new opportunities.

## Risks, Dependencies & Success Metrics
What could block the path; measurable checkpoints (ratings, gaps, shape milestones).
"""


def synthesize_career_path(context: CareerPathContext) -> str:
    emphasis = SHAPE_EMPHASIS[context.target_shape]
    user_content = (
        f"Career horizon: {context.career_horizon_label} ({context.career_horizon})\n\n"
        f"Target shape emphasis:\n{emphasis}\n\n"
        f"Career path analysis:\n```json\n"
        f"{json.dumps(context.model_dump(), indent=2)}\n```"
    )

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.4,
        messages=[
            {"role": "system", "content": CAREER_SYNTHESIS_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content or ""


def run_career_path(
    employee_name: str,
    skills: list[SkillInput],
    target_shape: TargetShape,
    career_horizon: CareerHorizon = "medium",
) -> dict:
    """Build gap analysis, trajectory extrapolation, and career path narrative."""
    gap_result = calculate_skill_gap(employee_name, skills)

    session = get_session()
    try:
        taxonomy = list_taxonomy(session)
    finally:
        session.close()

    matrix_context = build_training_context(gap_result, target_shape, taxonomy)

    department: str | None = None
    role: str | None = None
    hr = extract_hr_skills(employee_name)
    if not isinstance(hr, str):
        department = hr.department
        role = hr.role

    context = build_career_context(
        gap_result,
        matrix_context,
        target_shape,
        career_horizon,
        department=department,
        role=role,
    )

    career_markdown = synthesize_career_path(context)

    return {
        "career_path": career_markdown,
        "gap_analysis": gap_result.model_dump(),
        "context": context.model_dump(),
    }
