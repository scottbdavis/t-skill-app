"""Planner Agent

Decomposes the user's request into a structured execution plan,
deciding which tools and retrievals are needed.
"""

import json
import os

from openai import OpenAI
from pydantic import BaseModel


class PlanStep(BaseModel):
    step_number: int
    action: str  # "extract_hr_skills" | "generate_mock_data" | "calculate_skill_gap" | "query_learning_resources"
    description: str
    parameters: dict


class ExecutionPlan(BaseModel):
    goal: str
    employee_name: str
    steps: list[PlanStep]


SYSTEM_PROMPT = """You are a planning agent for a T-shaped skill evaluation system.

Given a user request about an employee's professional development, decompose it into
an ordered list of tool invocations. Available actions:

1. "extract_hr_skills" - Look up an employee's existing skill profile from the HR database.
   Parameters: {"employee_name": "<name>"}

2. "generate_mock_data" - Generate synthetic employee data when real data is unavailable.
   Parameters: {"num_employees": <int 1-10>}

3. "calculate_skill_gap" - Score and rank an employee's skills using:
   skill_gap = 2×(value_to_sponsor − skill_rating) + (value_to_mitre − skill_rating);
   skill_rating × value_to_sponsor = total_score (for T/N/M shape).
   Parameters: {"employee_name": "<name>", "skills": [{"sub_skill": "...", "skill_rating": 1-5, "value_to_sponsor": 1-5, "value_to_mitre": 1-5}]}

4. "query_learning_resources" - Search for training resources matching skill gaps.
   Parameters: {"skill_gaps": ["skill1", "skill2"], "top_k": 5}

Always plan in this logical order when doing a full evaluation:
  1. Extract or generate employee data
  2. Calculate skill gaps
  3. Query learning resources for top gaps

Return a JSON object with keys: goal, employee_name, steps (array of
{step_number, action, description, parameters}).
"""


def create_plan(user_request: str) -> ExecutionPlan:
    """Analyze the user request and produce a structured execution plan."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_request},
        ],
    )

    raw = json.loads(response.choices[0].message.content)
    return ExecutionPlan(**raw)
