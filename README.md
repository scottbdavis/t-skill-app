# T-Skill Agentic RAG Application

AI-driven skill evaluation system using the "Deep and Wide" T-shaped skills methodology. Built with FastMCP, OpenAI, SQLite, and ChromaDB.

## Setup

```bash
# Create virtual environment
py -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -e .

# Configure environment
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

## Usage

### Run the REST API + frontend (recommended for UI)

**Terminal 1 — API (from project root):**

```bash
.\.venv\Scripts\Activate.ps1
uvicorn src.api:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to port 8000.

### Run the MCP Server (for MCP Inspector or Cursor integration)

```bash
python -m src.server
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector python -m src.server
```

### Run the Full Pipeline

```bash
# Interactive mode
python -m src.main

# With a request
python -m src.main "Evaluate Alice Johnson's skills and create a development plan"
```

### Seed Mock Data (requires OpenAI key)

The `generate_mock_hr_data` tool creates synthetic employees via OpenAI. You can invoke it through the MCP server or directly:

```python
from src.tools.generate_mock_hr_data import generate_mock_hr_data
result = generate_mock_hr_data(num_employees=5)
```

## Architecture

```
MCP Client (Agentic Layer)
  ├── Planner Agent      → decomposes user requests into steps
  ├── Tool Agent         → executes HR data and skill gap tools
  ├── Retriever Agent    → queries ChromaDB for learning resources
  └── Verifier Agent     → validates math and shape classification

FastMCP Server (4 Tools)
  ├── calculate_skill_gap      → deterministic rating × value scoring
  ├── extract_hr_skills        → SQLite employee skill lookups
  ├── generate_mock_hr_data    → OpenAI synthetic profile generation
  └── query_learning_resources → ChromaDB semantic search

Data Storage
  ├── SQLite  → employee profiles, skill categories, ratings
  └── ChromaDB → learning resource embeddings
```

## Skill Categories (7 Pillars)

| Category | Sub-skills |
|---|---|
| Data Science | AI-Engineering, AI-ML/Ops, Python/PyTorch |
| Cloud Technology | Cloud AI Services, Cloud DevSecOps, Cloud ML Services |
| FinOps | AI for FinOps, FinOps for Cloud AI, FinOps & TBM |
| Agile/PM/Business | Scrum Master/PMP, SAFe, Scrum Trainer |
| Site Reliability Eng (SRE) | Incident Mgmt, Monitoring, Infra as Code |
| IT Architecture | Infrastructure Arch, Enterprise Arch, Cloud Architecture |
| Lean Six Sigma/VSM | Master Blackbelt, VSM Facilitator, Lean Leader |

## T-Shape Progression

- **T Shape**: Deep expertise in one vertical pillar
- **N Shape**: Deep expertise spanning two vertical pillars
- **M Shape**: Deep expertise spanning three or more vertical pillars
