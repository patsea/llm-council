"""OpenRouter API client for making LLM requests."""

import httpx
import time
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
        start_time = time.time()
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            elapsed = time.time() - start_time
            data = response.json()
            message = data['choices'][0]['message']
            usage = data.get('usage', {})

            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details'),
                'cost': usage.get('cost', 0),
                'tokens_prompt': usage.get('prompt_tokens', 0),
                'tokens_completion': usage.get('completion_tokens', 0),
                'response_time': round(elapsed, 2),
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
