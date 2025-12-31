# LLM Council Bug Fixes - Claude Code Instructions

**Date**: December 29, 2025  
**Project**: `~/Dropbox/aloma/claude-code/llm-council`

---

## Summary of Issues to Fix

1. **NavBar** - Remove nested dropdown, rename "Settings" to "Model Selection" as direct link
2. **Model Configuration page not scrollable** - Can't see Chairman Model section
3. **Chairman Model not configurable** - UI exists but doesn't work
4. **Dynamic models from OpenRouter API** - Replace hardcoded models with live API data
5. **Model dropdown enhancements** - Show pricing and context size in dropdown
6. **Model validation mismatch** - Validation uses hardcoded list instead of OpenRouter API
7. **Analytics page not scrollable** - Can't scroll to bottom
8. **Default config persistence** - Use last saved config as default
9. **Move Search Conversations** - Move from bottom of Analytics to top of Chat page
10. **Error Handling & Recovery** - Retry logic, rate limits, timeouts, model unavailability, Stage 3 retry

---

## Issue 1: Simplify NavBar

### Current State
- Settings is a dropdown with "Model Configuration" submenu
- Unnecessary nesting

### Required Change
**File**: `frontend/src/components/NavBar.jsx`

Replace the Settings dropdown with a direct "Model Selection" link:

```jsx
// REMOVE: Dropdown menu for Settings
// REPLACE WITH: Simple NavLink

<NavLink to="/config">Model Selection</NavLink>
```

The NavBar should have three simple links: **Chat** | **Model Selection** | **Analytics**

---

## Issue 2 & 5: Make Pages Scrollable

### Problem
Both Model Configuration (`/config`) and Analytics (`/analytics`) pages cannot scroll to see content below the fold.

### Root Cause
Likely missing `overflow-y: auto` or `height: 100%` on container elements.

### Required Changes

**File**: `frontend/src/pages/ModelConfig.jsx` (or wherever the page component is)

Ensure the main container has:
```css
min-height: 100vh;
overflow-y: auto;
padding-bottom: 2rem; /* Space at bottom */
```

Or in Tailwind:
```jsx
<div className="min-h-screen overflow-y-auto pb-8">
```

**File**: `frontend/src/pages/Analytics.jsx`

Apply same fix - ensure scrollable container.

**File**: `frontend/src/index.css` or `App.css`

Check if there's a global style blocking scroll:
```css
/* REMOVE or modify if present: */
body { overflow: hidden; }
html { overflow: hidden; }
```

---

## Issue 3: Make Chairman Model Configurable

### Current State
The Chairman Model section exists in UI but the "Set Chairman" button likely doesn't work or the state isn't connected.

### Required Changes

**File**: `frontend/src/components/ModelConfig.jsx`

Ensure the Chairman section:
1. Has its own provider/model dropdowns (separate from council dropdowns)
2. Has state: `chairmanProvider`, `chairmanModel`
3. "Set Chairman" button calls the API to update config
4. Displays current chairman model

Example structure:
```jsx
// State
const [chairmanProvider, setChairmanProvider] = useState('');
const [chairmanModel, setChairmanModel] = useState('');
const [currentChairman, setCurrentChairman] = useState(null);

// Load current chairman from config
useEffect(() => {
  // When config loads, set currentChairman
  if (config?.chairman_model) {
    setCurrentChairman(config.chairman_model);
  }
}, [config]);

// Set Chairman handler
const handleSetChairman = async () => {
  if (!chairmanModel) return;
  
  const newConfig = {
    council_models: councilMembers.map(m => m.id),
    chairman_model: chairmanModel
  };
  
  await api.updateModelConfig(newConfig);
  setCurrentChairman(chairmanModel);
};
```

---

## Issue 4: Dynamic Models from OpenRouter API

### Current State
Models are hardcoded in `backend/config.py` as `AVAILABLE_MODELS` dict.

### Required Changes

### Backend Changes

**File**: `backend/config.py`

Add function to fetch models from OpenRouter (includes pricing and context size):

```python
import httpx
from functools import lru_cache
from datetime import datetime, timedelta

# Cache models for 1 hour
_models_cache = None
_models_cache_time = None
CACHE_DURATION = timedelta(hours=1)

async def fetch_openrouter_models() -> Dict[str, List[Dict]]:
    """Fetch available models from OpenRouter API."""
    global _models_cache, _models_cache_time
    
    # Return cached if valid
    if _models_cache and _models_cache_time:
        if datetime.now() - _models_cache_time < CACHE_DURATION:
            return _models_cache
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
            )
            response.raise_for_status()
            data = response.json()
        
        # Group models by provider
        models_by_provider = {}
        for model in data.get("data", []):
            model_id = model.get("id", "")
            name = model.get("name", model_id)
            
            # Extract provider from model ID (e.g., "openai/gpt-4" -> "OpenAI")
            provider = model_id.split("/")[0] if "/" in model_id else "Other"
            provider_display = provider.replace("-", " ").title()
            
            if provider_display not in models_by_provider:
                models_by_provider[provider_display] = []
            
            models_by_provider[provider_display].append({
                "id": model_id,
                "name": name,
                "context_length": model.get("context_length"),
                "pricing": model.get("pricing", {})
            })
        
        # Sort providers and models
        for provider in models_by_provider:
            models_by_provider[provider].sort(key=lambda x: x["name"])
        
        _models_cache = dict(sorted(models_by_provider.items()))
        _models_cache_time = datetime.now()
        
        return _models_cache
        
    except Exception as e:
        print(f"Error fetching OpenRouter models: {e}")
        # Fall back to hardcoded models
        return AVAILABLE_MODELS
```

