"""CRUD helpers for skill categories and sub-skills."""

from sqlalchemy import func
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from src.db.models import SkillCategory, SubSkill


def _category_out(cat: SkillCategory) -> dict:
    return {
        "id": cat.id,
        "name": cat.name,
        "sub_skills": [{"id": ss.id, "name": ss.name} for ss in cat.sub_skills],
    }


def list_taxonomy(session: Session) -> list[dict]:
    categories = (
        session.query(SkillCategory)
        .options(joinedload(SkillCategory.sub_skills))
        .order_by(SkillCategory.sort_order, SkillCategory.id)
        .all()
    )
    return [_category_out(c) for c in categories]


def reorder_categories(session: Session, category_ids: list[int]) -> list[dict]:
    """Persist display order for primary skill categories."""
    if not category_ids:
        raise HTTPException(status_code=400, detail="category_ids cannot be empty.")

    categories = session.query(SkillCategory).all()
    known_ids = {cat.id for cat in categories}
    if set(category_ids) != known_ids:
        raise HTTPException(
            status_code=400,
            detail="category_ids must include every category exactly once.",
        )

    id_to_cat = {cat.id: cat for cat in categories}
    for index, category_id in enumerate(category_ids):
        id_to_cat[category_id].sort_order = index

    session.commit()
    return list_taxonomy(session)


def create_category(session: Session, name: str) -> dict:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required.")
    existing = session.query(SkillCategory).filter(SkillCategory.name == name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Category '{name}' already exists.")
    max_order = session.query(func.max(SkillCategory.sort_order)).scalar()
    next_order = (max_order or -1) + 1
    cat = SkillCategory(name=name, sort_order=next_order)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return _category_out(cat)


def delete_category(session: Session, category_id: int) -> None:
    cat = session.get(SkillCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    session.delete(cat)
    session.commit()


def create_sub_skill(session: Session, category_id: int, name: str) -> dict:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Sub-skill name is required.")
    cat = session.get(SkillCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    duplicate = (
        session.query(SubSkill)
        .filter(SubSkill.category_id == category_id, SubSkill.name == name)
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Sub-skill '{name}' already exists in this category.",
        )
    sub = SubSkill(category_id=category_id, name=name)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return {"id": sub.id, "name": sub.name}


def delete_sub_skill(session: Session, sub_skill_id: int) -> None:
    sub = session.get(SubSkill, sub_skill_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-skill not found.")
    session.delete(sub)
    session.commit()
