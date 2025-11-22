"""
URL configuration for the game app.
"""
from django.urls import path
from . import views

app_name = 'game'

urlpatterns = [
    # Main game view
    path('', views.game_view, name='game'),

    # API endpoints
    path('api/save', views.save_game, name='save_game'),
    path('api/load', views.load_game, name='load_game'),
    path('api/scores', views.submit_score, name='submit_score'),
    path('api/leaderboard', views.leaderboard, name='leaderboard'),
    path('api/claude', views.claude_proxy, name='claude_proxy'),
    path('api/stats', views.user_stats, name='user_stats'),
]
