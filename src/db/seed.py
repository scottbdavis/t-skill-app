"""Seed the database with the 7 T-Skill categories and their sub-skills."""

from sqlalchemy import inspect, text

from src.db.database import engine, get_session
from src.db.models import Base, SkillCategory, SubSkill

SKILL_TAXONOMY: dict[str, list[str]] = {
    "Data Science": [
        "AI-Engineering",
        "AI-ML/Ops",
        "Python/PyTorch",
    ],
    "Cloud Technology": [
        "Cloud AI Services",
        "Cloud DevSecOps",
        "Cloud ML Services",
    ],
    "FinOps": [
        "AI for FinOps",
        "FinOps for Cloud AI",
        "FinOps & TBM",
    ],
    "Agile/PM/Business": [
        "Scrum Master/PMP",
        "SAFe",
        "Scrum Trainer",
    ],
    "Site Reliability Eng (SRE)": [
        "Incident Mgmt",
        "Monitoring",
        "Infra as Code",
    ],
    "IT Architecture": [
        "Infrastructure Arch",
        "Enterprise Arch",
        "Cloud Architecture",
    ],
    "Lean Six Sigma/VSM": [
        "Master Blackbelt",
        "VSM Facilitator",
        "Lean Leader",
    ],
}


def migrate_schema() -> None:
    """Apply lightweight schema updates for existing SQLite databases."""
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    if "employee_skills" in table_names:
        columns = {col["name"] for col in inspector.get_columns("employee_skills")}
        if "value_to_mitre" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE employee_skills "
                        "ADD COLUMN value_to_mitre INTEGER NOT NULL DEFAULT 3"
                    )
                )

    if "skill_categories" in table_names:
        columns = {col["name"] for col in inspector.get_columns("skill_categories")}
        if "sort_order" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE skill_categories "
                        "ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
                    )
                )
                conn.execute(
                    text("UPDATE skill_categories SET sort_order = id")
                )


def seed_database() -> None:
    """Create tables and insert seed data (idempotent)."""
    migrate_schema()

    session = get_session()
    try:
        existing = session.query(SkillCategory).count()
        if existing > 0:
            print(f"Database already seeded ({existing} categories). Skipping.")
            return

        for index, (category_name, sub_skill_names) in enumerate(SKILL_TAXONOMY.items()):
            category = SkillCategory(name=category_name, sort_order=index)
            session.add(category)
            session.flush()

            for skill_name in sub_skill_names:
                session.add(SubSkill(category_id=category.id, name=skill_name))

        session.commit()
        total_skills = session.query(SubSkill).count()
        print(f"Seeded {len(SKILL_TAXONOMY)} categories and {total_skills} sub-skills.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
