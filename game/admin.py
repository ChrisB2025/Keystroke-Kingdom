"""
Admin configuration for Keystroke Kingdom game.
"""
from django.contrib import admin
from .models import GameSave, HighScore


@admin.register(GameSave)
class GameSaveAdmin(admin.ModelAdmin):
    """
    Admin interface for GameSave model.
    """
    list_display = ['user', 'day', 'employment', 'inflation', 'services_score', 'updated_at']
    list_filter = ['updated_at', 'day']
    search_fields = ['user__username']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'updated_at'


@admin.register(HighScore)
class HighScoreAdmin(admin.ModelAdmin):
    """
    Admin interface for HighScore model.
    """
    list_display = ['initials', 'score', 'final_day', 'employment', 'inflation', 'services', 'achieved_at', 'user']
    list_filter = ['achieved_at', 'final_day']
    search_fields = ['initials', 'user__username']
    readonly_fields = ['achieved_at']
    date_hierarchy = 'achieved_at'
    ordering = ['-score', '-achieved_at']
