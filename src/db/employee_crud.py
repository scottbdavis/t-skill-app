"""CRUD helpers for employees in SQLite."""

from pydantic import BaseModel, Field

from src.db.models import Employee, EmployeeSkill


class EmployeeSummary(BaseModel):
    id: int
    name: str
    department: str
    role: str


class EmployeeSkillRatingIn(BaseModel):
    sub_skill_id: int
    skill_rating: int = Field(ge=1, le=5)
    value_to_sponsor: int = Field(ge=1, le=5)
    value_to_mitre: int = Field(ge=1, le=5, default=3)


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    department: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    skills: list[EmployeeSkillRatingIn] = Field(default_factory=list)


def list_employees(session) -> list[EmployeeSummary]:
    """Return all employees ordered by name."""
    rows = session.query(Employee).order_by(Employee.name).all()
    return [
        EmployeeSummary(
            id=emp.id,
            name=emp.name,
            department=emp.department,
            role=emp.role,
        )
        for emp in rows
    ]


def create_employee(session, body: EmployeeCreate) -> EmployeeSummary:
    """Create a new employee and optional initial skill ratings."""
    name = body.name.strip()
    department = body.department.strip()
    role = body.role.strip()

    existing = (
        session.query(Employee).filter(Employee.name.ilike(name)).first()
    )
    if existing:
        raise ValueError(f"An employee named '{name}' already exists.")

    emp = Employee(name=name, department=department, role=role)
    session.add(emp)
    session.flush()

    for skill in body.skills:
        total_score = skill.skill_rating * skill.value_to_sponsor
        session.add(
            EmployeeSkill(
                employee_id=emp.id,
                sub_skill_id=skill.sub_skill_id,
                skill_rating=skill.skill_rating,
                value_to_sponsor=skill.value_to_sponsor,
                value_to_mitre=skill.value_to_mitre,
                total_score=total_score,
            )
        )

    session.commit()
    session.refresh(emp)
    return EmployeeSummary(
        id=emp.id,
        name=emp.name,
        department=emp.department,
        role=emp.role,
    )
