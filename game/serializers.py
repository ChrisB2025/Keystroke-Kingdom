"""
Serializers for the Keystroke Kingdom game API.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import GameSave, HighScore


class GameSaveSerializer(serializers.ModelSerializer):
    """
    Serializer for game save data.
    """
    class Meta:
        model = GameSave
        fields = ['id', 'game_state', 'day', 'employment', 'inflation', 'services_score', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class HighScoreSerializer(serializers.ModelSerializer):
    """
    Serializer for high score data.
    Returns initials for display (classic arcade style).
    """
    class Meta:
        model = HighScore
        fields = ['id', 'initials', 'score', 'final_day', 'employment', 'inflation', 'services', 'achieved_at']
        read_only_fields = ['id', 'achieved_at']


class HighScoreSubmitSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting high scores.
    Accepts 3-letter initials (classic arcade style) - no login required.
    """
    initials = serializers.CharField(
        max_length=3,
        min_length=1,
        required=True,
        help_text="3-letter initials for leaderboard display"
    )

    class Meta:
        model = HighScore
        fields = ['initials', 'score', 'final_day', 'employment', 'inflation', 'services']

    def validate_initials(self, value):
        """Validate and normalize initials to uppercase letters only."""
        # Remove any non-letter characters and uppercase
        cleaned = ''.join(c for c in value.upper() if c.isalpha())
        if len(cleaned) == 0:
            raise serializers.ValidationError("Initials must contain at least one letter")
        if len(cleaned) > 3:
            cleaned = cleaned[:3]
        # Pad with spaces if less than 3 characters
        return cleaned.ljust(3)[:3]
