"""Seed synthetic open roles and skill requirements (idempotent)."""

from src.db.database import engine, get_session
from src.db.models import Base, OpenRole, RoleSkillRequirement, SubSkill

# (title, department, level, target_shape, primary_categories, career_stage, description, skills)
# skills: list of (sub_skill_name, min_rating, "develop"|"required")
OPEN_ROLES_DATA: list[tuple] = [
    (
        "AI Engineering Specialist",
        "Data Science",
        "Senior IC",
        "T",
        "Data Science",
        "specialist",
        (
            "Lead delivery of production AI features on a single product line. "
            "Deepen Python/PyTorch and AI-Engineering practices while partnering "
            "with sponsors on roadmap prioritization."
        ),
        [
            ("Python/PyTorch", 3, "develop"),
            ("AI-Engineering", 3, "develop"),
            ("AI-ML/Ops", 2, "develop"),
        ],
    ),
    (
        "Principal AI Engineer",
        "Data Science",
        "Principal",
        "T",
        "Data Science",
        "specialist",
        (
            "Set technical direction for enterprise AI platforms. Mentor ICs, "
            "own architecture for model lifecycle, and close critical skill gaps "
            "in AI-Engineering and MLOps."
        ),
        [
            ("AI-Engineering", 4, "required"),
            ("AI-ML/Ops", 4, "develop"),
            ("Python/PyTorch", 4, "required"),
        ],
    ),
    (
        "Cloud ML Platform Architect",
        "Cloud Technology",
        "Lead",
        "T",
        "Cloud Technology",
        "specialist",
        (
            "Design and govern cloud-native ML platforms. Focus on Cloud ML Services "
            "and Cloud AI Services integration with enterprise security standards."
        ),
        [
            ("Cloud ML Services", 3, "develop"),
            ("Cloud AI Services", 3, "develop"),
            ("Cloud DevSecOps", 3, "develop"),
        ],
    ),
    (
        "FinOps & Cloud Cost Strategist",
        "Finance Technology",
        "Senior IC",
        "T",
        "FinOps",
        "specialist",
        (
            "Optimize cloud spend for AI workloads. Build FinOps models, partner "
            "with engineering on unit economics, and grow AI for FinOps capability."
        ),
        [
            ("FinOps for Cloud AI", 3, "develop"),
            ("AI for FinOps", 3, "develop"),
            ("FinOps & TBM", 3, "required"),
        ],
    ),
    (
        "Senior Scrum Master — Digital Products",
        "Agile Center of Excellence",
        "Senior IC",
        "T",
        "Agile/PM/Business",
        "specialist",
        (
            "Facilitate agile delivery for a single portfolio. Coach teams on SAFe "
            "and Scrum practices; grow toward release train engineer responsibilities."
        ),
        [
            ("Scrum Master/PMP", 4, "develop"),
            ("SAFe", 3, "develop"),
            ("Scrum Trainer", 2, "develop"),
        ],
    ),
    (
        "Site Reliability Lead",
        "Platform Engineering",
        "Lead",
        "T",
        "Site Reliability Eng (SRE)",
        "specialist",
        (
            "Own reliability for mission-critical services. Lead incident response, "
            "monitoring strategy, and infrastructure-as-code standards."
        ),
        [
            ("Incident Mgmt", 4, "develop"),
            ("Monitoring", 4, "develop"),
            ("Infra as Code", 3, "develop"),
        ],
    ),
    (
        "Enterprise & Cloud Architect",
        "IT Architecture",
        "Lead",
        "N",
        "IT Architecture,Cloud Technology",
        "dual-lead",
        (
            "Span enterprise and cloud architecture for a business unit. Balance "
            "depth across Infrastructure Arch and Cloud Architecture while "
            "maintaining enterprise standards."
        ),
        [
            ("Enterprise Arch", 3, "develop"),
            ("Cloud Architecture", 3, "develop"),
            ("Infrastructure Arch", 3, "develop"),
        ],
    ),
    (
        "Agile–Cloud Program Lead",
        "Digital Transformation",
        "Manager",
        "N",
        "Agile/PM/Business,Cloud Technology",
        "dual-lead",
        (
            "Lead cross-functional programs combining cloud migration and agile "
            "transformation. Develop dual expertise in SAFe delivery and Cloud DevSecOps."
        ),
        [
            ("SAFe", 3, "develop"),
            ("Cloud DevSecOps", 3, "develop"),
            ("Scrum Master/PMP", 3, "required"),
        ],
    ),
    (
        "DevSecOps & SRE Platform Lead",
        "Platform Engineering",
        "Lead",
        "N",
        "Cloud Technology,Site Reliability Eng (SRE)",
        "dual-lead",
        (
            "Build secure CI/CD and reliability platforms. Pair cloud automation "
            "with SRE practices for hybrid enterprise environments."
        ),
        [
            ("Cloud DevSecOps", 4, "develop"),
            ("Infra as Code", 4, "develop"),
            ("Monitoring", 3, "develop"),
        ],
    ),
    (
        "Data & Cloud Portfolio Manager",
        "Technology Portfolio Office",
        "Manager",
        "M",
        "Data Science,Cloud Technology,Agile/PM/Business",
        "executive",
        (
            "Manage a balanced portfolio across data, cloud, and delivery pillars. "
            "Raise breadth of skills across teams; ideal for leaders building M-shape breadth."
        ),
        [
            ("AI-Engineering", 2, "develop"),
            ("Cloud ML Services", 2, "develop"),
            ("SAFe", 3, "develop"),
            ("Scrum Master/PMP", 3, "required"),
        ],
    ),
    (
        "Transformation & Continuous Improvement Director",
        "Operations Excellence",
        "Director",
        "M",
        "Lean Six Sigma/VSM,Agile/PM/Business,IT Architecture",
        "executive",
        (
            "Drive enterprise transformation using Lean, agile, and architecture "
            "disciplines. Balance multiple pillars for executive M-shape progression."
        ),
        [
            ("VSM Facilitator", 3, "develop"),
            ("Lean Leader", 3, "develop"),
            ("Enterprise Arch", 2, "develop"),
            ("SAFe", 3, "required"),
        ],
    ),
    (
        "Lean Six Sigma Master Black Belt",
        "Operations Excellence",
        "Principal",
        "T",
        "Lean Six Sigma/VSM",
        "specialist",
        (
            "Lead enterprise value-stream improvement programs. Train belts, "
            "facilitate VSM workshops, and mentor lean leaders."
        ),
        [
            ("Master Blackbelt", 3, "develop"),
            ("VSM Facilitator", 4, "develop"),
            ("Lean Leader", 4, "required"),
        ],
    ),
    (
        "Junior Cloud AI Engineer",
        "Cloud Technology",
        "IC",
        "T",
        "Cloud Technology",
        "entry",
        (
            "Entry-level role to grow cloud AI skills on a guided team. Closes "
            "large skill gaps through structured mentorship and lab work."
        ),
        [
            ("Cloud AI Services", 2, "develop"),
            ("Cloud ML Services", 2, "develop"),
            ("Python/PyTorch", 2, "develop"),
        ],
    ),
]


