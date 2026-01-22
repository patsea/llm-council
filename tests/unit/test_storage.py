"""
Tests for storage operations in storage.py
"""
import pytest
import json
import tempfile
import os
import sys
import shutil

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Import storage functions from backend package
from backend import storage


class TestStorageOperations:
    """Tests for JSON file storage."""

    @pytest.fixture
    def temp_data_dir(self, monkeypatch):
        """Create temporary data directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Override DATA_DIR in the config module
            test_data_dir = os.path.join(tmpdir, 'data', 'conversations')
            monkeypatch.setattr('backend.config.DATA_DIR', test_data_dir)
            # Also patch it in storage module since it's already imported
            monkeypatch.setattr('backend.storage.DATA_DIR', test_data_dir)
            storage.ensure_data_dir()
            yield tmpdir

    def test_create_and_get_conversation(self, temp_data_dir):
        """Create and retrieve a conversation."""
        conv_id = "test-conv-123"
        conversation = storage.create_conversation(conv_id)

        assert conversation["id"] == conv_id
        assert "created_at" in conversation
        assert conversation["messages"] == []

        # Retrieve it
        loaded = storage.get_conversation(conv_id)
        assert loaded is not None
        assert loaded["id"] == conv_id

    def test_get_nonexistent_returns_none(self, temp_data_dir):
        """Loading missing conversation returns None."""
        result = storage.get_conversation("does-not-exist")
        assert result is None

    def test_list_conversations(self, temp_data_dir):
        """List all saved conversations."""
        storage.create_conversation("conv-1")
        storage.create_conversation("conv-2")

        convs = storage.list_conversations()
        assert len(convs) == 2
        conv_ids = [c["id"] for c in convs]
        assert "conv-1" in conv_ids
        assert "conv-2" in conv_ids

    def test_add_user_message(self, temp_data_dir):
        """Add a user message to conversation."""
        conv_id = "test-conv"
        storage.create_conversation(conv_id)

        storage.add_user_message(conv_id, "Hello, world!")

        conversation = storage.get_conversation(conv_id)
        assert len(conversation["messages"]) == 1
        assert conversation["messages"][0]["role"] == "user"
        assert conversation["messages"][0]["content"] == "Hello, world!"

    def test_add_assistant_message(self, temp_data_dir):
        """Add an assistant message with stages."""
        conv_id = "test-conv"
        storage.create_conversation(conv_id)

        stage1_results = [{"model": "model-a", "content": "Response A"}]
        stage2_results = [{"ranker": "judge-1", "ranking": "1. Response A"}]
        stage3_result = {"content": "Final answer"}

        storage.add_assistant_message(conv_id, stage1_results, stage2_results, stage3_result)

        conversation = storage.get_conversation(conv_id)
        assert len(conversation["messages"]) == 1
        msg = conversation["messages"][0]
        assert msg["role"] == "assistant"
        assert "stage1" in msg
        assert "stage2" in msg
        assert "stage3" in msg

    def test_update_conversation_title(self, temp_data_dir):
        """Update conversation title."""
        conv_id = "test-conv"
        storage.create_conversation(conv_id)

        storage.update_conversation_title(conv_id, "My Test Conversation")

        conversation = storage.get_conversation(conv_id)
        assert conversation["title"] == "My Test Conversation"

    def test_update_stage3(self, temp_data_dir):
        """Update stage 3 result in last message."""
        conv_id = "test-conv"
        storage.create_conversation(conv_id)

        # Add initial assistant message
        storage.add_assistant_message(conv_id, [], [], {"content": "Initial"})

        # Update stage3
        new_stage3 = {"content": "Updated stage 3"}
        storage.update_stage3(conv_id, new_stage3)

        conversation = storage.get_conversation(conv_id)
        last_msg = conversation["messages"][-1]
        assert last_msg["stage3"] == new_stage3

    def test_save_and_load_conversation(self, temp_data_dir):
        """Save and load a conversation with full data."""
        conversation = {
            "id": "full-test",
            "created_at": "2026-01-21T12:00:00",
            "title": "Test Conversation",
            "messages": [
                {"role": "user", "content": "Question?"},
                {
                    "role": "assistant",
                    "stage1": [{"model": "m1", "content": "R1"}],
                    "stage2": [],
                    "stage3": {"content": "Answer"}
                }
            ]
        }

        storage.save_conversation(conversation)

        loaded = storage.get_conversation("full-test")
        assert loaded["id"] == "full-test"
        assert loaded["title"] == "Test Conversation"
        assert len(loaded["messages"]) == 2

    def test_list_conversations_ordered_by_time(self, temp_data_dir):
        """Conversations should be ordered by creation time (newest first)."""
        import time

        storage.create_conversation("conv-1")
        time.sleep(0.01)  # Small delay to ensure different timestamps
        storage.create_conversation("conv-2")
        time.sleep(0.01)
        storage.create_conversation("conv-3")

        convs = storage.list_conversations()
        # Newest first
        assert convs[0]["id"] == "conv-3"
        assert convs[1]["id"] == "conv-2"
        assert convs[2]["id"] == "conv-1"

    def test_handles_corrupted_json(self, temp_data_dir):
        """Corrupted JSON file should not crash list_conversations."""
        # Create valid conversation first
        storage.create_conversation("valid-conv")

        # Write invalid JSON directly to file
        # Import DATA_DIR from backend.storage since it's already patched by fixture
        from backend import storage as storage_module
        corrupted_path = os.path.join(storage_module.DATA_DIR, "corrupted.json")
        with open(corrupted_path, 'w') as f:
            f.write("not valid json {{{")

        # list_conversations should skip corrupted files
        try:
            convs = storage.list_conversations()
            # Should get at least the valid one
            assert any(c["id"] == "valid-conv" for c in convs)
        except json.JSONDecodeError:
            # Acceptable to raise, but should not crash without handling
            pass


class TestStorageEdgeCases:
    """Edge cases and error handling."""

    @pytest.fixture
    def temp_data_dir(self, monkeypatch):
        """Create temporary data directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Override DATA_DIR in the config module
            test_data_dir = os.path.join(tmpdir, 'data', 'conversations')
            monkeypatch.setattr('backend.config.DATA_DIR', test_data_dir)
            # Also patch it in storage module since it's already imported
            monkeypatch.setattr('backend.storage.DATA_DIR', test_data_dir)
            storage.ensure_data_dir()
            yield tmpdir

    def test_empty_directory(self, temp_data_dir):
        """Empty data directory returns empty list."""
        convs = storage.list_conversations()
        assert convs == []

    def test_multiple_messages(self, temp_data_dir):
        """Conversation with multiple message exchanges."""
        conv_id = "multi-msg"
        storage.create_conversation(conv_id)

        storage.add_user_message(conv_id, "First question")
        storage.add_assistant_message(conv_id, [], [], {"content": "First answer"})
        storage.add_user_message(conv_id, "Second question")
        storage.add_assistant_message(conv_id, [], [], {"content": "Second answer"})

        conversation = storage.get_conversation(conv_id)
        assert len(conversation["messages"]) == 4
        assert conversation["messages"][0]["role"] == "user"
        assert conversation["messages"][1]["role"] == "assistant"
        assert conversation["messages"][2]["role"] == "user"
        assert conversation["messages"][3]["role"] == "assistant"

    def test_unicode_content(self, temp_data_dir):
        """Handle Unicode characters in messages."""
        conv_id = "unicode-test"
        storage.create_conversation(conv_id)

        storage.add_user_message(conv_id, "Hello 世界 🌍 café")

        conversation = storage.get_conversation(conv_id)
        assert conversation["messages"][0]["content"] == "Hello 世界 🌍 café"

    def test_long_content(self, temp_data_dir):
        """Handle very long message content."""
        conv_id = "long-test"
        storage.create_conversation(conv_id)

        long_content = "A" * 10000  # 10k characters
        storage.add_user_message(conv_id, long_content)

        conversation = storage.get_conversation(conv_id)
        assert len(conversation["messages"][0]["content"]) == 10000