**File**: `backend/main.py`

Update the `/api/models/available` endpoint:

```python
@app.get("/api/models/available")
async def get_available_models():
    """Get all available models from OpenRouter API."""
    try:
        models = await config.fetch_openrouter_models()
        return models
    except Exception as e:
        # Fallback to hardcoded
        return config.AVAILABLE_MODELS
```

### Frontend Changes

**File**: `frontend/src/api.js`

Ensure `getAvailableModels()` handles the new response format (should already work if structure is same).

**File**: `frontend/src/components/ModelConfig.jsx`

Update the Model dropdown to display pricing and context size:

```jsx
// Model dropdown with pricing and context info
<select 
  value={selectedModel} 
  onChange={(e) => setSelectedModel(e.target.value)}
  className="..."
>
  <option value="">Select Model</option>
  {models.map((model) => (
    <option key={model.id} value={model.id}>
      {model.name} • {formatContextSize(model.context_length)} • {formatPricing(model.pricing)}
    </option>
  ))}
</select>

// Helper functions (add to component or utils file)
const formatContextSize = (contextLength) => {
  if (!contextLength) return '?k ctx';
  if (contextLength >= 1000000) {
    return `${(contextLength / 1000000).toFixed(1)}M ctx`;
  }
  return `${Math.round(contextLength / 1000)}k ctx`;
};

const formatPricing = (pricing) => {
  if (!pricing) return 'Price N/A';
  
  // OpenRouter returns pricing per token in USD
  // prompt = input price, completion = output price
  const inputPrice = parseFloat(pricing.prompt || 0);
  const outputPrice = parseFloat(pricing.completion || 0);
  
  if (inputPrice === 0 && outputPrice === 0) {
    return 'Free';
  }
  
  // Convert to price per 1M tokens for readability
  const inputPer1M = (inputPrice * 1000000).toFixed(2);
  const outputPer1M = (outputPrice * 1000000).toFixed(2);
  
  return `$${inputPer1M}/$${outputPer1M} per 1M`;
};
```

**Alternative: Rich dropdown with separate columns**

For better readability, consider a custom dropdown or table layout:

```jsx
// Custom model selector with columns
<div className="model-selector">
  {models.map((model) => (
    <div 
      key={model.id}
      onClick={() => setSelectedModel(model.id)}
      className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
    >
      <span className="model-name">{model.name}</span>
      <span className="model-context text-gray-400 text-sm">
        {formatContextSize(model.context_length)}
      </span>
      <span className="model-price text-green-400 text-sm">
        {formatPricing(model.pricing)}
      </span>
    </div>
  ))}
</div>
```

**CSS for custom dropdown:**

```css
.model-option {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #333;
}

.model-option:hover {
  background: #2a2a2a;
}

.model-option.selected {
  background: #1e40af;
}
```

### Dependencies

**File**: `backend/pyproject.toml`

Add httpx if not present:
```toml
dependencies = [
    "httpx>=0.25.0",
    # ... other deps
]
```

Then run: `uv sync`

---

## Issue 6: Fix Model Validation Mismatch

### Problem
The `/api/models/available` endpoint now fetches models dynamically from OpenRouter, but the PUT `/api/models/config` endpoint validates against the **hardcoded** `AVAILABLE_MODELS` in `config.py`. This causes 400 errors when saving models that exist in OpenRouter but not in the hardcoded list.

**Error example:**
```
{"detail": "Invalid chairman model: anthropic/claude-opus-4.5"}
```

### Required Changes

**File**: `backend/main.py`

Update the `update_model_config` endpoint to validate against OpenRouter's live model list:

```python
@app.put("/api/models/config")
async def update_model_config(request: ModelConfigRequest):
    """Update model configuration."""
    # Get models from OpenRouter (same source as dropdown)
    try:
        available = await config.fetch_openrouter_models()
    except Exception:
        # Fallback to hardcoded if API fails
        available = config.AVAILABLE_MODELS
    
    # Build list of valid model IDs
    all_models = []
    for provider_models in available.values():
        all_models.extend([m["id"] for m in provider_models])
    
    # Validate council models
    for model in request.council_models:
        if model not in all_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")
    
    # Validate chairman model
    if request.chairman_model not in all_models:
        raise HTTPException(status_code=400, detail=f"Invalid chairman model: {request.chairman_model}")
    
    # Save configuration
    new_config = {
        "council_models": request.council_models,
        "chairman_model": request.chairman_model
    }
    config.save_model_config(new_config)
    
    return {"status": "success", "config": new_config}
```

