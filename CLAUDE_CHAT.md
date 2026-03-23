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

## Open Brain — Personal Decision Record

Write in real time during sessions. Also sweep at EOD for anything missed.

### Write trigger (capture_thought MCP immediately)
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

**Template:** `~/Dropbox/ALOMA/claude-code/docs/EOD-OPEN-BRAIN-TEMPLATE.md`
Claude Chat reads this template when generating EOD-DISK-OPS instruction files.

### What Claude Chat does at EOD
Review the entire session. Identify everything worth writing to Open Brain:
- Any decision Patrick made or stated
- Any strategic choice or direction set
- Any adaptation or change to approach
- Any principle or preference Patrick expressed
- Any insight that emerged

**Threshold:** If it would help future-Patrick understand why something was decided — write it.

### How writes happen
Claude Code uses the Open Brain MCP `capture_thought` tool — NOT curl to ingest-thought
(ingest-thought is a Slack webhook handler, not a direct write endpoint).

Each EOD-DISK-OPS instruction includes explicit `capture_thought` calls for each entry
identified by Claude Chat during session review.

### Feedback retrieval
After writing, Claude Code queries Open Brain via the `list_thoughts` MCP tool and appends
results to the Handover file in today / 3-day / 7-day buckets. The full query + formatting
logic is in the template file above.

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
---

## AI Spec & Roadmap KB

**Database ID:** `32cc9e45e6a680d79bead2796cae8fdd`
**Data source:** `32cc9e45-e6a6-80ec-8c4d-000b6cac425e`

This is the cross-project product development database. All roadmap items,
AI specs, investigations, investigation findings, retrospectives, and build
logs live here. Not in files.

### Types in this database
- `roadmap-item` — feature on the roadmap
- `ai-spec-draft` — spec in progress
- `ai-spec-final` — validated, build-ready
- `investigation` — Claude Code investigation instruction record
- `investigation-findings` — Claude Code writes here in real time
- `build-ready` — confirmed ready for Claude Code to build
- `retrospective` — post-build review

### Claude Code writes in real time
During investigation and build, Claude Code writes findings to this database
using the Notion MCP directly — not waiting for EOD. Every finding, every
build log entry, every question goes here immediately.

### Invoking the agents
- Roadmap: "Read agents/roadmap-agent.md. Act as Roadmap Agent for [project]."
- AI Spec: "Read agents/ai-spec-agent.md. Act as AI Spec Agent for [feature]."

---

## Superpowers — Active Protocols (Non-Negotiable Gates)

These are not guidelines. They are enforcement gates that fire automatically.
Every gate applies to every session. No exceptions.

### Gate 1 — Investigation Before Fix
**Fires when:** Any fix, patch, or change is requested.
**Protocol:** Confirm root cause is known before generating any FIX-* file.
If root cause is not confirmed: generate INVESTIGATE-* instruction first.
Exception: root cause explicitly confirmed in current session log.
**Violation:** Generating FIX-* without confirmed root cause = blocked.

### Gate 2 — Verification Gate
**Fires before every SUMMARY step.**
**Protocol:** The command was run and the actual output is shown — not inferred.
- "No errors in console" = FAIL — show the actual output
- "Tests pass" = FAIL unless N/N count shown
- "Deployed successfully" = FAIL unless response or pod status shown
**Violation:** SUMMARY without actual command output = blocked.

### Gate 3 — Never Defer
**Fires when:** Any issue, gap, or improvement is identified.
**Protocol:** Generate the instruction file in the same response as identification.
Never: "consider doing X later", "this could be a future improvement", "you might want to"
**Violation:** Identified issue without instruction file in same response = blocked.

### Gate 4 — Immediate Action
**Fires when:** Patrick asks for anything actionable.
**Protocol:** Do it immediately. No "should I proceed?", no "would you like me to?",
no asking permission, no confirming before generating files.
**Violation:** Asking permission before acting = blocked.

### Gate 5 — Never Silently Truncate
**Fires when:** Any content is shortened, summarised, or cut.
**Protocol:** State explicitly what was cut and why. Immediately, in the same response.
**Violation:** Shortening content without stating what was removed = blocked.

### Gate 6 — Log Assessment
**Fires when:** Any execution log or Claude Code output is provided.
**Protocol:** Immediately assess:
1. New pitfall needed? (was this non-obvious, likely to recur, caused or could cause an incident?)
2. Documentation update needed? (CLAUDE.md, infra reference, architecture doc?)
"No documentation updates required — [one-line reason]" is a valid and complete answer.
**Violation:** Responding to a log without explicit assessment = blocked.

### Gate 7 — Anonymization Invariant (LLM Council only)
**Fires when:** Any change touches council.py, openrouter.py, or Stage 2 logic.
**Protocol:** Verify model names are NOT exposed in Stage 2 API calls after the change.
De-anonymization happens in UI only — this separation must be maintained.
**Violation:** Stage 2 change without anonymization verification = blocked.

### Gate 8 — Test Coverage Gate (LLM Council only)
**Fires after every code change.**
**Protocol:** Run `cd backend && python -m pytest` AND `cd frontend && npm test`.
Coverage must not drop below 63%. SUMMARY always reports N/31 + coverage %.
**Violation:** Code change without test run + coverage confirmed = blocked.

### Gate 9 — TDD Gate (LLM Council only)
**Fires on every BUILD step.**
**Protocol:** STEP 0 writes failing tests first. Tests must fail before code is written.
Tests must pass after code is written.
**Violation:** BUILD step without failing-then-passing test cycle = blocked.

### Gate 10 — Service Independence (LLM Council only)
**Fires when:** Any change affects backend (8001) or frontend (5173).
**Protocol:** Restart each service explicitly and verify each independently after changes.
Never assume both services updated from a single restart.
**Violation:** Service change without independent verification of each = blocked.
