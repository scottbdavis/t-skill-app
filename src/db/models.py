from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    progression = relationship("SkillProgression", back_populates="employee", cascade="all, delete-orphan")


class SkillCategory(Base):
    __tablename__ = "skill_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    sub_skills = relationship("SubSkill", back_populates="category", cascade="all, delete-orphan")


class SubSkill(Base):
    __tablename__ = "sub_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("skill_categories.id"), nullable=False)
    name = Column(String, nullable=False)

    category = relationship("SkillCategory", back_populates="sub_skills")
    employee_skills = relationship("EmployeeSkill", back_populates="sub_skill", cascade="all, delete-orphan")


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    sub_skill_id = Column(Integer, ForeignKey("sub_skills.id"), nullable=False)
    skill_rating = Column(Integer, nullable=False)
    value_to_sponsor = Column(Integer, nullable=False)
    value_to_mitre = Column(Integer, nullable=False, default=3)
    total_score = Column(Float, nullable=False)

    employee = relationship("Employee", back_populates="skills")
    sub_skill = relationship("SubSkill", back_populates="employee_skills")


class SkillProgression(Base):
    """Tracks an employee's T-shape maturity over time."""
    __tablename__ = "skill_progression"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    current_shape = Column(String, nullable=False)  # T, N, or M
    deep_pillars = Column(String, nullable=True)  # comma-separated category names
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="progression")


class OpenRole(Base):
    """Synthetic open position for internal mobility / development."""

    __tablename__ = "open_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    level = Column(String, nullable=False)  # e.g. IC, Senior, Lead, Principal
    job_description = Column(Text, nullable=False)
    target_shape = Column(String, nullable=False)  # T, N, or M
    primary_categories = Column(String, nullable=False)  # comma-separated pillar names
    career_stage = Column(String, nullable=False)  # e.g. specialist, dual-lead, executive
    status = Column(String, nullable=False, default="open")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    skill_requirements = relationship(
        "RoleSkillRequirement",
        back_populates="role",
        cascade="all, delete-orphan",
    )


class RoleSkillRequirement(Base):
    """Sub-skills a role helps develop or requires."""

    __tablename__ = "role_skill_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("open_roles.id"), nullable=False)
    sub_skill_id = Column(Integer, ForeignKey("sub_skills.id"), nullable=False)
    min_skill_rating = Column(Integer, nullable=False, default=3)
    develops_skill = Column(
        String, nullable=False, default="yes"
    )  # yes = growth opportunity; required = must already meet min

    role = relationship("OpenRole", back_populates="skill_requirements")
    sub_skill = relationship("SubSkill")