**Key change:** Replace `config.AVAILABLE_MODELS` with `await config.fetch_openrouter_models()` so validation uses the same live data as the frontend dropdown.

---

## Issue 8: Default Config Persistence and Recommended Defaults

### Current State
Default models are hardcoded in `config.py`. If `model_config.json` doesn't exist, it uses hardcoded defaults.

### Recommended Default Models (December 2025)

Based on current benchmarks, update `DEFAULT_COUNCIL_MODELS` and `DEFAULT_CHAIRMAN_MODEL` in `config.py`:

```python
# Recommended defaults based on Dec 2025 benchmarks
DEFAULT_COUNCIL_MODELS = [
    "anthropic/claude-sonnet-4.5",    # Best writing/coding (77.2% SWE-bench)
    "google/gemini-2.5-pro",          # Top reasoning (1501 Elo), 1M context
    "openai/o1",                      # Strong reasoning, adaptive thinking
    "x-ai/grok-3",                    # Different training data, real-time info
]

# Chairman: Best at synthesis and natural writing
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"  # Or claude-3-opus if 3.5 unavailable
```

**Note:** Model IDs must match exactly what OpenRouter returns. Check available models:
```bash
curl https://openrouter.ai/api/v1/models | jq '.data[].id' | grep -E "claude|gemini|grok|o1"
```

### Required Changes

**File**: `backend/config.py`

The current implementation already loads from `data/model_config.json` if it exists. Ensure:

1. Config is saved whenever user makes changes
2. Config file persists between restarts
3. Initial load uses saved config

Add validation to ensure saved config models still exist:

```python
def load_model_config() -> Dict[str, Any]:
    """Load model configuration from file or return defaults."""
    ensure_config_dir()
    
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                
                # Validate config has required fields
                if "council_models" in config and "chairman_model" in config:
                    # Verify models are non-empty lists/strings
                    if config["council_models"] and config["chairman_model"]:
                        return config
        except Exception as e:
            print(f"Error loading config: {e}")
    
    # Return default configuration and save it
    default_config = {
        "council_models": DEFAULT_COUNCIL_MODELS,
        "chairman_model": DEFAULT_CHAIRMAN_MODEL
    }
    save_model_config(default_config)
    return default_config
```

**File**: `frontend/src/components/ModelConfig.jsx`

On save, ensure the API call updates the persisted config:

```javascript
const handleSaveConfig = async () => {
  const newConfig = {
    council_models: councilMembers.map(m => m.id),
    chairman_model: currentChairman
  };
  
  try {
    await api.updateModelConfig(newConfig);
    setSuccess('Configuration saved!');
  } catch (err) {
    setError('Failed to save configuration');
  }
};
```

---

## Issue 9: Move Search Conversations to Chat Page

### Current State
The "Search Conversations" box is at the bottom of the Analytics page. It makes more sense on the Chat page where users are actively working with conversations.

### Required Changes

**File**: `frontend/src/pages/Analytics.jsx`

Remove the Search Conversations section entirely from this page:

```jsx
// REMOVE this entire section from Analytics.jsx:
// <div className="search-section">
//   <h2>Search Conversations</h2>
//   <input ... />
//   <button>Search</button>
//   {results...}
// </div>
```

**File**: `frontend/src/pages/Chat.jsx` (or main chat component)

Add Search Conversations at the top of the chat page, above the conversation list or chat area:

```jsx
import { useState } from 'react';
import api from '../api';

// Add to Chat component
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);

const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  
  setIsSearching(true);
  try {
    const results = await api.searchConversations(searchQuery);
    setSearchResults(results.results || []);
  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    setIsSearching(false);
  }
};

// In the JSX, add at the top of the chat page:
<div className="search-conversations mb-4">
  <div className="flex gap-2">
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      placeholder="Search conversations by title or content..."
      className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
    />
    <button
      onClick={handleSearch}
      disabled={isSearching}
      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
    >
      {isSearching ? 'Searching...' : 'Search'}
    </button>
  </div>
  
  {searchResults.length > 0 && (
    <div className="search-results mt-2 bg-gray-800 rounded p-2">
      {searchResults.map((result) => (
        <div
          key={result.id}
          onClick={() => loadConversation(result.id)}
          className="p-2 hover:bg-gray-700 rounded cursor-pointer"
        >
          <div className="font-medium">{result.title}</div>
          <div className="text-sm text-gray-400">
            {result.message_count} messages • {result.match_location}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

### Layout Suggestion

The Chat page should now have this structure:
1. **Search bar** (top) - Search past conversations
2. **Conversation list** (sidebar or top) - Recent/selected conversations  
3. **Chat area** (main) - Current conversation with council

---

## Issue 10: Error Handling & Recovery

### CRITICAL: Invalid Chairman Model Bug

**Current Problem:** The chairman model `anthropic/claude-opus-4.5` was set via the web UI but **does not exist** in OpenRouter. This causes Stage 3 to fail with "Error: Unable to generate final synthesis."

**Root Cause Analysis (from actual code):**

1. **`council.py` line 107-112** - No fallback when chairman fails:
```python
if response is None:
    return {
        "model": chairman_model,
        "response": "Error: Unable to generate final synthesis."  # Just gives up!
    }
