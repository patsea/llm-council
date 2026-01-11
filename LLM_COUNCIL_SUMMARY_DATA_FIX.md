# LLM Council Summary Data Fix

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Fix Stage 1 to include tokens and response_time

In `backend/council.py`, find `stage1_collect_responses` and update the append block (around line 16-22):

```python
    stage1_results = []
    for model, response in result["responses"].items():
        stage1_results.append({
            "model": model,
            "response": response.get('content', ''),
            "cost": response.get('cost', 0),
            "tokens_prompt": response.get('tokens_prompt', 0),
            "tokens_completion": response.get('tokens_completion', 0),
            "response_time": response.get('response_time', 0),
        })
```

Verify: `python3 -c "import ast; ast.parse(open('backend/council.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Check Stage 2 data flow in main.py

In `backend/main.py`, check the stage2_complete yield. The `stage2_results` should already include cost/tokens/time from council.py update.

Check current yield:
```bash
grep -A 2 "stage2_complete" backend/main.py
```

If `data: stage2_results` is passed, Stage 2 data should flow through. No change needed if correct.

---

## STEP 3: Fix Stage 3 data - ensure cost is in stage3_result

In `backend/main.py`, find the stage3_complete yield. Check if it passes the full stage3_result with cost data:

```bash
grep -A 2 "stage3_complete" backend/main.py
```

Verify stage3_result includes cost field from council.py stage3_synthesize_final.

---

## STEP 4: Debug - check what data is actually stored

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council
LATEST=$(ls -t data/conversations/ | head -1)
echo "Latest: $LATEST"
python3 << 'EOF'
import json
import sys
with open(f"data/conversations/$(ls -t data/conversations/ | head -1)") as f:
    d = json.load(f)
msg = d['messages'][1] if len(d['messages']) > 1 else {}
print("=== Stage 1 (first model) ===")
if msg.get('stage1'):
    print(json.dumps(msg['stage1'][0], indent=2))
print("\n=== Stage 2 (first model) ===")
if msg.get('stage2'):
    print(json.dumps({k:v for k,v in msg['stage2'][0].items() if k != 'ranking'}, indent=2))
print("\n=== Stage 3 ===")
if msg.get('stage3'):
    print(json.dumps({k:v for k,v in msg['stage3'].items() if k != 'response'}, indent=2))
EOF
```

---

## STEP 5: Restart backend

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3 && curl -s http://localhost:8001/
```

---

## STEP 6: Test with new conversation

Create a NEW conversation (old ones won't have the data).
Submit a simple query and verify the summary table shows:
- [ ] Stage 1: Cost, Tokens, Time
- [ ] Stage 2: Cost, Tokens, Time
- [ ] Stage 3: Cost, Tokens, Time
- [ ] Totals include all stages

---

## Success Criteria
- [ ] All 9 API calls show cost values (not "-")
- [ ] Tokens (In/Out) shows numbers for all rows
- [ ] Time shows seconds for all rows
- [ ] Total cost includes Stage 1 + Stage 2 + Stage 3
