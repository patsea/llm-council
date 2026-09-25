# LLM-BEST-PRACTICES.md
# LLM Council — Project-Specific Best Practices
# Supplements: CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md
# Last updated: 02 Apr 2026

> For universal cross-project pitfalls see: ~/Dropbox/ALOMA/claude-code/knowledge/reference/best-practices/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

---

## Project Context

**Name**: LLM Council
**Purpose**: 3-stage deliberation system where multiple LLMs collaboratively answer questions via anonymized peer review.

### Tech Stack
- **Backend**: Python (FastAPI), async, OpenRouter API
- **Frontend**: React + Vite
- **Storage**: JSON files in `data/conversations/`
- **Dependency management**: uv (NOT pip directly)
- **Python version**: managed via `.python-version`
- **Model config**: `data/model_config.json` (never hardcode model names)

### Key Commands

```bash
# Backend
cd backend && python -m backend.main              # Start backend (port 8001)
cd backend && python -m pytest                     # Run backend tests
cd backend && python -m pytest tests/              # Specific test directory

# Frontend
cd frontend && npm install                         # Install frontend deps
cd frontend && npm run dev                         # Start frontend (port 5173)
cd frontend && npm test                            # Run vitest

# Root-level tests
python -m pytest tests/                            # Full integration suite

# Dependency management
uv add <package>                                   # Add Python dependency
uv sync                                            # Sync from pyproject.toml
```

### Architecture Overview

```
User Query → Stage 1 (parallel queries to council models)
           → Stage 2 (anonymize responses → parallel ranking)
           → Aggregate Rankings (average rank position)
           → Stage 3 (chairman synthesizes final answer)
           → Return {stage1, stage2, stage3, metadata}
           → Frontend display with tabs + validation UI
```

- **Stage 1**: Parallel queries to all council models via OpenRouter
- **Stage 2**: Anonymized peer review (models see "Response A, B, C" — not model names)
- **Stage 3**: Chairman model synthesizes from all responses + rankings
- De-anonymization happens client-side for transparency

---

## Python Backend Rules

### FastAPI Patterns
- CORS enabled for `localhost:5173` and `localhost:3000` — update `main.py` if adding origins
- POST `/api/conversations/{id}/message` is the main endpoint
- Metadata (label_to_model, aggregate_rankings) returned via API but not persisted to JSON storage

### Module Imports
- ALL backend modules use **relative imports**: `from .config import ...`
- Run as module: `python -m backend.main` from project root
- Never `cd backend && python main.py` — this breaks relative imports

### Virtual Environment
- Managed by `uv` — virtual env in `.venv/`
- Python version pinned in `.python-version`
- Activate: `source .venv/bin/activate` (if not using uv run)

### Dependency Management
- Use `uv add <package>` — not `pip install`
- Dependencies defined in `pyproject.toml`
- Lock file: `uv.lock`

### API Endpoint Conventions
- All endpoints under `/api/`
- Conversations: CRUD at `/api/conversations/`
- Messages: POST to `/api/conversations/{id}/message`
- Response includes all 3 stages + metadata in single response (not streaming)

---

## Frontend Rules

### Vite + React
- Entry: `frontend/src/main.jsx`
- Main component: `frontend/src/App.jsx`
- API client: `frontend/src/api.js`
- Port: 5173 (Vite default)

### Component Patterns
- `Stage1.jsx` — tab view of individual model responses
- `Stage2.jsx` — peer review tabs with de-anonymized model names (client-side)
- `Stage3.jsx` — chairman synthesis (green background #f0fff0)
- `ChatInterface.jsx` — multiline textarea, Enter to send, Shift+Enter for newline

### Markdown Rendering
- All ReactMarkdown components wrapped in `<div className="markdown-content">`
- Global `.markdown-content` class defined in `index.css` (12px padding)

### Styling
- Light mode theme (not dark mode)
- Primary color: `#4a90e2` (blue)
- Stage 3 background: `#f0fff0` (green tint)

---

## Testing Rules

### Backend Tests
- Framework: pytest
- Run: `cd backend && python -m pytest`
- Baseline: 31 unit tests must pass after any change
- Coverage target: maintain 63%+
- Test file: `backend/tests/`

### Frontend Tests
- Framework: vitest
- Run: `cd frontend && npm test`

### Integration Tests
- Root-level: `python -m pytest tests/`
- Use `test_openrouter.py` to verify API connectivity before adding models

### Verification
- Every code change includes a runnable verification command
- Run full test suite before any commit

---

## Common Pitfalls

### Module import errors
Always run backend as `python -m backend.main` from project root.
Running `python backend/main.py` breaks relative imports.

### CORS origin mismatch
Frontend origin must match `main.py` CORS middleware allowed origins.
If frontend port changes, update CORS config.

### Ranking parse failures
If models don't follow the FINAL RANKING format, fallback regex extracts
any "Response X" patterns in order. Check `parse_ranking_from_text()` in `council.py`.

### Metadata is ephemeral
`label_to_model` and `aggregate_rankings` are NOT persisted to JSON storage.
They exist only in the API response and frontend state. Reloading a conversation
from storage will not have this metadata.

### Port conflict
Backend runs on 8001 (NOT 8000 — user had another app on 8000).
Frontend runs on 5173. Update both `backend/main.py` and `frontend/src/api.js` if changing.

### Python environment activation
Always ensure `.venv` is active or use `uv run` prefix.
Forgetting activation leads to import errors or using system Python.

### Model names must not be hardcoded
Use `data/model_config.json` for all model identifiers.
Chairman model configured in `backend/config.py` (currently Gemini).

---

## MCP Usage in LLM Sessions

### Available MCPs
- **github** — repo management, PRs, issues
- **notion** — knowledge base sync (KB ID: 263e739e-f799-44ca-bfa3-4781955e0916)

### Not available in LLM sessions
- kubernetes — no K8s infrastructure here
- cloudflare — no DNS/CDN here
- attio — no CRM here
- gmail — no email operations here
- aloma / aloma-admin — no ALOMA platform operations here


---

## PITFALL: Never call aloma_ or aloma-admin_ MCP tools outside platform sessions

**Severity:** Critical — production data risk
**Added:** 05 Apr 2026

ALOMA MCP tools connect directly to the production database. Calling them
from dev sessions (devops, jsa, workflow-automation, llm-council, etc.)
bypasses CLI safeguards and can corrupt production tenant data.

**Rule:** Use the ALOMA CLI for all ALOMA interactions outside of sessions
launched from aloma-mcp/, aloma-admin-mcp/, or aloma-connectors/.

**Fix applied 05 Apr 2026:**
- aloma + aloma-admin removed from all non-platform .mcp.json files
- Gate added to all CLAUDE.md files and universal ~/.claude/CLAUDE.md

