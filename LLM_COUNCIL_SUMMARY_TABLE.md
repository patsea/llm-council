# LLM Council Summary Table

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Update openrouter.py to capture response time

In `backend/openrouter.py`, add timing to `query_model`:

```python
import time  # Add at top with other imports

async def query_model(...):
    # ... existing code ...
    try:
        start_time = time.time()
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(...)
            response.raise_for_status()
            elapsed = time.time() - start_time
            # ... existing parsing ...
            
            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details'),
                'cost': usage.get('cost', 0),
                'tokens_prompt': usage.get('prompt_tokens', 0),
                'tokens_completion': usage.get('completion_tokens', 0),
                'response_time': round(elapsed, 2),
            }
```

Verify: `python3 -c "import ast; ast.parse(open('backend/openrouter.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Create CouncilSummary.jsx component

Create `frontend/src/components/CouncilSummary.jsx`:

```jsx
import React from 'react';
import './CouncilSummary.css';

export default function CouncilSummary({ stage1, stage2, stage3, metadata }) {
  if (!stage1 || stage1.length === 0) return null;

  const labelToModel = metadata?.label_to_model || {};
  const aggregateRankings = metadata?.aggregate_rankings || [];
  
  // Build ranking lookup: model -> {position, score}
  const rankingLookup = {};
  aggregateRankings.forEach((item, idx) => {
    const model = labelToModel[item.label] || item.label;
    rankingLookup[model] = {
      position: idx + 1,
      score: item.avg_rank?.toFixed(1) || '-'
    };
  });

  // Calculate totals
  const stage1Cost = stage1.reduce((sum, r) => sum + (r.cost || 0), 0);
  const stage2Cost = stage2?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
  const stage3Cost = stage3?.cost || 0;
  const totalCost = stage1Cost + stage2Cost + stage3Cost;
  
  const stage1Tokens = stage1.reduce((sum, r) => sum + (r.tokens_prompt || 0) + (r.tokens_completion || 0), 0);
  const stage2Tokens = stage2?.reduce((sum, r) => sum + (r.tokens_prompt || 0) + (r.tokens_completion || 0), 0) || 0;
  const stage3Tokens = (stage3?.tokens_prompt || 0) + (stage3?.tokens_completion || 0);
  const totalTokens = stage1Tokens + stage2Tokens + stage3Tokens;

  const errorCount = metadata?.stage1_errors?.length || 0;

  const formatModel = (model) => model?.split('/')[1] || model || '-';
  const formatCost = (cost) => cost > 0 ? `$${cost.toFixed(4)}` : '-';
  const formatTokens = (prompt, completion) => {
    if (!prompt && !completion) return '-';
    return `${prompt || 0}/${completion || 0}`;
  };
  const formatTime = (time) => time ? `${time}s` : '-';
  const formatRank = (model) => {
    const r = rankingLookup[model];
    if (!r) return '-';
    const suffix = r.position === 1 ? 'st' : r.position === 2 ? 'nd' : r.position === 3 ? 'rd' : 'th';
    return `${r.position}${suffix} (${r.score})`;
  };

  return (
    <div className="council-summary">
      <h3>📊 Council Summary</h3>
      
      <div className="summary-stats">
        <div className="stat">
          <span className="stat-label">Total Cost</span>
          <span className="stat-value cost">${totalCost.toFixed(4)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Tokens</span>
          <span className="stat-value">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">API Calls</span>
          <span className="stat-value">{stage1.length + (stage2?.length || 0) + (stage3 ? 1 : 0)}</span>
        </div>
        {errorCount > 0 && (
          <div className="stat error">
            <span className="stat-label">Errors</span>
            <span className="stat-value">{errorCount}</span>
          </div>
        )}
      </div>

      <table className="summary-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Model</th>
            <th>Cost</th>
            <th>Tokens (In/Out)</th>
            <th>Time</th>
            <th>Peer Rank</th>
          </tr>
        </thead>
        <tbody>
          {/* Stage 1 rows */}
          {stage1.map((r, i) => (
            <tr key={`s1-${i}`} className="stage1-row">
              <td>{i === 0 ? '1 - Response' : ''}</td>
              <td>{formatModel(r.model)}</td>
              <td>{formatCost(r.cost)}</td>
              <td>{formatTokens(r.tokens_prompt, r.tokens_completion)}</td>
              <td>{formatTime(r.response_time)}</td>
              <td>{formatRank(r.model)}</td>
            </tr>
          ))}
          
          {/* Stage 2 rows */}
          {stage2?.map((r, i) => (
            <tr key={`s2-${i}`} className="stage2-row">
              <td>{i === 0 ? '2 - Ranking' : ''}</td>
              <td>{formatModel(r.model)}</td>
              <td>{formatCost(r.cost)}</td>
              <td>{formatTokens(r.tokens_prompt, r.tokens_completion)}</td>
              <td>{formatTime(r.response_time)}</td>
              <td>-</td>
            </tr>
          ))}
          
          {/* Stage 3 row */}
          {stage3 && (
            <tr className="stage3-row">
              <td>3 - Chairman</td>
              <td>{formatModel(stage3.model)}</td>
              <td>{formatCost(stage3.cost)}</td>
              <td>{formatTokens(stage3.tokens_prompt, stage3.tokens_completion)}</td>
              <td>{formatTime(stage3.response_time)}</td>
              <td>-</td>
            </tr>
          )}
          
          {/* Totals row */}
          <tr className="totals-row">
            <td><strong>TOTAL</strong></td>
            <td>{stage1.length + (stage2?.length || 0) + 1} calls</td>
            <td><strong>${totalCost.toFixed(4)}</strong></td>
            <td><strong>{totalTokens.toLocaleString()}</strong></td>
            <td>-</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

---

## STEP 3: Create CouncilSummary.css

Create `frontend/src/components/CouncilSummary.css`:

```css
.council-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.council-summary h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1e293b;
}

.summary-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.stat-value.cost {
  color: #059669;
}

.stat.error .stat-value {
  color: #dc2626;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.summary-table th {
  text-align: left;
  padding: 8px 12px;
  background: #e2e8f0;
  color: #475569;
  font-weight: 600;
}

.summary-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.stage1-row { background: #f0fdf4; }
.stage2-row { background: #fef3c7; }
.stage3-row { background: #dbeafe; }

.totals-row {
  background: #1e293b;
  color: white;
}

.totals-row td {
  border-bottom: none;
}
</style>
```

---

## STEP 4: Add CouncilSummary to ChatInterface.jsx

Import and add below Stage 3. Find where Stage3 is rendered and add after it:

```jsx
import CouncilSummary from './CouncilSummary';

// ... inside the message rendering, after Stage3 ...
{msg.stage3 && <Stage3 finalResponse={msg.stage3} ... />}

{/* Council Summary - show after Stage 3 complete */}
{msg.stage3 && !msg.stage3.error && (
  <CouncilSummary 
    stage1={msg.stage1}
    stage2={msg.stage2}
    stage3={msg.stage3}
    metadata={msg.metadata}
  />
)}
```

---

## STEP 5: Update backend to pass Stage 2/3 cost data

In `backend/council.py`, ensure stage2 and stage3 responses include cost/token/time data.

In `backend/main.py`, update stage2_complete and stage3_complete yields to include this data in the response objects.

---

## STEP 6: Restart backend

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3 && curl -s http://localhost:8001/
```

---

## STEP 7: Test with new conversation

Open http://localhost:5173, create new conversation, verify:
- [ ] Summary table appears below Stage 3
- [ ] Shows all API calls (Stage 1 + Stage 2 + Chairman)
- [ ] Per-model costs displayed
- [ ] Tokens (In/Out) per model
- [ ] Response time per model
- [ ] Peer rankings for Stage 1 models
- [ ] Total cost/tokens in footer row

---

## Success Criteria
- [ ] CouncilSummary.jsx created with table layout
- [ ] CSS styling applied (color-coded rows by stage)
- [ ] All API calls shown as separate rows
- [ ] Cost, tokens, time, rank displayed per row
- [ ] Totals row at bottom
- [ ] Summary stats bar (Total Cost, Tokens, Calls, Errors)
