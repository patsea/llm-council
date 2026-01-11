# LLM Council Quality Score From Stage 2 Data

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Inspect Stage 2 data structure

```bash
cd ~/Dropbox/ALOMA/claude-code/llm-council
python3 << 'EOF'
import json
import os

# Get a recent conversation with stage2 data
for f in sorted(os.listdir('data/conversations/'), 
                key=lambda x: os.path.getmtime(f'data/conversations/{x}'), 
                reverse=True)[:5]:
    with open(f'data/conversations/{f}') as file:
        conv = json.load(file)
    for msg in conv.get('messages', []):
        if msg.get('role') == 'assistant' and msg.get('stage2'):
            print(f"File: {f}")
            print(f"Stage2 first entry keys: {msg['stage2'][0].keys()}")
            print(f"parsed_ranking sample: {msg['stage2'][0].get('parsed_ranking', [])[:4]}")
            break
    else:
        continue
    break
EOF
```

---

## STEP 2: Replace value-score ranking calculation in main.py

Find the `/api/analytics/value-score` endpoint (around line 653) and replace the entire function with this updated version that calculates rankings from stage2 data:

```python
@app.get("/api/analytics/value-score")
async def get_value_scores():
    """Calculate composite value score for each model.
    
    Value = (Quality × 0.4) + (Speed × 0.3) + (Cost Efficiency × 0.3)
    
    Quality = normalized inverse of avg peer ranking (lower rank = higher quality)
    Speed = normalized inverse of avg response time
    Cost Efficiency = tokens per dollar
    """
    from pathlib import Path
    from collections import defaultdict
    
    conversations_dir = Path("data/conversations")
    
    # Collect all rankings from stage2 parsed_ranking
    # Each model ranks all other models, giving them positions 1-N
    model_rankings = defaultdict(list)  # model -> [rank1, rank2, ...]
    model_stats = {}  # model -> {times: [], tokens: 0, cost: 0}
    
    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)
            
            for msg in conv.get("messages", []):
                if msg.get("role") != "assistant":
                    continue
                
                # Extract rankings from stage2 parsed_ranking
                # Each model in stage2 has a parsed_ranking list
                # The position in that list IS the rank (0=1st, 1=2nd, etc.)
                for s2 in msg.get("stage2", []):
                    parsed = s2.get("parsed_ranking", [])
                    for position, ranked_model in enumerate(parsed):
                        # ranked_model might be short name like "gpt-5.2-pro"
                        # We need to match it to full model paths
                        rank = position + 1  # Convert 0-indexed to 1-indexed
                        model_rankings[ranked_model].append(rank)
                
                # Get times, tokens, costs from all stages
                for r in msg.get("stage1", []) + msg.get("stage2", []):
                    model = r.get("model", "")
                    if not model:
                        continue
                    if model not in model_stats:
                        model_stats[model] = {"times": [], "tokens": 0, "cost": 0}
                    
                    if r.get("response_time", 0) > 0:
                        model_stats[model]["times"].append(r["response_time"])
                    model_stats[model]["tokens"] += r.get("tokens_prompt", 0) + r.get("tokens_completion", 0)
                    model_stats[model]["cost"] += r.get("cost", 0)
                
                # Stage 3
                stage3 = msg.get("stage3", {})
                model = stage3.get("model", "")
                if model:
                    if model not in model_stats:
                        model_stats[model] = {"times": [], "tokens": 0, "cost": 0}
                    if stage3.get("response_time", 0) > 0:
                        model_stats[model]["times"].append(stage3["response_time"])
                    model_stats[model]["tokens"] += stage3.get("tokens_prompt", 0) + stage3.get("tokens_completion", 0)
                    model_stats[model]["cost"] += stage3.get("cost", 0)
                    
        except Exception:
            continue
    
    # Match short names to full model paths for ranking lookup
    def get_avg_rank(full_model):
        short_name = full_model.split('/')[-1] if '/' in full_model else full_model
        # Try exact match first
        if full_model in model_rankings and model_rankings[full_model]:
            return sum(model_rankings[full_model]) / len(model_rankings[full_model])
        # Try short name match
        if short_name in model_rankings and model_rankings[short_name]:
            return sum(model_rankings[short_name]) / len(model_rankings[short_name])
        return 5  # Default to worst rank if no data
    
    # Calculate scores
    results = []
    for model, stats in model_stats.items():
        if not stats["times"] and stats["tokens"] == 0:
            continue
        
        avg_rank = get_avg_rank(model)
        avg_time = sum(stats["times"]) / len(stats["times"]) if stats["times"] else 30
        tokens_per_dollar = stats["tokens"] / stats["cost"] if stats["cost"] > 0 else 0
        
        # Normalize scores (0-100)
        # Quality: rank 1 = 100, rank 5 = 0  (assuming max 5 models)
        num_models = 4  # Typical council size
        quality_score = max(0, (num_models - avg_rank + 1) / num_models * 100)
        # Speed: faster is better, assume 1s = 100, 30s = 0
        speed_score = max(0, min(100, (30 - avg_time) / 29 * 100))
        
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

## STEP 3: Restart backend and test

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/api/analytics/value-score | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('Model Value Rankings:')
for m in d['models'][:5]:
    print(f\"  {m['model'].split('/')[-1]}: quality={m['quality_score']}, speed={m['speed_score']}, value={m['value_score']}\")"
```

Quality scores should now be non-zero!

---

## STEP 4: Hard refresh and verify

1. Hard refresh: Cmd+Shift+R
2. Go to Analytics page
3. Check Model Value Rankings - Quality column should show values > 0
4. Rankings should reflect actual peer evaluation performance

---

## Success Criteria
- [ ] Quality scores are non-zero (calculated from stage2 parsed_ranking)
- [ ] Value scores update to reflect quality component
- [ ] Model rankings make sense (models that won more peer rankings score higher)
