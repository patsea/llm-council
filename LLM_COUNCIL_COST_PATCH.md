# LLM Council Cost Tracking Patch

Before executing, read best practices from: ~/Dropbox/ALOMA/claude-code/CLAUDE_CODE_UNIVERSAL_BEST_PRACTICES.md

**Execute from**: `~/Dropbox/ALOMA/claude-code/llm-council`

## ⛔ RULES
- Execute EVERY step in order
- Do NOT create files not listed here
- Do NOT improvise

---

## STEP 1: Replace backend/openrouter.py with cost capture

```bash
cat > backend/openrouter.py << 'EOF'
"""OpenRouter API client for making LLM requests."""

import httpx
from typing import List, Dict, Any, Optional
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """Query a single model via OpenRouter API."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"model": model, "messages": messages}

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            message = data['choices'][0]['message']
            usage = data.get('usage', {})
            
            # Get cost from header (returns credits used as string)
            cost_str = response.headers.get('x-openrouter-credits-used', '0')
            try:
                cost = float(cost_str)
            except (ValueError, TypeError):
                cost = 0.0
            
            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details'),
                'cost': cost,
                'tokens_prompt': usage.get('prompt_tokens', 0),
                'tokens_completion': usage.get('completion_tokens', 0),
            }
    except httpx.HTTPStatusError as e:
        print(f"Error querying model {model}: {e}")
        raise
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Any]:
    """Query multiple models in parallel, tracking successes, errors, and costs."""
    import asyncio

    async def query_with_error(model: str):
        try:
            result = await query_model(model, messages)
            if result is None:
                return {"model": model, "success": False, "error": "Empty response", "cost": 0}
            return {"model": model, "success": True, "response": result, "cost": result.get('cost', 0)}
        except httpx.HTTPStatusError as e:
            error_msg = f"{e.response.status_code} {e.response.reason_phrase}"
            return {"model": model, "success": False, "error": error_msg, "cost": 0}
        except Exception as e:
            return {"model": model, "success": False, "error": str(e), "cost": 0}

    tasks = [query_with_error(model) for model in models]
    results = await asyncio.gather(*tasks)
    
    responses = {}
    errors = []
    total_cost = 0
    
    for r in results:
        total_cost += r.get("cost", 0)
        if r["success"]:
            responses[r["model"]] = r["response"]
        else:
            errors.append({"model": r["model"], "error": r["error"]})
    
    return {"responses": responses, "errors": errors, "total_cost": total_cost}
EOF
```

Verify: `python3 -c "import ast; ast.parse(open('backend/openrouter.py').read())" && echo "✅ Syntax OK"`

---

## STEP 2: Restart backend

```bash
kill $(lsof -t -i:8001) 2>/dev/null || true
cd ~/Dropbox/ALOMA/claude-code/llm-council
uv run python -m backend.main > /tmp/llm-council-backend.log 2>&1 &
sleep 3
curl -s http://localhost:8001/ && echo ""
```

---

## STEP 3: Verify cost is captured

Run a test query, then check logs:

```bash
cat /tmp/llm-council-backend.log | tail -20
```

Cost data now available in responses. Frontend display can be added separately.

---

## Success Criteria
- [ ] `x-openrouter-credits-used` header captured as `cost` field
- [ ] `total_cost` returned from `query_models_parallel`
- [ ] Backend restarts without errors
