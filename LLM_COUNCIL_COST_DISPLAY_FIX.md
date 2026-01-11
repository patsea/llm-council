# LLM Council Stage1 Cost Display Fix

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Check current Stage1.jsx for cost display code

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council
grep -n "cost" frontend/src/components/Stage1.jsx
```

If no matches or incomplete, proceed to fix.

---

## STEP 2: Check if responses have cost data in stored conversation

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council
cat data/conversations/$(ls -t data/conversations/ | head -1) | python3 -c "
import json, sys
d = json.load(sys.stdin)
if len(d['messages']) > 1:
    for r in d['messages'][1].get('stage1', [])[:2]:
        print(f\"{r.get('model')}: cost={r.get('cost')}\")"
```

---

## STEP 3: Ensure Stage1.jsx has cost display in tabs

The tab button should show cost after model name. Check line ~23 and ensure this code exists:

```jsx
{responses.map((resp, index) => (
  <button
    key={index}
    className={`stage1-tab ${activeTab === index ? 'active' : ''}`}
    onClick={() => setActiveTab(index)}
  >
    {resp.model.split('/')[1] || resp.model}
    {resp.cost > 0 && (
      <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '6px' }}>
        ${resp.cost.toFixed(4)}
      </span>
    )}
  </button>
))}
```

---

## STEP 4: Ensure total cost summary exists

After the response content div, ensure this block exists:

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

---

## STEP 5: Verify component receives metadata prop

Check ChatInterface.jsx passes metadata:

```bash
grep -n "Stage1" frontend/src/components/ChatInterface.jsx | head -5
```

Should show: `<Stage1 responses={...} stage1Errors={...} metadata={msg.metadata} />`

---

## STEP 6: Hard refresh browser

Frontend may have cached old version:

1. Open http://localhost:5173
2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) for hard refresh
3. Or open DevTools (F12) → Network tab → check "Disable cache" → refresh

---

## Success Criteria
- [ ] `grep "cost" Stage1.jsx` shows cost display code
- [ ] Cost shows in model tabs (e.g., "gemini-3-pro $0.0019")
- [ ] Green total cost box appears below responses
