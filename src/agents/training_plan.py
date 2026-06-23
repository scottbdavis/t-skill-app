"""Training plan agent pipeline.

Builds a gap-aware, shape-targeted development plan using deterministic gap
analysis, category grouping, learning-resource retrieval, and LLM synthesis.
"""

from __future__ import annotations

import json
import os
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field

from src.db.database import get_session
from src.db.taxonomy_crud import list_taxonomy
from src.tools.calculate_skill_gap import (
    SkillGapResult,
    SkillInput,
    SkillScore,
    calculate_skill_gap,
)
from src.tools.query_learning_resources import (
    LearningResourcesResult,
    query_learning_resources,
)

TargetShape = Literal["T", "N", "M"]

SHAPE_EMPHASIS: dict[TargetShape, str] = {
    "T": (
        "Target: Core T-Shape — one deep vertical pillar. After closing the "
        "largest skill gap, prioritize sub-skills under a single primary "
        "category (the strongest pillar). Keep other primary categories at "
        "maintenance level with only high-gap sub-skills addressed."
    ),
    "N": (
        "Target: N-Shape — two deep vertical pillars. After the largest gap, "
        "balance development across two primary categories: deepen sub-skills "
        "in both pillars until product scores (rating × value) support two "
        "strong pillars, while maintaining lighter touch on the rest."
    ),
    "M": (
        "Target: M-Shape — balanced breadth across primary skills. After the "
        "largest gap, raise the weakest primary categories so average skill "
        "gaps and ratings are balanced across all pillars; avoid over-focusing "
        "on a single category unless it has the only critical gaps."
    ),
}


class TrainingPlanContext(BaseModel):
    employee_name: str
    target_shape: TargetShape
    current_shape: str
    shape_description: str
    highest_skill_gap: int
    highest_skill_gap_sub_skill: str
    top_development_focus: list[str]
    category_gap_summary: list[dict]
    category_skill_groups: list[dict]
    ranked_skills: list[dict]
    recommended_pillar_categories: list[str]


