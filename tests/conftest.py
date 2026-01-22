import pytest
from unittest.mock import AsyncMock, MagicMock
import sys
import os

# Add project root to path so backend can be imported as a package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

@pytest.fixture
def mock_openrouter_response():
    """Mock successful OpenRouter API response."""
    return {
        "choices": [
            {
                "message": {
                    "content": "Ranking: 1. Response A, 2. Response B, 3. Response C"
                }
            }
        ]
    }

@pytest.fixture
def mock_openrouter_client(mock_openrouter_response):
    """Mock OpenRouter client."""
    client = AsyncMock()
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=mock_openrouter_response["choices"][0]["message"]["content"]))]
    )
    return client

@pytest.fixture
def sample_conversation():
    """Sample conversation for testing."""
    return {
        "id": "test-conv-123",
        "question": "What is the meaning of life?",
        "responses": [
            {"model": "model-a", "content": "The meaning is 42"},
            {"model": "model-b", "content": "Life has no inherent meaning"},
            {"model": "model-c", "content": "To seek happiness and help others"},
        ]
    }

@pytest.fixture
def sample_rankings():
    """Sample ranking data."""
    return [
        {"ranker": "judge-1", "rankings": [1, 3, 2]},
        {"ranker": "judge-2", "rankings": [1, 2, 3]},
        {"ranker": "judge-3", "rankings": [2, 3, 1]},
    ]

@pytest.fixture
def empty_rankings():
    """Empty ranking data."""
    return []

@pytest.fixture
def partial_rankings():
    """Partial/incomplete rankings."""
    return [
        {"ranker": "judge-1", "rankings": [1, None, 2]},
        {"ranker": "judge-2", "rankings": [1, 2]},  # Missing third
    ]
