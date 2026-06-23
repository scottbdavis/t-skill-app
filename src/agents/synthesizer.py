"""Synthesizer Agent

Produces the final AI-generated skill development plan by combining
tool results, retrieval results, and verification output into a
structured, actionable report for discussion with department leadership.
"""

import json
import os

from openai import OpenAI

from src.agents.planner import ExecutionPlan
from src.agents.verifier import VerificationResult

SYSTEM_PROMPT = """You are a professional development advisor producing a T-Skill evaluation report.

Given the analysis data below, produce a comprehensive skill development plan that includes:

1. **Employee Profile Summary** - Name, role, department, current skill shape (T/N/M)

2. **Skill Gap Analysis** - Ranked table of all evaluated skills with:
   - Sub-skill name
   - Self-rated Skill Rating (1-5)
   - Value to Sponsor (1-5)
   - Total Score (rating × value)
   - Rank

3. **Current Shape Assessment** - Explain the employee's current T/N/M shape and what it means

4. **Top Development Focus Areas** - The top 3 skill gaps to prioritize, with rationale

5. **Action Plans** - For each focus area, provide concrete steps such as:
   - Certifications to pursue
   - Courses to complete
   - Projects to take on
   - Mentorship opportunities

6. **Targeted Learning Resources** - Split into:
   - Internal: MITRE Internal Ed, Percipio, Skill Soft, Degree Programs
   - External: Udemy, Udacity, Universities, Big Tech, xAcademy, AI-generated classes, NotebookLM

7. **Progression Pathway** - Map from current shape toward the next level:
   - T → N: Identify the second pillar to develop
   - N → M: Identify the third pillar to develop
   - M: Suggest deepening or leadership/mentoring paths

Format the output as a clean, well-structured markdown document suitable for
sharing with department leadership.
"""


def synthesize_skill_plan(
    plan: ExecutionPlan,
    tool_results: list[dict],
    retrieval_results: list[dict],
    verification: VerificationResult,
) -> str:
    """Generate the final skill development plan using OpenAI.

    Args:
        plan: The execution plan from the planner agent.
        tool_results: Results from the tool agent (HR data, skill gaps).
        retrieval_results: Results from the retriever agent (learning resources).
        verification: Verification results from the verifier agent.

    Returns:
        Formatted markdown skill development plan.
    """
    context_parts = [
        f"## Execution Plan\nGoal: {plan.goal}\nEmployee: {plan.employee_name}",
    ]

    for result in tool_results:
        context_parts.append(
            f"\n## Tool Result: {result['action']}\n"
            f"Success: {result['success']}\n"
            f"Data:\n```json\n{json.dumps(result['result'], indent=2)}\n```"
        )

    for result in retrieval_results:
        context_parts.append(
            f"\n## Retrieved Learning Resources\n"
            f"Success: {result['success']}\n"
            f"Data:\n```json\n{json.dumps(result['result'], indent=2)}\n```"
        )

    if not verification.is_valid:
        context_parts.append(
            f"\n## Verification Issues\n"
            + "\n".join(f"- {issue}" for issue in verification.issues)
        )

    context = "\n".join(context_parts)

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.4,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Generate a comprehensive T-Skill development plan based on "
                    f"the following analysis data:\n\n{context}"
                ),
            },
        ],
    )

    return response.choices[0].message.content
