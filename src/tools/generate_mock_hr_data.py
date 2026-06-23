"""MCP tool: generate_mock_hr_data

Uses OpenAI to generate synthetic, structured employee profiles
when live HR systems are unavailable.
"""

import json
import os

from openai import OpenAI
from pydantic import BaseModel, Field

from src.db.database import get_session
from src.db.models import Employee, EmployeeSkill, SubSkill
from src.db.seed import SKILL_TAXONOMY


class MockSkillEntry(BaseModel):
    sub_skill: str
    skill_rating: int = Field(ge=1, le=5)
    value_to_sponsor: int = Field(ge=1, le=5)
    value_to_mitre: int = Field(default=3, ge=1, le=5)


class MockEmployeeProfile(BaseModel):
    name: str
    department: str
    role: str
    skills: list[MockSkillEntry]


class MockDataResult(BaseModel):
    employees_created: int
    profiles: list[MockEmployeeProfile]


SYSTEM_PROMPT = """You are an HR data generator. Create realistic synthetic employee profiles for a tech organization.

Each employee must have skills drawn ONLY from this taxonomy:
{taxonomy}

For each employee, select 5-10 sub-skills from the taxonomy and assign:
- skill_rating: 1-5 (1=novice, 5=expert)
- value_to_sponsor: 1-5 (1=low strategic value, 5=critical to sponsor goals)
- value_to_mitre: 1-5 (1=low enterprise value, 5=critical to MITRE goals)

Make the profiles realistic: junior employees should have lower ratings,
senior employees should have deeper expertise in fewer areas.
Vary departments across: Engineering, Cloud Operations, IT Architecture,
Program Management, Data Science, DevOps, Finance Technology."""


def _build_taxonomy_string() -> str:
    lines = []
    for cat, subs in SKILL_TAXONOMY.items():
        lines.append(f"  {cat}: {', '.join(subs)}")
    return "\n".join(lines)


def _persist_profiles(profiles: list[MockEmployeeProfile]) -> None:
    """Save generated profiles into SQLite."""
    session = get_session()
    try:
        sub_skill_map: dict[str, int] = {}
        for ss in session.query(SubSkill).all():
            sub_skill_map[ss.name.lower()] = ss.id

        for profile in profiles:
            emp = Employee(
                name=profile.name,
                department=profile.department,
                role=profile.role,
            )
            session.add(emp)
            session.flush()

            for skill in profile.skills:
                ss_id = sub_skill_map.get(skill.sub_skill.lower())
                if ss_id is None:
                    continue
                session.add(EmployeeSkill(
                    employee_id=emp.id,
                    sub_skill_id=ss_id,
                    skill_rating=skill.skill_rating,
                    value_to_sponsor=skill.value_to_sponsor,
                    value_to_mitre=skill.value_to_mitre,
                    total_score=skill.skill_rating * skill.value_to_sponsor,
                ))

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def generate_mock_hr_data(
    num_employees: int = 3,
) -> MockDataResult:
    """Generate synthetic employee profiles using OpenAI and store them in the database.

    Args:
        num_employees: Number of mock employees to generate (1-10).

    Returns:
        Summary of created profiles with their skill assignments.
    """
    num_employees = max(1, min(num_employees, 10))

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    taxonomy_str = _build_taxonomy_string()

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.8,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(taxonomy=taxonomy_str)},
            {
                "role": "user",
                "content": (
                    f"Generate exactly {num_employees} unique employee profiles. "
                    "Return a JSON object with key 'employees' containing an array of objects, "
                    "each with keys: name, department, role, skills (array of "
                    "{sub_skill, skill_rating, value_to_sponsor, value_to_mitre})."
                ),
            },
        ],
    )

    raw = json.loads(response.choices[0].message.content)
    employees_raw = raw.get("employees", [])

    profiles: list[MockEmployeeProfile] = []
    for emp in employees_raw:
        profiles.append(MockEmployeeProfile(**emp))

    _persist_profiles(profiles)

    return MockDataResult(
        employees_created=len(profiles),
        profiles=profiles,
    )
