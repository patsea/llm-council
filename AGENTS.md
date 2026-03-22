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
