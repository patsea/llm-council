# LLM Council Analytics Quality Score & Total Time Fix

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Fix value-score endpoint field names

In `backend/main.py`, find the `/api/analytics/value-score` endpoint (around line 680) and fix these lines:

**Change:**
```python
model = item.get("label", "")
...
model_stats[model]["rankings"].append(item.get("avg_rank", 0))
```

**To:**
```python
model = item.get("model", "")
...
model_stats[model]["rankings"].append(item.get("average_rank", 0))
```

Verify: `python3 -c "import ast; ast.parse(open('backend/main.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Add total time to CouncilSummary.jsx

In `frontend/src/components/CouncilSummary.jsx`, after the token calculations (around line 40), add:

```jsx
const stage1Time = stage1.reduce((sum, r) => sum + (r.response_time || 0), 0);
const stage2Time = stage2?.reduce((sum, r) => sum + (r.response_time || 0), 0) || 0;
const stage3Time = stage3?.response_time || 0;
const totalTime = stage1Time + stage2Time + stage3Time;
```

Then in the TOTAL row, change the Time cell from `-` to:

```jsx
<td>{totalTime > 0 ? `${totalTime.toFixed(1)}s` : '-'}</td>
```

---

## STEP 3: Restart backend

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/api/analytics/value-score | python3 -c "
import json, sys
d = json.load(sys.stdin)
for m in d['models'][:4]:
    print(f\"{m['model'].split('/')[1]}: quality={m['quality_score']}, speed={m['speed_score']}, value={m['value_score']}\")"
```

Should now show non-zero Quality scores.

---

## STEP 4: Hard refresh and test

1. Hard refresh: Cmd+Shift+R
2. Check Analytics page - Quality column should have values
3. Create new conversation - TOTAL row should show total time

---

## Success Criteria
- [ ] Quality scores non-zero in Analytics (based on peer rankings)
- [ ] Total Time shows in Council Summary TOTAL row
- [ ] Value Score rankings update based on actual quality data
