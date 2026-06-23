"""FastAPI REST API for the T-Skill web frontend."""

import truststore

truststore.inject_into_ssl()

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

import os  # noqa: E402

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from typing import Literal  # noqa: E402

from pydantic import BaseModel, Field  # noqa: E402

from src.agents.orchestrator import run_pipeline  # noqa: E402
from src.agents.career_path import run_career_path  # noqa: E402
from src.agents.role_recommendation import run_role_recommendations  # noqa: E402
from src.agents.training_plan import run_training_plan  # noqa: E402
from src.db.roles_crud import OpenRoleOut, list_open_roles  # noqa: E402
from src.db.seed_roles import seed_open_roles  # noqa: E402
from src.db.database import get_session  # noqa: E402
from src.db.seed import seed_database  # noqa: E402
from src.db.employee_crud import (  # noqa: E402
    EmployeeCreate,
    EmployeeSummary,
    create_employee,
    list_employees,
)
from src.db.taxonomy_crud import (  # noqa: E402
    create_category,
    create_sub_skill,
    delete_category,
    delete_sub_skill,
    list_taxonomy,
    reorder_categories,
)
from src.tools.calculate_skill_gap import (  # noqa: E402
    SkillGapResult,
    SkillInput,
    calculate_skill_gap,
)
from src.tools.extract_hr_skills import extract_hr_skills  # noqa: E402
from src.tools.generate_mock_hr_data import generate_mock_hr_data  # noqa: E402
from src.tools.query_learning_resources import (  # noqa: E402
    LearningResourcesResult,
    ingest_learning_resources,
    query_learning_resources,
)

