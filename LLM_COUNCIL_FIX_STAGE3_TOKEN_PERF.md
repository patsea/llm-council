# LLM Council Stage 3: Token & Performance Analytics

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Add token and performance endpoint to backend

Add to `backend/main.py`:

```python
@app.get("/api/analytics/performance")
async def get_performance_analytics():
    """Get token and performance analytics across all conversations."""
    import os
    from pathlib import Path
    
    conversations_dir = Path("data/conversations")
    
    total_tokens = 0
    tokens_by_model = {}
    response_times = {}
    errors_by_model = {}
    
    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)
            
            for msg in conv.get("messages", []):
                if msg.get("role") == "assistant":
                    # Stage 1
                    for r in msg.get("stage1", []):
                        model = r.get("model", "unknown")
                        prompt = r.get("tokens_prompt", 0)
                        completion = r.get("tokens_completion", 0)
                        time = r.get("response_time", 0)
                        
                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion
                        
                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)
                    
                    # Stage 2
                    for r in msg.get("stage2", []):
                        model = r.get("model", "unknown")
                        prompt = r.get("tokens_prompt", 0)
                        completion = r.get("tokens_completion", 0)
                        time = r.get("response_time", 0)
                        
                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion
                        
                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)
                    
                    # Stage 3
                    stage3 = msg.get("stage3", {})
                    model = stage3.get("model", "unknown")
                    prompt = stage3.get("tokens_prompt", 0)
                    completion = stage3.get("tokens_completion", 0)
                    time = stage3.get("response_time", 0)
                    
                    if model != "unknown":
                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion
                        
                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)
                    
                    # Errors
                    for err in msg.get("metadata", {}).get("stage1_errors", []):
                        model = err.get("model", "unknown")
                        if model not in errors_by_model:
                            errors_by_model[model] = 0
                        errors_by_model[model] += 1
                        
        except Exception:
            continue
    
    # Calculate averages
    avg_response_times = []
    for model, times in response_times.items():
        avg_response_times.append({
            "model": model,
            "avg_time": round(sum(times) / len(times), 2),
            "min_time": round(min(times), 2),
            "max_time": round(max(times), 2),
            "count": len(times)
        })
    avg_response_times.sort(key=lambda x: x["avg_time"])
    
    # Sort tokens by total
    tokens_sorted = sorted(tokens_by_model.items(), key=lambda x: x[1]["total"], reverse=True)
    
    return {
        "total_tokens": total_tokens,
        "tokens_by_model": [{"model": m, **t} for m, t in tokens_sorted],
        "response_times": avg_response_times,
        "errors_by_model": [{"model": m, "count": c} for m, c in sorted(errors_by_model.items(), key=lambda x: x[1], reverse=True)],
        "total_errors": sum(errors_by_model.values())
    }
```

Verify: `python3 -c "import ast; ast.parse(open('backend/main.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Add Token & Performance section to Analytics.jsx

Add state and fetch:

```jsx
const [perfData, setPerfData] = useState(null);

useEffect(() => {
  // ... existing fetches ...
  fetch('http://localhost:8001/api/analytics/performance')
    .then(res => res.json())
    .then(data => setPerfData(data))
    .catch(err => console.error('Performance analytics error:', err));
}, []);
```

Add to render:

```jsx
{perfData && (
  <>
    <div className="analytics-section">
      <h2>📊 Token Analytics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{perfData.total_tokens.toLocaleString()}</div>
          <div className="stat-label">Total Tokens</div>
        </div>
      </div>
      
      <h3>Tokens by Model</h3>
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Input</th>
            <th>Output</th>
            <th>Total</th>
            <th>Ratio (In/Out)</th>
          </tr>
        </thead>
        <tbody>
          {perfData.tokens_by_model.map((item, i) => (
            <tr key={i}>
              <td>{item.model.split('/')[1] || item.model}</td>
              <td>{item.prompt.toLocaleString()}</td>
              <td>{item.completion.toLocaleString()}</td>
              <td>{item.total.toLocaleString()}</td>
              <td>{item.completion > 0 ? (item.prompt / item.completion).toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    <div className="analytics-section">
      <h2>⚡ Response Times</h2>
      
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Model</th>
            <th>Avg Time</th>
            <th>Min</th>
            <th>Max</th>
            <th>Samples</th>
          </tr>
        </thead>
        <tbody>
          {perfData.response_times.map((item, i) => (
            <tr key={i}>
              <td>#{i + 1}</td>
              <td>{item.model.split('/')[1] || item.model}</td>
              <td>{item.avg_time}s</td>
              <td>{item.min_time}s</td>
              <td>{item.max_time}s</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {perfData.total_errors > 0 && (
      <div className="analytics-section">
        <h2>⚠️ Errors ({perfData.total_errors})</h2>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Error Count</th>
            </tr>
          </thead>
          <tbody>
            {perfData.errors_by_model.map((item, i) => (
              <tr key={i}>
                <td>{item.model}</td>
                <td>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
)}
```

---

## STEP 3: Restart backend and test

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/api/analytics/performance | python3 -m json.tool | head -40
```

---

## Success Criteria
- [ ] /api/analytics/performance endpoint returns data
- [ ] Token Analytics section shows total and per-model breakdown
- [ ] Response Times table shows fastest to slowest
- [ ] Errors section appears if any errors recorded
