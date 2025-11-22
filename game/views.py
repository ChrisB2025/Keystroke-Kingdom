"""
Views for the Keystroke Kingdom game.
"""
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import GameSave, HighScore
from .serializers import GameSaveSerializer, HighScoreSerializer, HighScoreSubmitSerializer


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
def save_game(request):
    """
    API endpoint to save game state.
    Requires authentication.
    """
    try:
        game_state = request.data.get('game_state', {})
        day = request.data.get('day', 1)
        employment = request.data.get('employment', 0.0)
        inflation = request.data.get('inflation', 0.0)
        services_score = request.data.get('services_score', 0.0)

        # Get or create the latest save for this user
        game_save, created = GameSave.objects.update_or_create(
            user=request.user,
            defaults={
                'game_state': game_state,
                'day': day,
                'employment': employment,
                'inflation': inflation,
                'services_score': services_score,
            }
        )

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
        # Get the most recent save for this user
        game_save = GameSave.objects.filter(user=request.user).first()

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
def submit_score(request):
    """
    API endpoint to submit a high score.
    Requires authentication.
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
    """
    try:
        limit = int(request.GET.get('limit', 50))
        limit = min(limit, 100)  # Cap at 100 to prevent abuse

        high_scores = HighScore.objects.select_related('user')[:limit]
        serializer = HighScoreSerializer(high_scores, many=True)

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
def claude_proxy(request):
    """
    API endpoint to proxy requests to Claude API.
    Requires authentication to prevent abuse.
    Keeps the API key secure on the server.
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

        # Get user's best score
        best_score = HighScore.objects.filter(user=user).order_by('-score').first()

        # Get total number of saves
        total_saves = GameSave.objects.filter(user=user).count()

        # Get total number of scores submitted
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
