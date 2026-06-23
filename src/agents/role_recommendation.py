"""Agent: recommend open roles aligned with skill gaps and career path."""

from __future__ import annotations

import json
import os
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field

from src.agents.career_path import CareerHorizon, build_career_context, build_skill_trajectory
from src.agents.training_plan import TargetShape, build_training_context
from src.db.database import get_session
from src.db.roles_crud import OpenRoleOut, list_open_roles
from src.db.seed_roles import seed_open_roles
from src.db.taxonomy_crud import list_taxonomy
from src.tools.calculate_skill_gap import SkillInput, calculate_skill_gap
from src.tools.extract_hr_skills import extract_hr_skills

TargetShapeLiteral = Literal["T", "N", "M"]


class RoleFitScore(BaseModel):
    role_id: int
    title: str
    deterministic_fit_score: float
    matching_develop_skills: list[dict]


class RoleRecommendationItem(BaseModel):
    role_id: int
    title: str
    fit_score: int = Field(ge=0, le=100)
    rationale: str
    skills_to_develop: list[str]
    career_path_alignment: str


class RoleRecommendationsResult(BaseModel):
    summary: str
    recommendations: list[RoleRecommendationItem]


def compute_role_fit_scores(
    ranked_skills: list,
    roles: list[OpenRoleOut],
    target_shape: TargetShape,
) -> list[RoleFitScore]:
    """Heuristic: roles that develop high-gap skills and match target shape score higher."""
    by_name = {s["sub_skill"].lower(): s for s in ranked_skills}
    scored: list[RoleFitScore] = []

    for role in roles:
        shape_bonus = 15.0 if role.target_shape == target_shape else 0.0
        gap_sum = 0.0
        matches: list[dict] = []
        develop_count = 0

        for req in role.skill_requirements:
            if req.develops_skill != "develop":
                continue
            sk = by_name.get(req.sub_skill.lower())
            if not sk:
                continue
            develop_count += 1
            gap_sum += sk["skill_gap"]
            matches.append(
                {
                    "sub_skill": req.sub_skill,
                    "current_gap": sk["skill_gap"],
                    "min_rating_required": req.min_skill_rating,
                }
            )

        avg_gap = gap_sum / develop_count if develop_count else 0.0
        total = round(avg_gap * 12 + shape_bonus + develop_count * 3, 1)

        scored.append(
            RoleFitScore(
                role_id=role.id,
                title=role.title,
                deterministic_fit_score=total,
                matching_develop_skills=matches,
            )
        )

    scored.sort(key=lambda x: x.deterministic_fit_score, reverse=True)
    return scored


RECOMMENDATION_PROMPT = """You are an internal talent advisor matching employees to open roles.

Given:
- Employee gap analysis and career path context (current matrix → target T/N/M shape)
- Deterministic fit scores for each open role (higher = more skill-gap development opportunity)
- Full open roles catalog with job descriptions and skill requirements

Select **1 to 3 open roles** that best help the employee:
1. Close their **largest skill gaps** through on-the-job development
2. Progress on their **recommended career path** toward the target shape
3. Are realistic next steps (not a huge leap unless data strongly supports it)

Return JSON only with this schema:
{
  "summary": "2-3 sentence overview for the employee",
  "recommendations": [
    {
      "role_id": <int from catalog>,
      "title": "<role title>",
      "fit_score": <0-100 integer>,
      "rationale": "<why this role helps>",
      "skills_to_develop": ["<sub-skill names>"],
      "career_path_alignment": "<how this advances T/N/M goal>"
    }
  ]
}

Rules:
- Only recommend role_ids that exist in the open roles catalog.
- Recommend at least 1 and at most 3 roles.
- Prioritize roles whose develops_skill requirements overlap top skill gaps.
- Reference job description elements in rationale.
"""


def synthesize_role_recommendations(
    employee_context: dict,
    roles: list[OpenRoleOut],
    fit_scores: list[RoleFitScore],
) -> RoleRecommendationsResult:
    roles_payload = [r.model_dump() for r in roles]
    payload = {
        "employee_context": employee_context,
        "deterministic_fit_scores": [f.model_dump() for f in fit_scores],
        "open_roles": roles_payload,
    }

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": RECOMMENDATION_PROMPT},
            {
                "role": "user",
                "content": json.dumps(payload, indent=2),
            },
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")
    return RoleRecommendationsResult(**raw)


def run_role_recommendations(
    employee_name: str,
    skills: list[SkillInput],
    target_shape: TargetShape,
    career_horizon: CareerHorizon = "medium",
) -> dict:
    """Match employee to open roles using gaps, career path, and agent reasoning."""
    seed_open_roles()

    gap_result = calculate_skill_gap(employee_name, skills)

    session = get_session()
    try:
        taxonomy = list_taxonomy(session)
        open_roles = list_open_roles(session)
    finally:
        session.close()

    matrix_context = build_training_context(gap_result, target_shape, taxonomy)
    trajectory = build_skill_trajectory(gap_result.ranked_skills)

    department: str | None = None
    role_title: str | None = None
    hr = extract_hr_skills(employee_name)
    if not isinstance(hr, str):
        department = hr.department
        role_title = hr.role

    career_context = build_career_context(
        gap_result,
        matrix_context,
        target_shape,
        career_horizon,
        department=department,
        role=role_title,
    )

    ranked_dicts = [s.model_dump() for s in gap_result.ranked_skills]
    fit_scores = compute_role_fit_scores(ranked_dicts, open_roles, target_shape)

    employee_context = {
        "employee_name": employee_name,
        "current_role": role_title,
        "department": department,
        "gap_analysis": gap_result.model_dump(),
        "career_path_context": career_context.model_dump(),
        "skill_trajectory_sample": trajectory[:5],
    }

    agent_result = synthesize_role_recommendations(
        employee_context, open_roles, fit_scores
    )

    recommended_ids = {r.role_id for r in agent_result.recommendations}

    return {
        "summary": agent_result.summary,
        "recommendations": [r.model_dump() for r in agent_result.recommendations],
        "fit_scores": [f.model_dump() for f in fit_scores],
        "open_roles": [r.model_dump() for r in open_roles],
        "recommended_role_ids": list(recommended_ids),
        "gap_analysis": gap_result.model_dump(),
    }