def seed_open_roles() -> None:
    """Insert synthetic open roles if none exist."""
    Base.metadata.create_all(engine)

    session = get_session()
    try:
        if session.query(OpenRole).count() > 0:
            count = session.query(OpenRole).count()
            print(f"Open roles already seeded ({count} roles). Skipping.")
            return

        sub_skills = {s.name: s.id for s in session.query(SubSkill).all()}
        missing = set()
        for row in OPEN_ROLES_DATA:
            for skill_name, _, _ in row[7]:
                if skill_name not in sub_skills:
                    missing.add(skill_name)
        if missing:
            print(f"Warning: sub-skills not in taxonomy, skipping them: {missing}")

        for (
            title,
            department,
            level,
            target_shape,
            primary_categories,
            career_stage,
            description,
            skills,
        ) in OPEN_ROLES_DATA:
            role = OpenRole(
                title=title,
                department=department,
                level=level,
                job_description=description,
                target_shape=target_shape,
                primary_categories=primary_categories,
                career_stage=career_stage,
                status="open",
            )
            session.add(role)
            session.flush()

            for skill_name, min_rating, req_type in skills:
                sub_id = sub_skills.get(skill_name)
                if sub_id is None:
                    continue
                session.add(
                    RoleSkillRequirement(
                        role_id=role.id,
                        sub_skill_id=sub_id,
                        min_skill_rating=min_rating,
                        develops_skill=req_type,
                    )
                )

        session.commit()
        print(f"Seeded {len(OPEN_ROLES_DATA)} open roles with skill requirements.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    from src.db.seed import seed_database

    seed_database()
    seed_open_roles()
