"""Configuration for the LLM Council."""

import os
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv
import httpx

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"

# Configuration file path
CONFIG_FILE = "data/model_config.json"

# Default council members - list of OpenRouter model identifiers
# Recommended defaults based on Dec 2025 benchmarks
DEFAULT_COUNCIL_MODELS = [
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-4o",
    "google/gemini-3-pro-preview",
    "x-ai/grok-4",
]

# Default chairman model - synthesizes final response
# Best at synthesis and natural writing
DEFAULT_CHAIRMAN_MODEL = "anthropic/claude-3.5-sonnet"

# Fallback chairman models if primary fails (in order of preference)
FALLBACK_CHAIRMAN_MODELS = [
    "google/gemini-3-pro-preview",   # 1st fallback
    "openai/gpt-5.2",                # 2nd fallback
    "anthropic/claude-opus-4.5",     # 3rd fallback
]

# Cache models for 1 hour
_models_cache = None
_models_cache_time = None
CACHE_DURATION = timedelta(hours=1)


async def fetch_openrouter_models() -> Dict[str, List[Dict]]:
    """Fetch available models from OpenRouter API.

    Raises:
        Exception: If the OpenRouter API is unavailable or returns an error.
    """
    global _models_cache, _models_cache_time

    # Return cached if valid
    if _models_cache and _models_cache_time:
        if datetime.now() - _models_cache_time < CACHE_DURATION:
            return _models_cache

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


def ensure_config_dir():
    """Ensure the config directory exists."""
    Path("data").mkdir(parents=True, exist_ok=True)


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


def save_model_config(config: Dict[str, Any]):
    """Save model configuration to file."""
    ensure_config_dir()

    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def get_council_models() -> List[str]:
    """Get currently configured council models."""
    config = load_model_config()
    return config.get("council_models", DEFAULT_COUNCIL_MODELS)


def get_chairman_model() -> str:
    """Get currently configured chairman model."""
    config = load_model_config()
    return config.get("chairman_model", DEFAULT_CHAIRMAN_MODEL)


# Initialize with current config for backward compatibility
COUNCIL_MODELS = get_council_models()
CHAIRMAN_MODEL = get_chairman_model()
