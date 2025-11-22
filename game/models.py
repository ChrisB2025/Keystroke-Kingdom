"""
Models for the Keystroke Kingdom game.
"""
from django.contrib.auth.models import User
from django.db import models


class GameSave(models.Model):
    """
    Store saved game states for users.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_saves')
    game_state = models.JSONField(help_text="Complete game state as JSON")
    day = models.IntegerField(default=1)
    employment = models.FloatField(default=0.0)
    inflation = models.FloatField(default=0.0)
    services_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['user', '-updated_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - Day {self.day} - {self.updated_at.strftime('%Y-%m-%d %H:%M')}"


class HighScore(models.Model):
    """
    Store high scores for the leaderboard.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='high_scores')
    score = models.IntegerField(default=0)
    final_day = models.IntegerField(default=1)
    employment = models.FloatField(default=0.0)
    inflation = models.FloatField(default=0.0)
    services = models.FloatField(default=0.0)
    achieved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-achieved_at']
        indexes = [
            models.Index(fields=['-score']),
            models.Index(fields=['user', '-score']),
            models.Index(fields=['-achieved_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - Score: {self.score} - Day {self.final_day}"