app = FastAPI(
    title="T-Skill API",
    description="REST API for T-shaped skill evaluation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    seed_database()
    seed_open_roles()
    ingest_learning_resources()


# --- Schemas ---


class SubSkillOut(BaseModel):
    id: int
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str
    sub_skills: list[SubSkillOut]


class TaxonomyOut(BaseModel):
    categories: list[CategoryOut]


class SkillGapRequest(BaseModel):
    employee_name: str = "Employee"
    skills: list[SkillInput] = Field(min_length=1)


class EvaluateRequest(BaseModel):
    request: str = Field(
        ...,
        description="Natural language request for the agentic pipeline",
    )


class TrainingPlanRequest(BaseModel):
    employee_name: str = "Employee"
    skills: list[SkillInput] = Field(min_length=1)
    target_shape: Literal["T", "N", "M"] = Field(
        ...,
        description="Desired matrix balance: T=one deep pillar, N=two pillars, M=balanced breadth",
    )


class CareerPathRequest(BaseModel):
    employee_name: str = "Employee"
    skills: list[SkillInput] = Field(min_length=1)
    target_shape: Literal["T", "N", "M"] = Field(
        ...,
        description="Future skills matrix shape to acquire",
    )
    career_horizon: Literal["short", "medium", "long"] = Field(
        default="medium",
        description="Planning horizon: short=1-2y, medium=3-5y, long=5+y",
    )


class MockDataRequest(BaseModel):
    num_employees: int = Field(default=3, ge=1, le=10)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CategoryReorder(BaseModel):
    category_ids: list[int] = Field(min_length=1)


class SubSkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class EmployeesOut(BaseModel):
    employees: list[EmployeeSummary]


class OpenRolesOut(BaseModel):
    roles: list[OpenRoleOut]


# --- Routes ---


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/taxonomy", response_model=TaxonomyOut)
def get_taxonomy() -> TaxonomyOut:
    """Return all skill categories and their sub-skills."""
    session = get_session()
    try:
        return TaxonomyOut(categories=list_taxonomy(session))
    finally:
        session.close()


@app.post("/api/categories", response_model=CategoryOut, status_code=201)
def post_category(body: CategoryCreate) -> CategoryOut:
    """Add a new skill category (broad / horizontal pillar)."""
    session = get_session()
    try:
        return create_category(session, body.name)
    finally:
        session.close()


@app.put("/api/categories/order", response_model=TaxonomyOut)
def put_category_order(body: CategoryReorder) -> TaxonomyOut:
    """Reorder primary skill categories for display priority."""
    session = get_session()
    try:
        return TaxonomyOut(categories=reorder_categories(session, body.category_ids))
    finally:
        session.close()


@app.delete("/api/categories/{category_id}", status_code=204)
def remove_category(category_id: int) -> None:
    """Delete a category and all its sub-skills."""
    session = get_session()
    try:
        delete_category(session, category_id)
    finally:
        session.close()


@app.post(
    "/api/categories/{category_id}/sub-skills",
    response_model=SubSkillOut,
    status_code=201,
)
def post_sub_skill(category_id: int, body: SubSkillCreate) -> SubSkillOut:
    """Add a sub-skill under a category."""
    session = get_session()
    try:
        return create_sub_skill(session, category_id, body.name)
    finally:
        session.close()


@app.delete("/api/sub-skills/{sub_skill_id}", status_code=204)
def remove_sub_skill(sub_skill_id: int) -> None:
    """Delete a sub-skill."""
    session = get_session()
    try:
        delete_sub_skill(session, sub_skill_id)
    finally:
        session.close()


@app.get("/api/employees", response_model=EmployeesOut)
def get_employees() -> EmployeesOut:
    """List all employees for team / group selection."""
    session = get_session()
    try:
        return EmployeesOut(employees=list_employees(session))
    finally:
        session.close()


@app.post("/api/employees", response_model=EmployeeSummary, status_code=201)
def post_employee(body: EmployeeCreate) -> EmployeeSummary:
    """Add a new team member for T-skill assessment."""
    session = get_session()
    try:
        return create_employee(session, body)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    finally:
        session.close()


@app.get("/api/employees/{employee_name}/skills")
def get_employee_skills(employee_name: str):
    """Look up an employee skill profile from SQLite."""
    result = extract_hr_skills(employee_name)
    if isinstance(result, str):
        raise HTTPException(status_code=404, detail=result)
    return result


@app.post("/api/skill-gap", response_model=SkillGapResult)
def post_skill_gap(body: SkillGapRequest) -> SkillGapResult:
    """Calculate weighted skill gap per sub-skill, rank by highest gap, T/N/M shape."""
    return calculate_skill_gap(body.employee_name, body.skills)


@app.post("/api/mock-employees")
def post_mock_employees(body: MockDataRequest):
    """Generate synthetic employees via OpenAI (requires OPENAI_API_KEY)."""
    return generate_mock_hr_data(body.num_employees)


@app.get("/api/learning-resources", response_model=LearningResourcesResult)
def get_learning_resources(
    skills: list[str] = Query(..., description="Skill gap names to match"),
    top_k: int = Query(default=5, ge=1, le=20),
) -> LearningResourcesResult:
    return query_learning_resources(skill_gaps=skills, top_k=top_k)


@app.post("/api/evaluate")
def post_evaluate(body: EvaluateRequest) -> dict[str, str]:
    """Run the full agentic RAG pipeline and return a markdown plan."""
    plan = run_pipeline(body.request)
    return {"plan": plan}


@app.post("/api/training-plan")
def post_training_plan(body: TrainingPlanRequest) -> dict:
    """Generate a gap-prioritized training plan for a target T, N, or M shape."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is required to generate a training plan.",
        )
    return run_training_plan(
        body.employee_name,
        body.skills,
        body.target_shape,
    )


@app.post("/api/career-path")
def post_career_path(body: CareerPathRequest) -> dict:
    """Extrapolate a career path from the current matrix to future skill acquisition."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is required to generate a career path.",
        )
    return run_career_path(
        body.employee_name,
        body.skills,
        body.target_shape,
        body.career_horizon,
    )


@app.get("/api/open-roles", response_model=OpenRolesOut)
def get_open_roles() -> OpenRolesOut:
    """List synthetic open roles and job descriptions."""
    seed_open_roles()
    session = get_session()
    try:
        return OpenRolesOut(roles=list_open_roles(session))
    finally:
        session.close()


@app.post("/api/role-recommendations")
def post_role_recommendations(body: CareerPathRequest) -> dict:
    """Recommend open roles that close skill gaps and support the career path."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is required for role recommendations.",
        )
    return run_role_recommendations(
        body.employee_name,
        body.skills,
        body.target_shape,
        body.career_horizon,
    )
