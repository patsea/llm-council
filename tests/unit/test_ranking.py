"""
Tests for the critical ranking/aggregation logic in council.py
"""
import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.council import (
    parse_ranking_from_text,
    calculate_aggregate_rankings,
)


class TestParseRankingFromText:
    """Tests for ranking text parsing."""

    def test_parse_simple_numbered_list(self):
        """Parse '1. Response A, 2. Response B, 3. Response C' format."""
        text = "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"
        result = parse_ranking_from_text(text)
        assert result == ["Response A", "Response B", "Response C"]

    def test_parse_without_header(self):
        """Parse text without FINAL RANKING header (fallback mode)."""
        text = "1. Response A\n2. Response B\n3. Response C"
        result = parse_ranking_from_text(text)
        # Fallback extracts all Response X patterns
        assert "Response A" in result
        assert "Response B" in result
        assert "Response C" in result

    def test_parse_with_explanations(self):
        """Parse ranking with verbose explanations."""
        text = """
        FINAL RANKING:
        1. Response A is best because it provides clear reasoning
        2. Response B has good points but lacks depth
        3. Response C is the weakest response
        """
        result = parse_ranking_from_text(text)
        assert result == ["Response A", "Response B", "Response C"]

    def test_parse_malformed_returns_empty(self):
        """Malformed text with no Response patterns returns empty list."""
        text = "I cannot rank these responses"
        result = parse_ranking_from_text(text)
        assert result == []

    def test_parse_empty_text(self):
        """Empty text should return empty list."""
        result = parse_ranking_from_text("")
        assert result == []

    def test_parse_only_first_two(self):
        """Parse text with only first two responses ranked."""
        text = "FINAL RANKING:\n1. Response C\n2. Response A"
        result = parse_ranking_from_text(text)
        assert result == ["Response C", "Response A"]
        assert len(result) == 2

    def test_parse_non_sequential(self):
        """Parse non-sequential numbering (e.g., 1, 3, 2)."""
        text = "FINAL RANKING:\n1. Response B\n3. Response A\n2. Response C"
        result = parse_ranking_from_text(text)
        # Should extract in order they appear
        assert result == ["Response B", "Response A", "Response C"]


class TestCalculateAggregateRankings:
    """Tests for ranking aggregation."""

    def test_unanimous_rankings(self):
        """All judges agree on #1."""
        stage2_results = [
            {"ranker": "j1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
            {"ranker": "j2", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
            {"ranker": "j3", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
        ]
        label_to_model = {
            "Response A": "model-a",
            "Response B": "model-b",
            "Response C": "model-c",
        }
        result = calculate_aggregate_rankings(stage2_results, label_to_model)

        # First place should be model-a with rank 1.0
        assert len(result) == 3
        assert result[0]["model"] == "model-a"
        assert result[0]["average_rank"] == 1.0
        assert result[0]["rankings_count"] == 3

    def test_split_rankings(self):
        """Judges disagree completely."""
        stage2_results = [
            {"ranker": "j1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
            {"ranker": "j2", "ranking": "FINAL RANKING:\n1. Response C\n2. Response A\n3. Response B"},
            {"ranker": "j3", "ranking": "FINAL RANKING:\n1. Response B\n2. Response C\n3. Response A"},
        ]
        label_to_model = {
            "Response A": "model-a",
            "Response B": "model-b",
            "Response C": "model-c",
        }
        result = calculate_aggregate_rankings(stage2_results, label_to_model)

        # Should return all 3 models
        assert len(result) == 3
        # All should have average rank of 2.0 (1+2+3)/3
        assert all(r["average_rank"] == 2.0 for r in result)
        assert all(r["rankings_count"] == 3 for r in result)

    def test_empty_rankings(self):
        """Empty rankings should return empty list."""
        result = calculate_aggregate_rankings([], {})
        assert result == []

    def test_single_judge(self):
        """Single judge's ranking becomes final."""
        stage2_results = [
            {"ranker": "j1", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C"}
        ]
        label_to_model = {
            "Response A": "model-a",
            "Response B": "model-b",
            "Response C": "model-c",
        }
        result = calculate_aggregate_rankings(stage2_results, label_to_model)

        assert len(result) == 3
        assert result[0]["model"] == "model-b"
        assert result[0]["average_rank"] == 1.0
        assert result[1]["model"] == "model-a"
        assert result[1]["average_rank"] == 2.0

    def test_average_rank_calculation(self):
        """Verify average rank calculation."""
        # Model A: ranks 1, 2 -> avg 1.5
        # Model B: ranks 2, 3 -> avg 2.5
        # Model C: ranks 3, 1 -> avg 2.0
        stage2_results = [
            {"ranker": "j1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
            {"ranker": "j2", "ranking": "FINAL RANKING:\n1. Response C\n2. Response A\n3. Response B"},
        ]
        label_to_model = {
            "Response A": "model-a",
            "Response B": "model-b",
            "Response C": "model-c",
        }
        result = calculate_aggregate_rankings(stage2_results, label_to_model)

        # Check specific averages
        model_a = next(r for r in result if r["model"] == "model-a")
        model_b = next(r for r in result if r["model"] == "model-b")
        model_c = next(r for r in result if r["model"] == "model-c")

        assert model_a["average_rank"] == 1.5
        assert model_b["average_rank"] == 2.5
        assert model_c["average_rank"] == 2.0

        # Verify sorted order (best first)
        assert result[0]["model"] == "model-a"
        assert result[1]["model"] == "model-c"
        assert result[2]["model"] == "model-b"

    def test_partial_rankings_ignored(self):
        """Models not mentioned in rankings are not included."""
        stage2_results = [
            {"ranker": "j1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B"},
            # Response C never ranked
        ]
        label_to_model = {
            "Response A": "model-a",
            "Response B": "model-b",
            "Response C": "model-c",
        }
        result = calculate_aggregate_rankings(stage2_results, label_to_model)

        # Only models with rankings should appear
        assert len(result) == 2
        models = [r["model"] for r in result]
        assert "model-a" in models
        assert "model-b" in models
        assert "model-c" not in models


class TestRankingEdgeCases:
    """Edge cases and error conditions."""

    def test_two_responses_only(self):
        """Handle just 2 responses (binary comparison)."""
        text = "FINAL RANKING:\n1. Response A\n2. Response B"
        result = parse_ranking_from_text(text)
        assert len(result) == 2
        assert result == ["Response A", "Response B"]

    def test_many_responses(self):
        """Handle 5+ responses."""
        text = "FINAL RANKING:\n1. Response E\n2. Response A\n3. Response C\n4. Response B\n5. Response D"
        result = parse_ranking_from_text(text)
        assert len(result) == 5
        assert result[0] == "Response E"
        assert result[4] == "Response D"

    def test_duplicate_response_labels(self):
        """Duplicate labels in text should be preserved (parsing doesn't dedupe)."""
        text = "FINAL RANKING:\n1. Response A\n2. Response A\n3. Response B"
        result = parse_ranking_from_text(text)
        # Parser extracts all matches as they appear
        assert result == ["Response A", "Response A", "Response B"]

    def test_missing_space_after_number(self):
        """Handle '1.Response A' without space."""
        text = "FINAL RANKING:\n1.Response A\n2. Response B"
        result = parse_ranking_from_text(text)
        # Regex should still match with \s*
        assert "Response A" in result
        assert "Response B" in result
