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


## Model Rule (Non-Negotiable)
- Claude Code interactive sessions: **claude-opus-4-6**
- Sub-agent / pipeline API calls: **claude-sonnet-4-6**
- Never hardcode model strings — always config-driven
---

## Open Brain — Personal Decision Record

Write in real time during sessions. Also sweep at EOD for anything missed.

### Write trigger (ingest-thought MCP immediately)
- Multi-LLM deliberation design decision — stage architecture, anonymization approach
- Model selection or routing reasoning
- Insight about how LLMs behave differently in deliberation vs solo use
- Product direction — what LLM Council should become

### Write format
  title: brief description
  project: llm-council
  content: full reasoning in first person
  tags: llm-council, deliberation, models, architecture (as relevant)

### EOD sweep
Review session for any decisions not yet written. Capture before closing.
---

## Feedback Agent

### Mode 1 — Session-Start Check
**Trigger:** Automatically at the start of every Claude Chat session.
**Time budget:** 2 minutes. 3-5 items max.

Protocol:
1. Search Notion LLM KB (263e739e-f799-44ca-bfa3-4781955e0916) — last 3 sessions.
   Surface: open findings, unresolved test failures or model issues.
2. Open Work section of this file — P1 items.
3. Query Open Brain — decisions from last 7 days tagged llm-council.
   Surface: any deliberation design or model decision relevant to today.

Output format:
```
## Session Start — [date]
**Open from last sessions:** [max 2 items or "none"]
**P1 items:** [most urgent or "none"]
**Recent decisions relevant today:** [max 1 item or "none"]
**Suggested focus:** [one sentence]
```

### Mode 2 — Weekly Synthesis
**Trigger:** "run feedback" in any session.
**Time budget:** 5-10 minutes.

Protocol:
1. Notion LLM KB — all pages from last 7 days.
2. Open Brain — all llm-council entries from last 7 days.
3. data/conversations/ — count conversations this week. Any quality patterns
   in how models are performing across the 3 stages?
4. Test coverage — has 63% floor been maintained? Any regressions?
5. Future enhancements section of CLAUDE.md — what's been deferred?

Output format:
```
## Weekly Feedback — [date]

**Deliberation quality patterns:**
- [any observed pattern in Stage 1/2/3 outputs this week]

**Test health:**
- Coverage: [current %] vs 63% floor
- Any regressions: [yes/no, detail]

**Decisions to revisit:**
- [Open Brain entry] — still valid?

**Enhancement backlog changes:**
- [item]: [prioritise/defer/close] because [evidence]

**Recommended P1 next week:**
- [task] because [evidence]
```
---

## EOD Open Brain Protocol

### What Claude Chat does at EOD
Review the entire session. Identify everything worth writing to Open Brain:
- Any decision Patrick made or stated
- Any strategic choice or direction set
- Any adaptation or change to approach
- Any principle or preference Patrick expressed
- Any insight that emerged

**Threshold:** If it would help future-Patrick understand why something was decided — write it.

### What goes into EOD-DISK-OPS
For each identified entry:
```bash
curl -s -X POST \
  "https://rktsziupwwvggefjgsil.supabase.co/functions/v1/ingest-thought?key=e62b35b7c52d097cfe6a35afa236277ad3a3eb310f93db9bd0e71fc9ac0d9373" \
  -H "Content-Type: application/json" \
  -d '{"title":"<title>","content":"<full reasoning>","tags":"<project,topic>"}'
```

### Feedback in EOD-DISK-OPS
After writing, query Open Brain and append to Handover:
```bash
curl -s -X POST \
  "https://rktsziupwwvggefjgsil.supabase.co/functions/v1/open-brain-mcp?key=e62b35b7c52d097cfe6a35afa236277ad3a3eb310f93db9bd0e71fc9ac0d9373" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"list_thoughts","arguments":{"limit":20}},"jsonrpc":"2.0","id":1}'
```

### Handover format (with feedback appended)
```
## Open Brain Feedback
### Today
- [title] — [summary]
### Last 3 days
- [title] — [summary]
### Last 7 days
- [title] — [summary]
```
Loads automatically when Handover used as session context.