def _sub_skill_to_category(taxonomy: list[dict]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for cat in taxonomy:
        for sub in cat["sub_skills"]:
            mapping[sub["name"].lower()] = cat["name"]
    return mapping


def _group_by_category(
    ranked_skills: list[SkillScore], taxonomy: list[dict]
) -> list[dict]:
    sub_to_cat = _sub_skill_to_category(taxonomy)
    groups: dict[str, list[dict]] = {}
    for skill in ranked_skills:
        cat = sub_to_cat.get(skill.sub_skill.lower(), "Other")
        groups.setdefault(cat, []).append(skill.model_dump())
    return [
        {"category": name, "skills": skills}
        for name, skills in sorted(groups.items(), key=lambda x: x[0])
    ]


def _category_gap_summary(category_groups: list[dict]) -> list[dict]:
    summaries: list[dict] = []
    for group in category_groups:
        skills = group["skills"]
        if not skills:
            continue
        avg_gap = sum(s["skill_gap"] for s in skills) / len(skills)
        summaries.append(
            {
                "category": group["category"],
                "avg_skill_gap": round(avg_gap, 2),
                "max_skill_gap": max(s["skill_gap"] for s in skills),
                "avg_skill_rating": round(
                    sum(s["skill_rating"] for s in skills) / len(skills), 2
                ),
                "sub_skill_count": len(skills),
            }
        )
    summaries.sort(key=lambda x: x["max_skill_gap"], reverse=True)
    return summaries


def _recommend_pillars(
    target_shape: TargetShape, category_summary: list[dict]
) -> list[str]:
    """Pick primary categories to emphasize for the target shape."""
    by_strength = sorted(
        category_summary,
        key=lambda c: (c["avg_skill_rating"], -c["avg_skill_gap"]),
        reverse=True,
    )
    by_weakness = sorted(category_summary, key=lambda c: c["avg_skill_gap"], reverse=True)

    if target_shape == "T":
        return [by_strength[0]["category"]] if by_strength else []
    if target_shape == "N":
        pillars = [c["category"] for c in by_strength[:2]]
        if len(pillars) < 2 and by_weakness:
            for c in by_weakness:
                if c["category"] not in pillars:
                    pillars.append(c["category"])
                if len(pillars) >= 2:
                    break
        return pillars[:2]
    # M: all categories matter; order weakest first for balancing
    return [c["category"] for c in by_weakness]


def build_training_context(
    gap_result: SkillGapResult,
    target_shape: TargetShape,
    taxonomy: list[dict],
) -> TrainingPlanContext:
    category_groups = _group_by_category(gap_result.ranked_skills, taxonomy)
    summary = _category_gap_summary(category_groups)
    pillars = _recommend_pillars(target_shape, summary)

    return TrainingPlanContext(
        employee_name=gap_result.employee_name,
        target_shape=target_shape,
        current_shape=gap_result.current_shape,
        shape_description=gap_result.shape_description,
        highest_skill_gap=gap_result.highest_skill_gap,
        highest_skill_gap_sub_skill=gap_result.highest_skill_gap_sub_skill,
        top_development_focus=gap_result.top_development_focus,
        category_gap_summary=summary,
        category_skill_groups=category_groups,
        ranked_skills=[s.model_dump() for s in gap_result.ranked_skills],
        recommended_pillar_categories=pillars,
    )


SYNTHESIS_PROMPT = """You are a professional development advisor creating a phased training plan.

Rules you MUST follow:
1. **Start with the largest skill gap** — the first concrete actions must target
   the sub-skill with the highest weighted gap (2× sponsor gap + MITRE gap).
2. **Honor the target shape emphasis** provided in the context (T, N, or M).
3. Use skill_gap (not total_score) for prioritization unless explaining T/N/M pillars.
4. Structure the plan in clear phases with timelines (e.g. 0–30, 30–90, 90+ days).
5. Reference specific sub-skills and primary categories from the data.
6. Include learning resources from the retrieval data when relevant.

Output markdown with these sections:

## Training Plan Overview
Employee, current shape, target shape emphasis, and strategic goal.

## Phase 1: Close the Largest Gap (Immediate)
Actions for the highest-gap sub-skill only.

## Phase 2: Sub-Skill Development (Shape-Aligned)
How to improve sub-skills under the recommended pillar categories to reach the
target T, N, or M balance. For T: one pillar deep. For N: two pillars. For M:
balanced improvement across primaries.

## Phase 3: Primary Skill Balance
Broad-category actions (certifications, projects, mentorship) tied to categories.

## Phase 4: Recommended Learning Resources
Bullet list from retrieved resources (internal vs external if labeled).

## Success Metrics
Measurable checkpoints (rating targets, gap reduction, shape progression).
"""


def synthesize_training_plan(
    context: TrainingPlanContext,
    learning_resources: LearningResourcesResult,
) -> str:
    emphasis = SHAPE_EMPHASIS[context.target_shape]
    user_content = (
        f"Target shape emphasis:\n{emphasis}\n\n"
        f"Analysis context:\n```json\n{json.dumps(context.model_dump(), indent=2)}\n```\n\n"
        f"Learning resources:\n```json\n"
        f"{json.dumps(learning_resources.model_dump(), indent=2)}\n```"
    )

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.35,
        messages=[
            {"role": "system", "content": SYNTHESIS_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )
    return response.choices[0].message.content or ""


def run_training_plan(
    employee_name: str,
    skills: list[SkillInput],
    target_shape: TargetShape,
) -> dict[str, str | dict]:
    """Run gap analysis, retrieval, and synthesis for a shape-targeted training plan."""
    gap_result = calculate_skill_gap(employee_name, skills)

    session = get_session()
    try:
        taxonomy = list_taxonomy(session)
    finally:
        session.close()

    context = build_training_context(gap_result, target_shape, taxonomy)

    top_gaps = [s.sub_skill for s in gap_result.ranked_skills[:5]]
    resources = query_learning_resources(skill_gaps=top_gaps, top_k=5)

    plan_markdown = synthesize_training_plan(context, resources)

    return {
        "plan": plan_markdown,
        "gap_analysis": gap_result.model_dump(),
        "context": context.model_dump(),
    }
