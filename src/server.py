"""T-Skill FastMCP Server

Exposes MCP tools for the Agentic RAG workflow:
  - calculate_skill_gap:      weighted gap (2× sponsor + MITRE), ranked by highest gap
  - extract_hr_skills:        query employee skill profiles from SQLite
  - generate_mock_hr_data:    create synthetic employee profiles via OpenAI
  - query_learning_resources: semantic search for training materials
"""

import truststore
truststore.inject_into_ssl()

from dotenv import load_dotenv  # noqa: E402
from fastmcp import FastMCP  # noqa: E402

from src.db.seed import seed_database  # noqa: E402
from src.tools.calculate_skill_gap import (  # noqa: E402
    SkillGapResult,
    SkillInput,
    calculate_skill_gap as _calculate_skill_gap,
)
from src.tools.extract_hr_skills import (  # noqa: E402
    HRSkillsResult,
    extract_hr_skills as _extract_hr_skills,
)
from src.tools.generate_mock_hr_data import (  # noqa: E402
    MockDataResult,
    generate_mock_hr_data as _generate_mock_hr_data,
)
from src.tools.query_learning_resources import (  # noqa: E402
    LearningResourcesResult,
    ingest_learning_resources,
    query_learning_resources as _query_learning_resources,
)

load_dotenv()

mcp = FastMCP(
    "T-Skill Server",
    instructions="MCP server for T-shaped skill evaluation and professional development planning",
)

seed_database()
count = ingest_learning_resources()
print(f"ChromaDB: {count} learning resources indexed.")


@mcp.tool()
def calculate_skill_gap(
    employee_name: str,
    skills: list[SkillInput],
) -> SkillGapResult:
    """Calculate the skill-value gap for an employee.

    Per sub-skill: skill_gap = 2×(value_to_sponsor − skill_rating) + (value_to_mitre − skill_rating).
    Results are ranked by highest skill_gap; overall highest gap is returned.
    T/N/M shape uses rating × sponsor value product scores.

    Args:
        employee_name: Name of the employee being evaluated.
        skills: List of skill evaluations, each with a sub_skill name,
                skill_rating (1-5), value_to_sponsor (1-5), and value_to_mitre (1-5).
    """
    return _calculate_skill_gap(employee_name, skills)


@mcp.tool()
def extract_hr_skills(employee_name: str) -> HRSkillsResult | str:
    """Retrieve an employee's existing skill profile from the HR database.

    Looks up the employee by name (partial match supported) and returns
    all recorded skills with their ratings, values, and scores.

    Args:
        employee_name: Full or partial name of the employee.
    """
    return _extract_hr_skills(employee_name)


@mcp.tool()
def generate_mock_hr_data(num_employees: int = 3) -> MockDataResult:
    """Generate synthetic employee profiles using OpenAI and persist them
    to the HR database. Use when live HR data is unavailable.

    Args:
        num_employees: Number of mock employees to generate (1-10).
    """
    return _generate_mock_hr_data(num_employees)


@mcp.tool()
def query_learning_resources(
    skill_gaps: list[str],
    top_k: int = 5,
) -> LearningResourcesResult:
    """Search for training and certification resources that address
    specific skill gaps. Returns results split by internal (MITRE)
    and external providers.

    Args:
        skill_gaps: Skill names or gap descriptions to find resources for.
        top_k: Maximum number of results to return.
    """
    return _query_learning_resources(skill_gaps, top_k)


if __name__ == "__main__":
    mcp.run()
