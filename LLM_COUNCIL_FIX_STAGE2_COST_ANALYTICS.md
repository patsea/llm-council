# LLM Council Stage 2: Analytics Cost Dashboard

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Create backend endpoint for cost analytics

Add to `backend/main.py` a new endpoint:

```python
@app.get("/api/analytics/costs")
async def get_cost_analytics():
    """Get cost analytics across all conversations."""
    import os
    from pathlib import Path
    
    conversations_dir = Path("data/conversations")
    
    total_cost = 0
    cost_by_model = {}
    cost_by_stage = {"stage1": 0, "stage2": 0, "stage3": 0}
    conversation_costs = []
    
    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)
            
            conv_cost = 0
            for msg in conv.get("messages", []):
                if msg.get("role") == "assistant":
                    # Stage 1 costs
                    for r in msg.get("stage1", []):
                        cost = r.get("cost", 0)
                        model = r.get("model", "unknown")
                        total_cost += cost
                        conv_cost += cost
                        cost_by_stage["stage1"] += cost
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost
                    
                    # Stage 2 costs
                    for r in msg.get("stage2", []):
                        cost = r.get("cost", 0)
                        model = r.get("model", "unknown")
                        total_cost += cost
                        conv_cost += cost
                        cost_by_stage["stage2"] += cost
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost
                    
                    # Stage 3 cost
                    stage3 = msg.get("stage3", {})
                    cost = stage3.get("cost", 0)
                    model = stage3.get("model", "unknown")
                    total_cost += cost
                    conv_cost += cost
                    cost_by_stage["stage3"] += cost
                    if model != "unknown":
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost
            
            if conv_cost > 0:
                conversation_costs.append({
                    "id": conv.get("id"),
                    "title": conv.get("title", "Untitled"),
                    "cost": conv_cost,
                    "created_at": conv.get("created_at")
                })
        except Exception as e:
            continue
    
    # Sort by cost descending
    cost_by_model_sorted = sorted(cost_by_model.items(), key=lambda x: x[1], reverse=True)
    conversation_costs.sort(key=lambda x: x["cost"], reverse=True)
    
    return {
        "total_cost": round(total_cost, 4),
        "cost_by_model": [{"model": m, "cost": round(c, 4)} for m, c in cost_by_model_sorted],
        "cost_by_stage": {k: round(v, 4) for k, v in cost_by_stage.items()},
        "top_conversations": conversation_costs[:10],
        "conversation_count": len(conversation_costs)
    }
```

Verify: `python3 -c "import ast; ast.parse(open('backend/main.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Add Cost section to Analytics.jsx

In `frontend/src/components/Analytics.jsx`, add a Cost Analytics section:

```jsx
// Add state for cost data
const [costData, setCostData] = useState(null);

// Fetch cost data
useEffect(() => {
  fetch('http://localhost:8001/api/analytics/costs')
    .then(res => res.json())
    .then(data => setCostData(data))
    .catch(err => console.error('Cost analytics error:', err));
}, []);

// Add to render, before or after existing metrics:
{costData && (
  <div className="analytics-section">
    <h2>💰 Cost Analytics</h2>
    
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">${costData.total_cost.toFixed(4)}</div>
        <div className="stat-label">Total Spend</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">${(costData.total_cost / costData.conversation_count).toFixed(4)}</div>
        <div className="stat-label">Avg per Conversation</div>
      </div>
    </div>
    
    <h3>Cost by Model</h3>
    <table className="analytics-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Total Cost</th>
          <th>% of Total</th>
        </tr>
      </thead>
      <tbody>
        {costData.cost_by_model.map((item, i) => (
          <tr key={i}>
            <td>{item.model}</td>
            <td>${item.cost.toFixed(4)}</td>
            <td>{((item.cost / costData.total_cost) * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
    
    <h3>Cost by Stage</h3>
    <div className="stage-costs">
      <div className="stage-cost stage1">
        <span>Stage 1 (Response)</span>
        <span>${costData.cost_by_stage.stage1.toFixed(4)}</span>
      </div>
      <div className="stage-cost stage2">
        <span>Stage 2 (Ranking)</span>
        <span>${costData.cost_by_stage.stage2.toFixed(4)}</span>
      </div>
      <div className="stage-cost stage3">
        <span>Stage 3 (Chairman)</span>
        <span>${costData.cost_by_stage.stage3.toFixed(4)}</span>
      </div>
    </div>
  </div>
)}
```

---

## STEP 3: Add CSS for cost section

Add to `Analytics.css`:

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #22c55e;
}

.stat-label {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 8px;
}

.stage-costs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stage-cost {
  flex: 1;
  min-width: 150px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
}

.stage-cost.stage1 { background: #f0fdf4; color: #166534; }
.stage-cost.stage2 { background: #fef3c7; color: #92400e; }
.stage-cost.stage3 { background: #dbeafe; color: #1e40af; }
```

---

## STEP 4: Restart backend and test

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/api/analytics/costs | python3 -m json.tool | head -30
```

---

## Success Criteria
- [ ] /api/analytics/costs endpoint returns data
- [ ] Analytics page shows Total Spend
- [ ] Cost by Model table populated
- [ ] Cost by Stage breakdown shown
