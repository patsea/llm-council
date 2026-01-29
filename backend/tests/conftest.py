import pytest
import sys
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
import json

# Fix imports - add parent directories to path
backend_dir = Path(__file__).parent.parent
project_dir = backend_dir.parent
sys.path.insert(0, str(project_dir))
sys.path.insert(0, str(backend_dir))

@pytest.fixture
def mock_llm_response():
    """Mock LLM API response"""
    return MagicMock(
        content=[MagicMock(text="This is a mock LLM response for testing.")]
    )

@pytest.fixture
def sample_deliberation_input():
    """Sample input for 3-stage deliberation"""
    return {
        "question": "What is the best approach to AI safety?",
        "context": "Discussion about AI alignment",
        "participants": ["model_a", "model_b", "model_c"]
    }

@pytest.fixture
def sample_stage1_output():
    """Sample Stage 1 (individual responses) output"""
    return {
        "model_a": "Response from model A about AI safety...",
        "model_b": "Response from model B about AI safety...",
        "model_c": "Response from model C about AI safety..."
    }

@pytest.fixture
def sample_council_session():
    """Sample complete council session"""
    return {
        "id": "test-session-123",
        "question": "Test question",
        "stage1": {"responses": {}},
        "stage2": {"discussion": ""},
        "stage3": {"synthesis": ""},
        "status": "pending"
    }
