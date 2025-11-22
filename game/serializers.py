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
    """
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = HighScore
        fields = ['id', 'username', 'score', 'final_day', 'employment', 'inflation', 'services', 'achieved_at']
        read_only_fields = ['id', 'username', 'achieved_at']


class HighScoreSubmitSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting high scores (without user field).
    """
    class Meta:
        model = HighScore
        fields = ['score', 'final_day', 'employment', 'inflation', 'services']
