"""MCP tool: extract_hr_skills

Queries the SQLite database for an employee's existing skill tags and ratings.
"""

from pydantic import BaseModel
from sqlalchemy.orm import joinedload

from src.db.database import get_session
from src.db.models import Employee, EmployeeSkill


class EmployeeSkillRecord(BaseModel):
    category: str
    sub_skill: str
    skill_rating: int
    value_to_sponsor: int
    value_to_mitre: int
    total_score: float


class HRSkillsResult(BaseModel):
    employee_name: str
    department: str
    role: str
    skills: list[EmployeeSkillRecord]


def extract_hr_skills(employee_name: str) -> HRSkillsResult | str:
    """Look up an employee by name and return their skill profile.

    Args:
        employee_name: Full name of the employee to look up.

    Returns:
        Structured skill profile or an error message if not found.
    """
    session = get_session()
    try:
        employee = (
            session.query(Employee)
            .options(
                joinedload(Employee.skills)
                .joinedload(EmployeeSkill.sub_skill)
            )
            .filter(Employee.name.ilike(f"%{employee_name}%"))
            .first()
        )

        if not employee:
            return f"No employee found matching '{employee_name}'."

        skill_records = []
        for es in employee.skills:
            skill_records.append(
                EmployeeSkillRecord(
                    category=es.sub_skill.category.name if es.sub_skill.category else "Unknown",
                    sub_skill=es.sub_skill.name,
                    skill_rating=es.skill_rating,
                    value_to_sponsor=es.value_to_sponsor,
                    value_to_mitre=es.value_to_mitre,
                    total_score=es.total_score,
                )
            )

        return HRSkillsResult(
            employee_name=employee.name,
            department=employee.department,
            role=employee.role,
            skills=skill_records,
        )
    finally:
        session.close()
