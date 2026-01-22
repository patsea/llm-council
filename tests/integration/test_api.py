"""
Integration tests for FastAPI endpoints.
"""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.main import app


@pytest.fixture
async def client():
    """Async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    """Test health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        response = await client.get("/api/system/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "model_validation" in data


class TestConversationsAPI:
    """Test conversations CRUD endpoints."""

    @pytest.mark.asyncio
    async def test_create_conversation(self, client):
        response = await client.post(
            "/api/conversations",
            json={}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert data["messages"] == []

    @pytest.mark.asyncio
    async def test_list_conversations(self, client):
        # Create a conversation first
        await client.post("/api/conversations", json={})

        response = await client.get("/api/conversations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least one conversation
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_conversation(self, client):
        # Create a conversation
        create_response = await client.post("/api/conversations", json={})
        conv_id = create_response.json()["id"]

        # Get the conversation
        response = await client.get(f"/api/conversations/{conv_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conv_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_conversation(self, client):
        response = await client.get("/api/conversations/does-not-exist")
        assert response.status_code == 404


class TestModelsAPI:
    """Test models configuration endpoints."""

    @pytest.mark.asyncio
    async def test_get_available_models(self, client):
        response = await client.get("/api/models/available")
        assert response.status_code == 200
        data = response.json()
        # Response is a dict grouped by vendor
        assert isinstance(data, dict)
        assert len(data) > 0
        # Verify structure has vendor keys with model lists
        for vendor, models in data.items():
            assert isinstance(models, list)

    @pytest.mark.asyncio
    async def test_get_models_config(self, client):
        response = await client.get("/api/models/config")
        assert response.status_code == 200
        data = response.json()
        assert "council_models" in data
        assert "chairman_model" in data


class TestAnalyticsAPI:
    """Test analytics endpoints."""

    @pytest.mark.asyncio
    async def test_get_metrics(self, client):
        response = await client.get("/api/analytics/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_conversations" in data
        assert "model_metrics" in data

    @pytest.mark.asyncio
    async def test_get_costs(self, client):
        response = await client.get("/api/analytics/costs")
        assert response.status_code == 200
        data = response.json()
        assert "total_cost" in data

    @pytest.mark.asyncio
    async def test_get_performance(self, client):
        response = await client.get("/api/analytics/performance")
        assert response.status_code == 200
        data = response.json()
        assert "total_tokens" in data
        assert "response_times" in data

    @pytest.mark.asyncio
    async def test_get_value_score(self, client):
        response = await client.get("/api/analytics/value-score")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert isinstance(data["models"], list)


class TestRootEndpoint:
    """Test root endpoint."""

    @pytest.mark.asyncio
    async def test_root_returns_info(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "service" in data


class TestConversationExport:
    """Test conversation export functionality."""

    @pytest.mark.asyncio
    async def test_export_markdown(self, client):
        # Create a conversation
        create_response = await client.post("/api/conversations", json={})
        conv_id = create_response.json()["id"]

        # Export as markdown
        response = await client.get(f"/api/conversations/{conv_id}/export/markdown")
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_export_json(self, client):
        # Create a conversation
        create_response = await client.post("/api/conversations", json={})
        conv_id = create_response.json()["id"]

        # Export as JSON
        response = await client.get(f"/api/conversations/{conv_id}/export/json")
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")


class TestConversationSearch:
    """Test conversation search functionality."""

    @pytest.mark.asyncio
    async def test_search_conversations(self, client):
        response = await client.post(
            "/api/conversations/search",
            json={"query": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