```

2. **`config.py` AVAILABLE_MODELS** - Contains invalid model IDs like `anthropic/claude-opus-4` that don't exist in OpenRouter

3. **Validation gap** - `main.py` likely validates against hardcoded `AVAILABLE_MODELS` instead of OpenRouter API

**Immediate Fix** (run this now to fix your broken chairman):
```bash
curl -X PUT http://localhost:8001/api/models/config \
  -H "Content-Type: application/json" \
  -d '{"council_models": ["anthropic/claude-sonnet-4.5", "x-ai/grok-4", "mistralai/pixtral-large-2411", "google/gemini-3-pro-preview", "deepseek/deepseek-v3.2-speciale", "openai/gpt-4o:extended"], "chairman_model": "anthropic/claude-3-opus"}'
```

### Verify OpenRouter Model IDs

Before using any model, verify it exists in OpenRouter:

```bash
# List all Anthropic models available in OpenRouter
curl https://openrouter.ai/api/v1/models | jq '.data[] | select(.id | startswith("anthropic")) | .id'

# Expected valid Anthropic models (December 2025):
# "anthropic/claude-3-opus"
# "anthropic/claude-3-sonnet" 
# "anthropic/claude-3-haiku"
# "anthropic/claude-3.5-sonnet"
# "anthropic/claude-3.5-haiku"
# NOT: "anthropic/claude-opus-4.5" (doesn't exist)
# NOT: "anthropic/claude-opus-4" (doesn't exist)
```

---

### Problem
Currently, if Stage 3 (Chairman synthesis) fails, the user sees "Error: Unable to generate final synthesis" with no recovery option. The entire council process is lost and must be restarted.

**Error scenarios to handle:**
1. **Invalid model ID** - Model doesn't exist in OpenRouter (e.g., `claude-opus-4.5` vs `claude-3-opus`)
2. **Rate limiting** - OpenRouter returns 429 Too Many Requests
3. **Timeout** - Model takes too long to respond
4. **Model unavailable** - Model temporarily down or deprecated
5. **Context too long** - Input exceeds model's context window

### Required Changes

#### 1. Backend: Retry Logic with Exponential Backoff

**File**: `backend/council.py`

Add a retry wrapper for API calls:

```python
import asyncio
from typing import Optional
import httpx

class OpenRouterError(Exception):
    """Custom exception for OpenRouter API errors."""
    def __init__(self, message: str, error_type: str, status_code: int = None):
        self.message = message
        self.error_type = error_type  # 'rate_limit', 'timeout', 'model_unavailable', 'context_too_long', 'invalid_model'
        self.status_code = status_code
        super().__init__(message)


async def call_openrouter_with_retry(
    model: str,
    messages: list,
    max_retries: int = 3,
    initial_delay: float = 1.0
) -> dict:
    """Call OpenRouter API with retry logic and error handling."""
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    config.OPENROUTER_API_URL,
                    headers={
                        "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5173",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                    }
                )
                
                # Handle specific error codes
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise OpenRouterError(
                        f"Rate limited. Retry after {retry_after}s",
                        "rate_limit",
                        429
                    )
                
                if response.status_code == 400:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Bad request")
                    
                    if "model" in error_msg.lower() or "not found" in error_msg.lower():
                        raise OpenRouterError(
                            f"Model '{model}' not found or unavailable",
                            "invalid_model",
                            400
                        )
                    
                    if "context" in error_msg.lower() or "token" in error_msg.lower():
                        raise OpenRouterError(
                            f"Context too long for model '{model}'",
                            "context_too_long",
                            400
                        )
                    
                    raise OpenRouterError(error_msg, "bad_request", 400)
                
                if response.status_code == 503:
                    raise OpenRouterError(
                        f"Model '{model}' temporarily unavailable",
                        "model_unavailable",
                        503
                    )
                
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            last_error = OpenRouterError(
                f"Request to '{model}' timed out after 120s",
                "timeout"
            )
        except OpenRouterError as e:
            # Don't retry invalid model errors
            if e.error_type == "invalid_model":
                raise
            last_error = e
        except Exception as e:
            last_error = OpenRouterError(str(e), "unknown")
        
        # Exponential backoff before retry
        if attempt < max_retries - 1:
            delay = initial_delay * (2 ** attempt)
            print(f"Retry {attempt + 1}/{max_retries} after {delay}s: {last_error}")
            await asyncio.sleep(delay)
    
    raise last_error or OpenRouterError("Max retries exceeded", "max_retries")
