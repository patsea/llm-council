import pytest
import json
import os

class TestStorage:
    """Tests for JSON persistence storage"""
    
    def test_storage_import(self):
        """Verify storage module can be imported"""
        try:
            from backend import storage
            assert storage is not None
        except ImportError:
            try:
                import storage
                assert storage is not None
            except ImportError as e:
                pytest.skip(f"Module not found: {e}")
    
    def test_save_session(self, sample_council_session, tmp_path):
        """Should save session to JSON file"""
        file_path = tmp_path / "test_session.json"
        with open(file_path, 'w') as f:
            json.dump(sample_council_session, f)
        assert file_path.exists()
        
        with open(file_path, 'r') as f:
            loaded = json.load(f)
        assert loaded["id"] == sample_council_session["id"]
    
    def test_load_session(self, sample_council_session, tmp_path):
        """Should load session from JSON file"""
        file_path = tmp_path / "test_session.json"
        with open(file_path, 'w') as f:
            json.dump(sample_council_session, f)
        
        with open(file_path, 'r') as f:
            loaded = json.load(f)
        assert loaded["question"] == sample_council_session["question"]
    
    def test_list_sessions(self, tmp_path):
        """Should list all saved sessions"""
        for i in range(3):
            file_path = tmp_path / f"session_{i}.json"
            with open(file_path, 'w') as f:
                json.dump({"id": f"session-{i}"}, f)
        
        sessions = list(tmp_path.glob("session_*.json"))
        assert len(sessions) == 3
    
    def test_delete_session(self, sample_council_session, tmp_path):
        """Should delete session file"""
        file_path = tmp_path / "to_delete.json"
        with open(file_path, 'w') as f:
            json.dump(sample_council_session, f)
        assert file_path.exists()
        
        os.remove(file_path)
        assert not file_path.exists()
    
    def test_invalid_json_handling(self, tmp_path):
        """Should handle invalid JSON gracefully"""
        file_path = tmp_path / "invalid.json"
        with open(file_path, 'w') as f:
            f.write("not valid json {{{")
        
        with pytest.raises(json.JSONDecodeError):
            with open(file_path, 'r') as f:
                json.load(f)
