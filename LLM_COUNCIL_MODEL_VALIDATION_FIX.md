# LLM Council Model Validation Fix

## Overview

Previous implementation had incorrect fallback order and missing startup validation. This document provides corrections.

---

## 1. Fix config.py - Correct Default and Fallbacks

**File:** `backend/config.py`

Replace the current DEFAULT_CHAIRMAN_MODEL and FALLBACK_CHAIRMAN_MODELS with:

```python
# Default chairman model - synthesizes final response
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"

# Fallback chairman models if primary fails (in order of preference)
FALLBACK_CHAIRMAN_MODELS = [
    "google/gemini-3-pro-preview",   # 1st fallback
    "openai/gpt-5.2",                # 2nd fallback
    "anthropic/claude-opus-4.5",     # 3rd fallback
]
```

---

## 2. Add Startup Model Validation

**File:** `backend/config.py`

Add this function to validate models on startup:

```python
async def validate_configured_models() -> dict:
    """
    Validate that all configured models exist in OpenRouter.
    Called on backend startup.
    
    Returns:
        dict with 'valid' (bool) and 'errors' (list of error messages)
    """
    errors = []
    
    try:
        available = await fetch_openrouter_models()
        all_model_ids = []
        for provider_models in available.values():
            all_model_ids.extend([m["id"] for m in provider_models])
        
        # Check default chairman
        if DEFAULT_CHAIRMAN_MODEL not in all_model_ids:
            errors.append(f"DEFAULT_CHAIRMAN_MODEL '{DEFAULT_CHAIRMAN_MODEL}' not found in OpenRouter")
        
        # Check fallback chairmen
        for fallback in FALLBACK_CHAIRMAN_MODELS:
            if fallback not in all_model_ids:
                errors.append(f"FALLBACK_CHAIRMAN '{fallback}' not found in OpenRouter")
        
        # Check default council models
        for council_model in DEFAULT_COUNCIL_MODELS:
            if council_model not in all_model_ids:
                errors.append(f"DEFAULT_COUNCIL_MODEL '{council_model}' not found in OpenRouter")
        
    except Exception as e:
        errors.append(f"Failed to fetch OpenRouter models: {str(e)}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }
```

---

## 3. Add Startup Validation Endpoint and State

**File:** `backend/main.py`

Add global state and endpoint for model validation:

```python
# Global state for startup validation
_startup_validation_result = None

@app.on_event("startup")
async def startup_event():
    """Run model validation on startup."""
    global _startup_validation_result
    _startup_validation_result = await config.validate_configured_models()
    
    if not _startup_validation_result["valid"]:
        print("=" * 60)
        print("WARNING: Model validation errors detected!")
        for error in _startup_validation_result["errors"]:
            print(f"  - {error}")
        print("=" * 60)


@app.get("/api/system/health")
async def get_system_health():
    """Get system health including model validation status."""
    return {
        "status": "healthy" if _startup_validation_result and _startup_validation_result["valid"] else "degraded",
        "model_validation": _startup_validation_result
    }
```

---

## 4. Add Red Error Banner to Frontend

**File:** `frontend/src/App.jsx` (or main layout component)

Add state and effect to check system health:

```jsx
import { useState, useEffect } from 'react';
import { api } from './api';

function App() {
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.getSystemHealth();
        setSystemHealth(health);
      } catch (error) {
        console.error('Failed to check system health:', error);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="app">
      {/* Red error banner at top if model validation failed */}
      {systemHealth && !systemHealth.model_validation?.valid && (
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '12px 20px',
          fontWeight: 'bold',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 9999
        }}>
          ⚠️ Model Configuration Error: Some configured models are not available in OpenRouter.
          {systemHealth.model_validation?.errors?.map((error, i) => (
            <div key={i} style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>
              {error}
            </div>
          ))}
        </div>
      )}
      
      {/* Rest of your app */}
      ...
    </div>
  );
}
```

---

## 5. Add API Method for System Health

**File:** `frontend/src/api.js`

Add method to fetch system health:

```javascript
async getSystemHealth() {
  const response = await fetch(`${API_BASE}/api/system/health`);
  if (!response.ok) {
    throw new Error('Failed to get system health');
  }
  return response.json();
},
```

---

## 6. Add Error Banner CSS (Optional Enhancement)

**File:** `frontend/src/App.css` or relevant CSS file

```css
.system-error-banner {
  background-color: #dc2626;
  color: white;
  padding: 12px 20px;
  font-weight: bold;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 9999;
  animation: pulse 2s infinite;
}

.system-error-banner .error-detail {
  font-size: 14px;
  font-weight: normal;
  margin-top: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

---

## Testing Checklist

After implementing, run these tests:

```bash
# 1. Restart backend
kill $(lsof -t -i:8001) 2>/dev/null
cd ~/Dropbox/aloma/claude-code/llm-council
uv run python -m backend.main &

# 2. Check startup logs for validation output
# Should see either "Model validation passed" or warnings

# 3. Test health endpoint
curl http://localhost:8001/api/system/health

# 4. Verify config
curl http://localhost:8001/api/models/config

# Expected output:
# {
#   "council_models": [...],
#   "chairman_model": "anthropic/claude-3.5-sonnet"
# }

# 5. Check frontend for red banner (if any models invalid)
open http://localhost:5173
```

---

## Summary of Correct Configuration

| Setting | Value |
|---------|-------|
| DEFAULT_CHAIRMAN_MODEL | `anthropic/claude-3.5-sonnet` |
| FALLBACK 1 | `google/gemini-3-pro-preview` |
| FALLBACK 2 | `openai/gpt-5.2` |
| FALLBACK 3 | `anthropic/claude-opus-4.5` |

---

## Success Criteria

- [ ] Default chairman is `anthropic/claude-3.5-sonnet`
- [ ] Fallbacks are in correct order: gemini-3-pro-preview → gpt-5.2 → claude-opus-4.5
- [ ] Backend validates all models against OpenRouter on startup
- [ ] Console shows warnings if any model is invalid
- [ ] `/api/system/health` endpoint returns validation status
- [ ] Red error banner appears at top of frontend if models are invalid
- [ ] Banner shows specific error messages
