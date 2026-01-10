# LLM Council Cost Display (Frontend)

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Update council.py to pass cost through responses

In `backend/council.py`, find `stage1_collect_responses` and update the loop to include cost:

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council

# Find and show current stage1_collect_responses
grep -n "stage1_results.append" backend/council.py
```

Replace the append block (around line 16-19) with:

```python
    stage1_results.append({
        "model": model,
        "response": response.get('content', ''),
        "cost": response.get('cost', 0),
    })
```

Also update metadata in `run_full_council` to include total cost. Find the metadata dict and add `stage1_cost`:

```python
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
        "stage1_errors": stage1_errors,
        "stage1_cost": sum(r.get('cost', 0) for r in stage1_results),
    }
```

Verify: `python3 -c "import ast; ast.parse(open('backend/council.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Update Stage1.jsx to display costs

In `frontend/src/components/Stage1.jsx`, add cost display to tabs and summary.

Find the tab button section and add cost after model name:

```jsx
{responses.map((response, index) => (
  <button
    key={index}
    className={`stage1-tab ${activeTab === index ? 'active' : ''}`}
    onClick={() => setActiveTab(index)}
  >
    {response.model.split('/').pop()}
    {response.cost > 0 && (
      <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
        ${response.cost.toFixed(4)}
      </span>
    )}
  </button>
))}
```

Add total cost to the error/summary section at bottom (inside the existing wrapper div, before the errors block):

```jsx
{/* Cost Summary */}
{metadata?.stage1_cost > 0 && (
  <div style={{
    backgroundColor: '#f0fdf4',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <span style={{ color: '#166534', fontWeight: '500' }}>💰 Stage 1 Total Cost</span>
    <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '16px' }}>
      ${metadata.stage1_cost.toFixed(4)}
    </span>
  </div>
)}
```

Update component props to receive metadata:

```jsx
export default function Stage1({ responses, stage1Errors, metadata }) {
```

---

## STEP 3: Update ChatInterface.jsx to pass metadata

Find where Stage1 is rendered and add metadata prop:

```jsx
{msg.stage1 && <Stage1 responses={msg.stage1} stage1Errors={msg.metadata?.stage1_errors} metadata={msg.metadata} />}
```

---

## STEP 4: Restart backend and test

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3 && curl -s http://localhost:8001/
```

---

## STEP 5: Verify in browser

Open http://localhost:5173, submit a query, verify:
- [ ] Each model tab shows cost (e.g., "gemini-3-pro-preview $0.0521")
- [ ] Green box below responses shows total Stage 1 cost
- [ ] Failed models still show in red box with errors

---

## Success Criteria
- [ ] Per-model cost displayed in tab buttons
- [ ] Total cost shown in green summary box
- [ ] Cost data flows from backend through metadata
