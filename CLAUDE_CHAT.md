# CLAUDE-CHAT-LLM-COUNCIL.md
# Operating rules for this Claude Project

> Last updated: 22 Mar 2026 (v1.00 — initial)

---

## Role in the Chain

```
Claude Chat → generates instruction files → Patrick reviews → Claude Code executes
```

---

## File Locations

```
~/Dropbox/ALOMA/claude-code/instructions/YYYY-MM/
~/Dropbox/ALOMA/claude-code/instructions/Project files/LLM Council/
~/Dropbox/ALOMA/claude-code/instructions/Project files/LLM Council/Upload/
~/Dropbox/ALOMA/claude-code/apps/llm-council/
~/Dropbox/ALOMA/claude-code/docs/findings/          ← central findings
~/Dropbox/ALOMA/claude-code/docs/best-practices/    ← central best practices
```

---

## Instruction Authoring Rules

1. **Investigate Before Fix** — INVESTIGATE → findings → FIX. Exception: root cause confirmed.
2. **Immediate Action** — every issue gets an instruction file in the same response.
3. **Transparent Before Executing** — state what will be done and risk first.
4. **Service Restart Rule** — backend (8001) and frontend (5173) are independent. Restart each explicitly after changes affecting that service. Never assume a change took effect without confirming.
5. **Test Gate** — every instruction file ends with: run pytest (backend) + vitest (frontend). 31 unit tests must pass.
6. **Never Silently Truncate** — if content shortened, state what was cut immediately.

---

## EOD Rules

**"run EOD" = generate the full package immediately in one response. No confirmation step.**

### EOD package

| # | File | Rule |
|---|------|------|
| 1 | `HANDOVER-EOD-DDMMMYYYY.md` | Always |
| 2 | `EXECUTION-PLAN-DDMMMYYYY.md` | Always — full P1/P2/P3 with history |
| 3 | `CLAUDE-CHAT-LLM-COUNCIL.md` | Always — full regeneration with current state |
| 4 | `EOD-DISK-OPS-DDMMMYYYY.md` | Always |

### Step sequence in every EOD

1. All content changes applied — pitfalls, CLAUDE.md patches, docs/ updates.
2. Handover written.
3. Test baseline check — confirm current passing test count and coverage %.
4. Pitfall currency check — new pitfall? append to central best practices.
5. PROJECT FILE AUDIT:

| Project file | Update trigger |
|---|---|
| `CLAUDE-CHAT-LLM-COUNCIL.md` | Always — regenerate every session |
| `HANDOVER-EOD-*.md` | New file each session |
| `EXECUTION-PLAN-*.md` | New file each session |
| `docs/BACKLOG.md` | Any new gap identified |

6. LAST: EOD-DISK-OPS — copies updated files to Upload/.

### upload/ — what goes there
```
Upload/
├── HANDOVER-EOD-DDMMMYYYY.md
├── EXECUTION-PLAN-DDMMMYYYY.md
├── CLAUDE-CHAT-LLM-COUNCIL.md
├── EOD-DISK-OPS-DDMMMYYYY.md
└── [any updated project file]
```

---

## Session Health

Every 15 interactions: assess context. >700k tokens → ask if EOD wanted.

---

## System Quick Reference

| Component | Port | Stack |
|-----------|------|-------|
| Backend API | 8001 | FastAPI, Python, uv |
| Frontend | 5173 | React, Vite |

**Base:** `/Users/pwilliamson/Dropbox/ALOMA/claude-code/apps/llm-council/`
**Python:** uv for dependency management (`uv run`, `uv add`)
**Models:** OpenRouter — config in data/model_config.json

---

## Absolute Rules

**Paths:** Always absolute `/Users/pwilliamson/...`. Never `~` or `$HOME`.
**Models:** Never hardcode — use data/model_config.json.
**Tests:** 31 unit tests must pass after every change.
**Services:** Restart backend and frontend independently — never assume both updated.
**Findings:** `/Users/pwilliamson/Dropbox/ALOMA/claude-code/docs/findings/` — central only.

---

## Key Architectural Facts (22 Mar 2026)

- 3-stage deliberation: collect (all models) → review (anonymous) → synthesize (chairman)
- Stage 2 anonymization: model names hidden during peer review, de-anonymized in UI
- 95 saved conversations in data/conversations/
- 31/31 unit tests passing, 63% coverage
- Storage: JSON files (no database) — data/conversations/
- "Vibe coded" Saturday hack — architectural decisions prioritize simplicity
- backend/tests/ and root tests/ both exist — backend/ is unit, root is integration

---

## Open Work (22 Mar 2026)

**P1:**
<!-- Populate at first session -->

**P2:**
<!-- Populate at first session -->
---

## Notion Long-Term Memory

**LLM Council Knowledge Base ID:** `e9e44e5e-02fd-4c1f-871b-4a57182bfb19`

### What syncs to Notion
- FINDINGS-*.md → type=findings
- HANDOVER-EOD-*.md → type=handover

### What does NOT sync
- Instruction files, source code, conversation JSON files

### Sync step (add to every FINDINGS and EOD instruction)
```
Use Notion MCP: create page in database e9e44e5e-02fd-4c1f-871b-4a57182bfb19
  title: <filename without extension>
  type: findings | handover
  date: <YYYY-MM-DD>
  tags: <component names e.g. backend,frontend,council,storage>
  summary: <5 bullets from ## Summary section>
  full_content: <full file content>
Verify: page URL returned
```

### Before investigating: search Notion first
Search database e9e44e5e-02fd-4c1f-871b-4a57182bfb19 before re-investigating known patterns.
---

## Superpowers — always active

| Skill | Rule |
|-------|------|
| TDD | STEP 0: write failing tests first. Backend: pytest. Frontend: vitest. Report N passed / N total in every SUMMARY. 31 baseline tests must always pass. |
| Systematic debugging | Root cause + fix in one pass. Standalone INVESTIGATE only when domain genuinely unknown. |
| Verification | Run `cd backend && python -m pytest` AND `cd frontend && npm test` before SUMMARY. Coverage must not drop below 63%. |
| Service independence | Backend (8001) and frontend (5173) are separate processes. Verify each independently after any change. Never assume both updated. |
| Subagent | Use parallel agents for independent backend/frontend changes. Each writes findings before reporting. |
| Model config discipline | All model references via data/model_config.json. Never hardcode. Verify config change propagates to all 3 stages. |
