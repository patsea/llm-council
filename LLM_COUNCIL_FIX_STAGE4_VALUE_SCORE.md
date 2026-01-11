# LLM Council Stage 4: Value Score & Analytics Polish

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Add Value Score endpoint to backend

Add to `backend/main.py`:

```python
@app.get("/api/analytics/value-score")
async def get_value_scores():
    """Calculate composite value score for each model.
    
    Value = (Quality × 0.4) + (Speed × 0.3) + (Cost Efficiency × 0.3)
    
    Quality = normalized inverse of avg peer ranking (lower rank = higher quality)
    Speed = normalized inverse of avg response time
    Cost Efficiency = tokens per dollar
    """
    import os
    from pathlib import Path
    
    conversations_dir = Path("data/conversations")
    
    model_stats = {}  # model -> {rankings: [], times: [], tokens: 0, cost: 0}
    
    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)
            
            for msg in conv.get("messages", []):
                if msg.get("role") == "assistant":
                    metadata = msg.get("metadata", {})
                    
                    # Get rankings
                    for item in metadata.get("aggregate_rankings", []):
                        model = item.get("label", "")
                        if not model:
                            continue
                        if model not in model_stats:
                            model_stats[model] = {"rankings": [], "times": [], "tokens": 0, "cost": 0}
                        model_stats[model]["rankings"].append(item.get("avg_rank", 0))
                    
                    # Get times, tokens, costs from all stages
                    for r in msg.get("stage1", []) + msg.get("stage2", []):
                        model = r.get("model", "")
                        if not model:
                            continue
                        if model not in model_stats:
                            model_stats[model] = {"rankings": [], "times": [], "tokens": 0, "cost": 0}
                        
                        if r.get("response_time", 0) > 0:
                            model_stats[model]["times"].append(r["response_time"])
                        model_stats[model]["tokens"] += r.get("tokens_prompt", 0) + r.get("tokens_completion", 0)
                        model_stats[model]["cost"] += r.get("cost", 0)
                    
                    stage3 = msg.get("stage3", {})
                    model = stage3.get("model", "")
                    if model:
                        if model not in model_stats:
                            model_stats[model] = {"rankings": [], "times": [], "tokens": 0, "cost": 0}
                        if stage3.get("response_time", 0) > 0:
                            model_stats[model]["times"].append(stage3["response_time"])
                        model_stats[model]["tokens"] += stage3.get("tokens_prompt", 0) + stage3.get("tokens_completion", 0)
                        model_stats[model]["cost"] += stage3.get("cost", 0)
                        
        except Exception:
            continue
    
    # Calculate scores
    results = []
    for model, stats in model_stats.items():
        if not stats["rankings"] and not stats["times"]:
            continue
        
        avg_rank = sum(stats["rankings"]) / len(stats["rankings"]) if stats["rankings"] else 5
        avg_time = sum(stats["times"]) / len(stats["times"]) if stats["times"] else 30
        tokens_per_dollar = stats["tokens"] / stats["cost"] if stats["cost"] > 0 else 0
        
        # Normalize scores (0-100)
        # Quality: rank 1 = 100, rank 5 = 0
        quality_score = max(0, (5 - avg_rank) / 4 * 100)
        # Speed: faster is better, assume 1s = 100, 30s = 0
        speed_score = max(0, min(100, (30 - avg_time) / 29 * 100))
        # Cost efficiency: normalize against max
        
        results.append({
            "model": model,
            "avg_rank": round(avg_rank, 2),
            "avg_time": round(avg_time, 2),
            "tokens_per_dollar": round(tokens_per_dollar, 0),
            "total_tokens": stats["tokens"],
            "total_cost": round(stats["cost"], 4),
            "quality_score": round(quality_score, 1),
            "speed_score": round(speed_score, 1),
        })
    
    # Normalize cost efficiency and calculate final score
    if results:
        max_tpd = max(r["tokens_per_dollar"] for r in results) or 1
        for r in results:
            r["efficiency_score"] = round((r["tokens_per_dollar"] / max_tpd) * 100, 1)
            r["value_score"] = round(
                r["quality_score"] * 0.4 + 
                r["speed_score"] * 0.3 + 
                r["efficiency_score"] * 0.3,
                1
            )
    
    results.sort(key=lambda x: x["value_score"], reverse=True)
    
    return {"models": results}
```

