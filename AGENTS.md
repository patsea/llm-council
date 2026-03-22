# llm-council — Agent Roster

## Project
Multi-LLM deliberation system. 3-stage process:
1. Collect — all models respond independently
2. Review — models review each other anonymously (de-anonymized for UI)
3. Synthesize — chairman model produces final synthesis

95 saved conversations. Python FastAPI backend + React Vite frontend.
OpenRouter API for model routing.

## Architecture
```
User → React UI (5173) → FastAPI (8001) → OpenRouter
                              ↓
                    council.py (3-stage deliberation)
                              ↓
                    storage.py → data/conversations/*.json
```

## Components
| Component | Dir | Port | Stack |
|-----------|-----|------|-------|
| Backend API | backend/ | 8001 | FastAPI, Python |
| Frontend UI | frontend/ | 5173 | React, Vite |
| Storage | data/conversations/ | — | JSON files |
| Model config | data/model_config.json | — | OpenRouter model list |

## Agent Roster
| Agent | Invoke When |
|-------|-------------|
| Backend Dev | FastAPI, council.py, openrouter.py, storage.py, config.py |
| Frontend Dev | React components, App.jsx, Stage1/2/3.jsx, ChatInterface.jsx |
| QA Engineer | pytest (backend), vitest (frontend), 31 unit tests must pass |
| Code Reviewer | Pre-commit — CLAUDE.md rules, test pass confirmation |

## Invocation
"Read apps/llm-council/CLAUDE.md. Act as [role] for [task]."

## Key Paths
Base: /Users/pwilliamson/Dropbox/ALOMA/claude-code/apps/llm-council/
Panel: instructions/Project files/LLM Council/
Upload: instructions/Project files/LLM Council/Upload/
Findings: docs/findings/ (central)
---

## AI Engineer Role

**Invoke:** "Read apps/llm-council/CLAUDE.md. Act as AI Engineer for [task]."

### AI Components
This project IS the AI component — the entire 3-stage deliberation system:
- **Stage 1 (Collect):** All models respond independently via OpenRouter
- **Stage 2 (Review):** Models review each other anonymously — anonymization logic in council.py
- **Stage 3 (Synthesize):** Chairman model produces final synthesis

### Model Config
- Config: data/model_config.json — never hardcode model names
- All models via OpenRouter API — openrouter.py handles routing
- De-anonymization: names hidden in Stage 2 API calls, revealed in UI — verify both directions

### Evaluation Principles
- Stage 2 anonymization must be verifiable — log which model produced which response
- Chairman synthesis quality is the key output metric — spot-check against individual responses
- 95 saved conversations in data/conversations/ — use for regression testing prompt changes
- Coverage target: 63% minimum — AI logic changes require test coverage

### Rules
- Model changes: update data/model_config.json + run full 3-stage test with real query
- Prompt changes to any stage: verify output shape matches what downstream stage expects
- Never expose model names in Stage 2 API calls — anonymization is the core design invariant
