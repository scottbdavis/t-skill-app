"""Read helpers for open roles."""

from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from src.db.models import OpenRole, RoleSkillRequirement, SubSkill


class RoleSkillRequirementOut(BaseModel):
    sub_skill: str
    category: str
    min_skill_rating: int
    develops_skill: str


class OpenRoleOut(BaseModel):
    id: int
    title: str
    department: str
    level: str
    job_description: str
    target_shape: str
    primary_categories: str
    career_stage: str
    status: str
    skill_requirements: list[RoleSkillRequirementOut]


def list_open_roles(session: Session, *, status: str = "open") -> list[OpenRoleOut]:
    query = (
        session.query(OpenRole)
        .options(
            joinedload(OpenRole.skill_requirements)
            .joinedload(RoleSkillRequirement.sub_skill)
            .joinedload(SubSkill.category)
        )
        .order_by(OpenRole.id)
    )
    if status:
        query = query.filter(OpenRole.status == status)

    roles: list[OpenRoleOut] = []
    for role in query.all():
        reqs: list[RoleSkillRequirementOut] = []
        for req in role.skill_requirements:
            sub = req.sub_skill
            cat_name = sub.category.name if sub and sub.category else "Unknown"
            reqs.append(
                RoleSkillRequirementOut(
                    sub_skill=sub.name if sub else "Unknown",
                    category=cat_name,
                    min_skill_rating=req.min_skill_rating,
                    develops_skill=req.develops_skill,
                )
            )
        roles.append(
            OpenRoleOut(
                id=role.id,
                title=role.title,
                department=role.department,
                level=role.level,
                job_description=role.job_description,
                target_shape=role.target_shape,
                primary_categories=role.primary_categories,
                career_stage=role.career_stage,
                status=role.status,
                skill_requirements=reqs,
            )
        )
    return roles