Verify: `python3 -c "import ast; ast.parse(open('backend/main.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Add Value Score section to Analytics.jsx

Add state and fetch:

```jsx
const [valueData, setValueData] = useState(null);

useEffect(() => {
  // ... existing fetches ...
  fetch('http://localhost:8001/api/analytics/value-score')
    .then(res => res.json())
    .then(data => setValueData(data))
    .catch(err => console.error('Value score error:', err));
}, []);
```

Add to render (at the TOP of analytics, as the hero section):

```jsx
{valueData && valueData.models.length > 0 && (
  <div className="analytics-section value-section">
    <h2>🏆 Model Value Rankings</h2>
    <p className="section-subtitle">
      Composite score: Quality (40%) + Speed (30%) + Cost Efficiency (30%)
    </p>
    
    <div className="value-podium">
      {valueData.models.slice(0, 3).map((item, i) => (
        <div key={i} className={`podium-item rank-${i + 1}`}>
          <div className="podium-rank">#{i + 1}</div>
          <div className="podium-model">{item.model.split('/')[1] || item.model}</div>
          <div className="podium-score">{item.value_score}</div>
          <div className="podium-breakdown">
            <span title="Quality">🎯 {item.quality_score}</span>
            <span title="Speed">⚡ {item.speed_score}</span>
            <span title="Efficiency">💰 {item.efficiency_score}</span>
          </div>
        </div>
      ))}
    </div>
    
    <table className="analytics-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Model</th>
          <th>Value Score</th>
          <th>Quality</th>
          <th>Speed</th>
          <th>Efficiency</th>
          <th>Avg Rank</th>
          <th>Avg Time</th>
          <th>$/Token</th>
        </tr>
      </thead>
      <tbody>
        {valueData.models.map((item, i) => (
          <tr key={i} className={i < 3 ? 'top-model' : ''}>
            <td>#{i + 1}</td>
            <td>{item.model.split('/')[1] || item.model}</td>
            <td><strong>{item.value_score}</strong></td>
            <td>{item.quality_score}</td>
            <td>{item.speed_score}</td>
            <td>{item.efficiency_score}</td>
            <td>{item.avg_rank}</td>
            <td>{item.avg_time}s</td>
            <td>{item.tokens_per_dollar.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

---

## STEP 3: Add CSS for Value Score section

Add to `Analytics.css`:

```css
.value-section {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
}

.section-subtitle {
  color: #94a3b8;
  font-size: 14px;
  margin-bottom: 24px;
}

.value-podium {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}

.podium-item {
  background: #334155;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  min-width: 180px;
}

.podium-item.rank-1 {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #000;
  transform: scale(1.1);
}

.podium-item.rank-2 {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  color: #000;
}

.podium-item.rank-3 {
  background: linear-gradient(135deg, #cd7c32 0%, #a85d1a 100%);
  color: #fff;
}

.podium-rank {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.podium-model {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.podium-score {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 12px;
}

.podium-breakdown {
  display: flex;
  gap: 12px;
  justify-content: center;
  font-size: 12px;
}

.top-model {
  background: rgba(251, 191, 36, 0.1);
}
```

---

## STEP 4: Restart backend and test

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/api/analytics/value-score | python3 -m json.tool | head -40
```

---

## Success Criteria
- [ ] /api/analytics/value-score endpoint returns data
- [ ] Podium shows top 3 models with scores
- [ ] Full table shows all models with breakdown
- [ ] Scores correctly weight Quality/Speed/Efficiency
