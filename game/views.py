"""
Views for the Keystroke Kingdom game.
"""
import json
import time
from functools import wraps
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import GameSave, HighScore
from .serializers import GameSaveSerializer, HighScoreSerializer, HighScoreSubmitSerializer


# Rate limiting decorator using Django's cache framework
def rate_limit(key_prefix, max_requests=10, window_seconds=60):
    """
    Simple rate limiting decorator.
    Limits requests per user to max_requests within window_seconds.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Build cache key based on user
            if request.user.is_authenticated:
                cache_key = f"rate_limit:{key_prefix}:user:{request.user.id}"
            else:
                # For anonymous users, use IP (less reliable but fallback)
                ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))
                cache_key = f"rate_limit:{key_prefix}:ip:{ip}"

            # Get current request count and timestamp
            rate_data = cache.get(cache_key)
            current_time = time.time()

            if rate_data is None:
                # First request in window
                cache.set(cache_key, {'count': 1, 'start': current_time}, window_seconds)
            else:
                # Check if window has expired
                if current_time - rate_data['start'] > window_seconds:
                    # Reset window
                    cache.set(cache_key, {'count': 1, 'start': current_time}, window_seconds)
                elif rate_data['count'] >= max_requests:
                    # Rate limit exceeded
                    return Response({
                        'success': False,
                        'error': 'Rate limit exceeded. Please try again later.'
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                else:
                    # Increment count
                    rate_data['count'] += 1
                    cache.set(cache_key, rate_data, window_seconds)

            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


# Game state validation
def validate_game_state(game_state):
    """
    Validate game state JSON structure.
    Returns (is_valid, error_message).
    """
    if not isinstance(game_state, dict):
        return False, "Game state must be a JSON object"

    required_fields = ['currentDay', 'employment', 'inflation']
    for field in required_fields:
        if field not in game_state:
            return False, f"Missing required field: {field}"

    # Validate numeric ranges
    if not (1 <= game_state.get('currentDay', 0) <= 100):
        return False, "Invalid currentDay value"

    if not (0 <= game_state.get('employment', -1) <= 100):
        return False, "Invalid employment value"

    if not (-10 <= game_state.get('inflation', -100) <= 100):
        return False, "Invalid inflation value"

    return True, None


def game_view(request):
    """
    Main game view - serves the game interface.
    """
    context = {
        'user': request.user if request.user.is_authenticated else None,
    }
    return render(request, 'game/index.html', context)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit('save_game', max_requests=30, window_seconds=60)
def save_game(request):
    """
    API endpoint to save game state.
    Requires authentication.
    Rate limited to 30 requests per minute.
    """
    try:
        game_state = request.data.get('game_state', {})
        day = request.data.get('day', 1)
        employment = request.data.get('employment', 0.0)
        inflation = request.data.get('inflation', 0.0)
        services_score = request.data.get('services_score', 0.0)

        # Validate game state
        is_valid, error_msg = validate_game_state(game_state)
        if not is_valid:
            return Response({
                'success': False,
                'error': error_msg
            }, status=status.HTTP_400_BAD_REQUEST)

        # Optimized: get_or_create then update to avoid locking issues
        game_save, created = GameSave.objects.get_or_create(
            user=request.user,
            defaults={
                'game_state': game_state,
                'day': day,
                'employment': employment,
                'inflation': inflation,
                'services_score': services_score,
            }
        )

        if not created:
            # Update existing save
            game_save.game_state = game_state
            game_save.day = day
            game_save.employment = employment
            game_save.inflation = inflation
            game_save.services_score = services_score
            game_save.save(update_fields=['game_state', 'day', 'employment', 'inflation', 'services_score', 'updated_at'])

        serializer = GameSaveSerializer(game_save)
        return Response({
            'success': True,
            'message': 'Game saved successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def load_game(request):
    """
    API endpoint to load the most recent game save.
    Requires authentication.
    """
    try:
        # Optimized: only() to fetch only needed fields
        game_save = GameSave.objects.filter(
            user=request.user
        ).only(
            'game_state', 'day', 'employment', 'inflation', 'services_score', 'updated_at'
        ).first()

        if not game_save:
            return Response({
                'success': False,
                'message': 'No saved game found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = GameSaveSerializer(game_save)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit('submit_score', max_requests=10, window_seconds=60)
def submit_score(request):
    """
    API endpoint to submit a high score.
    Requires authentication.
    Rate limited to 10 requests per minute.
    """
    try:
        serializer = HighScoreSubmitSerializer(data=request.data)

        if serializer.is_valid():
            high_score = serializer.save(user=request.user)
            response_serializer = HighScoreSerializer(high_score)

            return Response({
                'success': True,
                'message': 'High score submitted successfully',
                'data': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    """
    API endpoint to get the leaderboard.
    Public endpoint - no authentication required.
    Cached for 30 seconds to reduce database load.
    """
    try:
        limit = int(request.GET.get('limit', 50))
        limit = min(limit, 100)  # Cap at 100 to prevent abuse

        # Try to get from cache
        cache_key = f"leaderboard:{limit}"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response({
                'success': True,
                'data': cached_data
            }, status=status.HTTP_200_OK)

        # Optimized: select_related and only() for minimal data transfer
        high_scores = HighScore.objects.select_related('user').only(
            'score', 'final_day', 'employment', 'inflation', 'services', 'achieved_at',
            'user__username'
        ).order_by('-score')[:limit]

        serializer = HighScoreSerializer(high_scores, many=True)
        data = serializer.data

        # Cache for 30 seconds
        cache.set(cache_key, data, 30)

        return Response({
            'success': True,
            'data': data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit('claude_api', max_requests=20, window_seconds=60)
def claude_proxy(request):
    """
    API endpoint to proxy requests to Claude API.
    Requires authentication to prevent abuse.
    Keeps the API key secure on the server.
    Rate limited to 20 requests per minute per user.
    """
    try:
        import anthropic

        if not settings.ANTHROPIC_API_KEY:
            return Response({
                'success': False,
                'error': 'Claude API key not configured'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        messages = request.data.get('messages', [])

        if not messages:
            return Response({
                'success': False,
                'error': 'No messages provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate messages structure
        if not isinstance(messages, list):
            return Response({
                'success': False,
                'error': 'Messages must be a list'
            }, status=status.HTTP_400_BAD_REQUEST)

        for msg in messages:
            if not isinstance(msg, dict) or 'role' not in msg or 'content' not in msg:
                return Response({
                    'success': False,
                    'error': 'Invalid message format'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Initialize Anthropic client
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Make the API call
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=messages
        )

        # Extract the text content from the response
        assistant_message = response.content[0].text if response.content else ""

        return Response({
            'success': True,
            'data': {
                'message': assistant_message,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.input_tokens,
                    'output_tokens': response.usage.output_tokens,
                }
            }
        }, status=status.HTTP_200_OK)

    except anthropic.APIError as e:
        return Response({
            'success': False,
            'error': f'Claude API error: {str(e)}'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """
    API endpoint to get user statistics.
    Returns user's best scores and save count.
    """
    try:
        user = request.user

        # Optimized: use aggregate queries instead of multiple separate queries
        # Get user's best score with only() for minimal data
        best_score = HighScore.objects.filter(
            user=user
        ).only(
            'score', 'final_day', 'employment', 'inflation', 'services', 'achieved_at'
        ).order_by('-score').first()

        # Get counts in single queries
        total_saves = GameSave.objects.filter(user=user).count()
        total_scores = HighScore.objects.filter(user=user).count()

        data = {
            'username': user.username,
            'total_saves': total_saves,
            'total_scores': total_scores,
            'best_score': HighScoreSerializer(best_score).data if best_score else None
        }

        return Response({
            'success': True,
            'data': data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
