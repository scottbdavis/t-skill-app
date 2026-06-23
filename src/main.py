"""T-Skill App — Main entry point

Run the full agentic RAG pipeline for T-shaped skill evaluation.

Usage:
    python -m src.main "Evaluate Alice Johnson's skills and create a development plan"
    python -m src.main  # interactive mode
"""

import sys

import truststore
truststore.inject_into_ssl()

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from src.agents.orchestrator import run_pipeline  # noqa: E402
from src.db.seed import seed_database  # noqa: E402
from src.tools.query_learning_resources import ingest_learning_resources  # noqa: E402


def main() -> None:
    seed_database()
    ingest_learning_resources()

    if len(sys.argv) > 1:
        user_request = " ".join(sys.argv[1:])
    else:
        print("=" * 60)
        print("  T-Skill Agentic RAG — Skill Evaluation System")
        print("=" * 60)
        print()
        user_request = input("Enter your request: ").strip()
        if not user_request:
            print("No request provided. Exiting.")
            return

    print()
    result = run_pipeline(user_request)
    print()
    print("=" * 60)
    print("  SKILL DEVELOPMENT PLAN")
    print("=" * 60)
    print()
    print(result)


if __name__ == "__main__":
    main()