```

#### 2. Backend: Chairman Fallback Models

**File**: `backend/config.py`

Add fallback chairman list after the `DEFAULT_CHAIRMAN_MODEL` line:

```python
# Default chairman model - synthesizes final response
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"

# Fallback chairman models if primary fails (in order of preference)
FALLBACK_CHAIRMAN_MODELS = [
    "anthropic/claude-3-opus",
    "anthropic/claude-3.5-sonnet", 
    "openai/gpt-4-turbo",
    "google/gemini-pro",
]
```

Also fix the hardcoded `AVAILABLE_MODELS` to use **valid** OpenRouter IDs:

```python
# IMPORTANT: These must match actual OpenRouter model IDs
# This is only used as fallback when OpenRouter API is unavailable
AVAILABLE_MODELS = {
    "OpenAI": [
        {"id": "openai/o1", "name": "O1"},
        {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo"},
        {"id": "openai/gpt-4o", "name": "GPT-4o"},
        {"id": "openai/gpt-4", "name": "GPT-4"},
    ],
    "Anthropic": [
        {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus"},
        {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
        {"id": "anthropic/claude-3-sonnet", "name": "Claude 3 Sonnet"},
        {"id": "anthropic/claude-3-haiku", "name": "Claude 3 Haiku"},
    ],
    # ... update other providers similarly
}
```

**File**: `backend/council.py`

Replace the `stage3_synthesize_final` function (around line 88-119) with fallback support:

```python
async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Stage 3: Chairman synthesizes final response with fallback support.
    """
    # Build comprehensive context for chairman
    stage1_text = "\n\n".join([
        f"Model: {result['model']}\nResponse: {result['response']}"
        for result in stage1_results
    ])

    stage2_text = "\n\n".join([
        f"Model: {result['model']}\nRanking: {result['ranking']}"
        for result in stage2_results
    ])

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}

STAGE 2 - Peer Rankings:
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Get primary chairman and build fallback list
    primary_chairman = config.get_chairman_model()
    models_to_try = [primary_chairman] + getattr(config, 'FALLBACK_CHAIRMAN_MODELS', [])
    
    # Remove duplicates while preserving order
    models_to_try = list(dict.fromkeys(models_to_try))
    
    last_error = None
    
    for model in models_to_try:
        try:
            response = await query_model(model, messages)
            
            if response is not None:
                return {
                    "model": model,
                    "response": response.get('content', ''),
                    "used_fallback": model != primary_chairman
                }
        except Exception as e:
            print(f"Chairman {model} failed: {e}")
            last_error = str(e)
            continue
    
    # All models failed
    error_msg = f"All chairman models failed. Last error: {last_error or 'Unknown'}"
    return {
        "model": primary_chairman,
        "response": f"Error: {error_msg}",
        "error": True,
        "error_type": "all_chairmen_failed",
        "error_message": error_msg
    }
```

#### 3. Backend: Retry Stage 3 Endpoint

**File**: `backend/main.py`

Add endpoint to retry just Stage 3:

```python
@app.post("/api/conversations/{conversation_id}/retry-stage3")
async def retry_stage3(conversation_id: str):
    """Retry Stage 3 synthesis for a conversation that failed."""
    
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Find the last assistant message
    last_message = None
    for msg in reversed(conversation["messages"]):
        if msg["role"] == "assistant":
            last_message = msg
            break
    
    if not last_message:
        raise HTTPException(status_code=400, detail="No assistant message found")
    
    if "stage1" not in last_message or "stage2" not in last_message:
        raise HTTPException(status_code=400, detail="Stage 1 or 2 data missing")
    
    # Check if stage3 actually failed
    stage3 = last_message.get("stage3", {})
    if not stage3.get("error") and "Error:" not in stage3.get("response", ""):
        raise HTTPException(status_code=400, detail="Stage 3 did not fail")
    
    # Get the original user question
    user_message = None
    for msg in conversation["messages"]:
        if msg["role"] == "user":
            user_message = msg["content"]
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Original question not found")
    
    # Retry Stage 3
    stage3_result = await stage3_synthesize_final(
        user_message,
        last_message["stage1"],
        last_message["stage2"]
    )
    
    # Update the conversation
    storage.update_stage3(conversation_id, stage3_result)
    
    return {
        "status": "success" if not stage3_result.get("error") else "failed",
        "stage3": stage3_result
    }
```

**File**: `backend/storage.py`

Add function to update Stage 3:

```python
def update_stage3(conversation_id: str, stage3_result: dict):
    """Update Stage 3 result in the last assistant message."""
    conversation = get_conversation(conversation_id)
    if not conversation:
        return False
    
    # Find and update the last assistant message
    for msg in reversed(conversation["messages"]):
        if msg["role"] == "assistant":
            msg["stage3"] = stage3_result
            break
    
    # Save
    save_conversation(conversation)
    return True
```

#### 4. Frontend: Retry Button for Stage 3

**File**: `frontend/src/components/CouncilResponse.jsx` (or wherever Stage 3 is rendered)

Add retry button when Stage 3 fails:

```jsx
import { useState } from 'react';
import api from '../api';

const Stage3Section = ({ conversationId, stage3, onRetrySuccess }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  
  const hasError = stage3?.error || stage3?.response?.startsWith('Error:');
  
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);
    
    try {
      const result = await api.retryStage3(conversationId);
      if (result.status === 'success') {
        onRetrySuccess(result.stage3);
      } else {
        setRetryError(result.stage3?.error_message || 'Retry failed');
      }
    } catch (err) {
      setRetryError(err.message || 'Failed to retry');
    } finally {
      setIsRetrying(false);
    }
  };
  
  return (
    <div className="stage3-section">
      <h3>Stage 3: Final Council Answer</h3>
      <div className="chairman-info text-gray-400 text-sm mb-2">
        Chairman: {stage3?.model}
        {stage3?.used_fallback && (
          <span className="ml-2 text-yellow-500">(fallback model used)</span>
        )}
      </div>
      
      {hasError ? (
        <div className="error-container">
          <div className="error-message bg-red-900/50 border border-red-500 rounded p-4 mb-4">
            <p className="text-red-400">{stage3?.response || stage3?.error_message}</p>
            {stage3?.error_type && (
              <p className="text-red-300 text-sm mt-1">
                Error type: {stage3.error_type}
              </p>
            )}
          </div>
          
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-white flex items-center gap-2"
          >
            {isRetrying ? (
              <>
                <span className="animate-spin">⟳</span>
                Retrying...
              </>
            ) : (
              <>
                ↻ Retry Synthesis
              </>
            )}
          </button>
          
          {retryError && (
            <p className="text-red-400 mt-2">{retryError}</p>
          )}
        </div>
      ) : (
        <div className="response prose prose-invert">
          {stage3?.response}
        </div>
      )}
    </div>
  );
};

export default Stage3Section;
```

#### 5. Frontend: API Method for Retry

**File**: `frontend/src/api.js`

Add retry method:

```javascript
async retryStage3(conversationId) {
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/retry-stage3`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to retry Stage 3');
  }
  
  return response.json();
},
```

#### 6. Better Error Messages in UI

**File**: `frontend/src/components/CouncilResponse.jsx`

Map error types to user-friendly messages:

```javascript
const getErrorMessage = (errorType, errorMessage) => {
  const messages = {
    'rate_limit': 'The AI service is busy. Please wait a moment and retry.',
    'timeout': 'The request took too long. This can happen with complex questions.',
    'model_unavailable': 'The chairman model is temporarily unavailable. Retry will use a backup model.',
    'context_too_long': 'The conversation is too long for the chairman model. Consider starting a new conversation.',
    'invalid_model': 'The configured chairman model is not available. Please check Model Selection settings.',
    'max_retries': 'Multiple attempts failed. Please try again later.',
  };
  
  return messages[errorType] || errorMessage || 'An unexpected error occurred.';
};
```

#### 7. Model Validation on Config Save

**File**: `backend/main.py`

Add model availability check when saving config:

```python
@app.put("/api/models/config")
async def update_model_config(request: ModelConfigRequest):
    """Update model configuration with validation."""
    
    # Get available models from OpenRouter
    try:
        available = await config.fetch_openrouter_models()
    except Exception:
        available = config.AVAILABLE_MODELS
    
    all_models = []
    for provider_models in available.values():
        all_models.extend([m["id"] for m in provider_models])
    
    # Validate all council models exist
    invalid_models = []
    for model in request.council_models:
        if model not in all_models:
            invalid_models.append(model)
    
    if invalid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid council model(s): {', '.join(invalid_models)}. These models are not available in OpenRouter."
        )
    
    # Validate chairman model exists
    if request.chairman_model not in all_models:
        # Suggest alternatives
        suggestions = [m for m in all_models if 'opus' in m.lower() or 'claude-3' in m.lower()][:3]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid chairman model: {request.chairman_model}. Try one of: {', '.join(suggestions)}"
        )
    
    # Save configuration
    new_config = {
        "council_models": request.council_models,
        "chairman_model": request.chairman_model
    }
    config.save_model_config(new_config)
    
    return {"status": "success", "config": new_config}
```

---

## Testing Checklist

After making changes, run these tests:

### 1. NavBar Tests
```bash
# Visual check
open http://localhost:5173

# Verify:
# - [ ] NavBar shows: Chat | Model Selection | Analytics
# - [ ] No dropdown menus
# - [ ] Each link navigates correctly
# - [ ] Active link is highlighted
```

### 2. Scrolling Tests
```bash
# Model Config page
open http://localhost:5173/config

# Verify:
# - [ ] Page scrolls vertically
# - [ ] Can see Council Members section
# - [ ] Can see Chairman Model section at bottom
# - [ ] Can see Save button (if present)

# Analytics page
open http://localhost:5173/analytics

# Verify:
# - [ ] Page scrolls vertically
# - [ ] Can see all model metrics
# - [ ] Can see search results section
```

### 3. Chairman Model Tests
```bash
# Verify:
# - [ ] Chairman section shows current chairman model
# - [ ] Provider dropdown populates
# - [ ] Model dropdown populates when provider selected
# - [ ] "Set Chairman" button works
# - [ ] Chairman updates after clicking button
# - [ ] Chairman persists after page refresh
```

### 4. OpenRouter API Tests
```bash
# Backend test
curl http://localhost:8001/api/models/available | jq 'keys'

# Verify:
# - [ ] Returns JSON with provider keys
# - [ ] Contains OpenAI, Anthropic, Google, etc.
# - [ ] Each provider has array of models
# - [ ] Models have id, name fields
# - [ ] Models have context_length field
# - [ ] Models have pricing object with prompt/completion

# Check model data structure
curl http://localhost:8001/api/models/available | jq '.OpenAI[0]'
# Should show: { "id": "...", "name": "...", "context_length": 128000, "pricing": {...} }

# Frontend test
# - [ ] Provider dropdown shows all providers from API
# - [ ] Model dropdown updates based on provider
# - [ ] Model dropdown shows context size (e.g., "128k ctx")
# - [ ] Model dropdown shows pricing (e.g., "$2.50/$10.00 per 1M")
# - [ ] Free models show "Free"
# - [ ] New models from OpenRouter appear
```

### 5. Model Validation Tests (CRITICAL - fixes 400 error)
```bash
# Test saving config with OpenRouter models
curl -X PUT http://localhost:8001/api/models/config \
  -H "Content-Type: application/json" \
  -d '{"council_models": ["openai/o1", "anthropic/claude-sonnet-4.5", "google/gemini-2.5-pro"], "chairman_model": "anthropic/claude-3.5-sonnet"}'

# Should return:
# {"status": "success", "config": {...}}

# NOT:
# {"detail": "Invalid model: ..."}

# Verify:
# - [ ] Can save any model that appears in OpenRouter dropdown
# - [ ] No 400 errors when saving valid OpenRouter models
# - [ ] Config persists after save (check model_config.json)

# Test with recommended defaults
curl -X PUT http://localhost:8001/api/models/config \
  -H "Content-Type: application/json" \
  -d '{"council_models": ["anthropic/claude-sonnet-4.5", "google/gemini-2.5-pro", "openai/o1", "x-ai/grok-3"], "chairman_model": "anthropic/claude-3.5-sonnet"}'
```

### 6. Config Persistence Tests
```bash
# Test 1: Save config
# - [ ] Select council members
# - [ ] Set chairman
# - [ ] Save configuration

# Test 2: Verify persistence
# - [ ] Refresh page
# - [ ] Council members still selected
# - [ ] Chairman still set

# Test 3: Backend verification
cat ~/Dropbox/aloma/claude-code/llm-council/data/model_config.json

# Should show saved config

# Test 4: Restart backend
claude-auto-stop
claude-auto

# - [ ] Config still loaded correctly
```

### 7. Full Integration Test
```bash
# 1. Start fresh
claude-auto-stop
rm ~/Dropbox/aloma/claude-code/llm-council/data/model_config.json
claude-auto

# 2. Navigate to Model Selection
open http://localhost:5173/config

# 3. Verify defaults loaded
# - [ ] Default council members shown
# - [ ] Default chairman shown

# 4. Modify config
# - [ ] Add a new council member
# - [ ] Change chairman
# - [ ] Save

# 5. Go to Chat and test
open http://localhost:5173

# - [ ] Send a message
# - [ ] Verify new models are used in responses
# - [ ] Check Stage 1 shows correct models
# - [ ] Check Stage 3 shows correct chairman
```

### 8. Search Box Location Test
```bash
# Chat page
open http://localhost:5173

# Verify:
# - [ ] Search box is at TOP of Chat page
# - [ ] Search box has placeholder "Search conversations by title or content..."
# - [ ] Typing and pressing Enter triggers search
# - [ ] Search results appear below search box
# - [ ] Clicking a result loads that conversation

# Analytics page
open http://localhost:5173/analytics

# Verify:
# - [ ] Search box is NOT on Analytics page
# - [ ] Analytics only shows Model Performance Metrics
```

### 9. Error Handling Tests
```bash
# Test 1: Invalid model error
curl -X PUT http://localhost:8001/api/models/config \
  -H "Content-Type: application/json" \
  -d '{"council_models": ["openai/o1"], "chairman_model": "invalid/fake-model"}'
# Should return 400 with helpful error message and suggestions

# Test 2: Retry endpoint exists
curl -X POST http://localhost:8001/api/conversations/test-id/retry-stage3
# Should return 404 "Conversation not found" (not 405 Method Not Allowed)

# Test 3: Frontend retry button (manual test)
# - Configure an invalid chairman model
# - Send a message to trigger Stage 3 failure
# - Verify "Retry Synthesis" button appears
# - Click button and verify retry works with fallback model

# Verify:
# - [ ] Invalid model gives helpful error message with suggestions
# - [ ] Rate limit errors show "service is busy" message
# - [ ] Timeout errors are handled gracefully  
# - [ ] Retry button appears on Stage 3 failure
# - [ ] Retry uses fallback models if primary fails
# - [ ] Successful retry updates the conversation in place
# - [ ] Error types are displayed to help debugging
```

### 10. OpenRouter Model ID Validation Test
```bash
# CRITICAL: Run this BEFORE deploying to verify all default models exist

# Test default council models
echo "Testing council models..."
for model in "anthropic/claude-sonnet-4.5" "google/gemini-2.5-pro" "openai/o1" "x-ai/grok-3"; do
  result=$(curl -s "https://openrouter.ai/api/v1/models" | jq -r ".data[] | select(.id == \"$model\") | .id")
  if [ -n "$result" ]; then
    echo "✅ $model exists"
  else
    echo "❌ $model NOT FOUND - update config.py!"
  fi
done

# Test chairman model
echo ""
echo "Testing chairman model..."
model="anthropic/claude-3.5-sonnet"
result=$(curl -s "https://openrouter.ai/api/v1/models" | jq -r ".data[] | select(.id == \"$model\") | .id")
if [ -n "$result" ]; then
  echo "✅ $model exists"
else
  echo "❌ $model NOT FOUND - update config.py!"
fi

# Test fallback chairmen
echo ""
echo "Testing fallback chairmen..."
for model in "anthropic/claude-3-opus" "openai/gpt-4-turbo" "google/gemini-pro"; do
  result=$(curl -s "https://openrouter.ai/api/v1/models" | jq -r ".data[] | select(.id == \"$model\") | .id")
  if [ -n "$result" ]; then
    echo "✅ $model exists"
  else
    echo "❌ $model NOT FOUND - remove from FALLBACK_CHAIRMAN_MODELS!"
  fi
done
```

---

## File Summary

| File | Changes |
|------|---------|
| `frontend/src/components/NavBar.jsx` | Remove dropdown, add direct links |
| `frontend/src/pages/ModelConfig.jsx` | Fix scrolling, Chairman UI, dropdown with pricing/context |
| `frontend/src/pages/Analytics.jsx` | Fix scrolling, remove Search Conversations section |
| `frontend/src/pages/Chat.jsx` | Add Search Conversations at top |
| `frontend/src/components/CouncilResponse.jsx` | Add Stage 3 retry button, error messages |
| `frontend/src/api.js` | Add retryStage3 method |
| `frontend/src/index.css` | Remove overflow:hidden if present |
| `backend/config.py` | Add OpenRouter API fetch, fallback chairmen, fix persistence |
| `backend/council.py` | Add retry logic, error handling, fallback support |
| `backend/storage.py` | Add update_stage3 function |
| `backend/main.py` | Update validation, add retry-stage3 endpoint |
| `backend/pyproject.toml` | Add httpx dependency |

---

## Commands to Run

```bash
# 1. Navigate to project
cd ~/Dropbox/aloma/claude-code/llm-council

# 2. Install new backend dependency
cd backend
uv add httpx
cd ..

# 3. Restart services
claude-auto-stop
claude-auto

# 4. Run tests
open http://localhost:5173/config
# Follow testing checklist above
```

---

## Success Criteria

- [ ] NavBar has 3 direct links (no dropdowns)
- [ ] Model Config page fully scrollable
- [ ] Analytics page fully scrollable
- [ ] Chairman model can be selected and saved
- [ ] Models fetched dynamically from OpenRouter
- [ ] Model dropdown shows context size (e.g., "128k ctx")
- [ ] Model dropdown shows pricing (e.g., "$2.50/$10.00 per 1M" or "Free")
- [ ] **No 400 errors when saving any valid OpenRouter model**
- [ ] Config persists between sessions
- [ ] **Search Conversations is on Chat page (not Analytics)**
- [ ] **Stage 3 failures show "Retry Synthesis" button**
- [ ] **Retry uses fallback chairman models if primary fails**
- [ ] **Error messages are user-friendly (rate limit, timeout, etc.)**
- [ ] **All default model IDs in config.py exist in OpenRouter (run test 10)**
- [ ] All existing functionality still works
