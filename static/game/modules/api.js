/**
 * api.js - Django integration and API communication
 * Keystroke Kingdom v6.0
 */

import { gameState } from './gameState.js';
import { GAME_CONSTANTS } from './config.js';

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get CSRF token from cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get CSRF token (from cookie or Django context)
export function getCSRFToken() {
    return window.DJANGO_CONFIG?.csrfToken || getCookie('csrftoken');
}

// Check if user is authenticated
export function isUserAuthenticated() {
    return window.DJANGO_CONFIG?.isAuthenticated || false;
}

// Internal save function
async function _saveGameToServer() {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping server save');
        return;
    }

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                game_state: gameState,
                day: gameState.currentDay,
                employment: gameState.employment,
                inflation: gameState.inflation,
                services_score: gameState.servicesScore
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Game saved to server');
        } else {
            console.error('Failed to save game:', data.error);
        }
    } catch (error) {
        console.error('Error saving game:', error);
    }
}

// Debounced save function - prevents excessive API calls
export const saveGameToServer = debounce(_saveGameToServer, GAME_CONSTANTS.AUTO_SAVE_DEBOUNCE_MS);

// Force immediate save (for game over, etc.)
export const saveGameToServerImmediate = _saveGameToServer;

// Load game from server
export async function loadGameFromServer() {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping server load');
        return null;
    }

    try {
        const response = await fetch('/api/load', {
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        const data = await response.json();
        if (data.success && data.data) {
            console.log('Game loaded from server');
            return data.data.game_state;
        } else {
            console.log('No saved game found on server');
            return null;
        }
    } catch (error) {
        console.error('Error loading game:', error);
        return null;
    }
}

// Submit high score to server
export async function submitHighScoreToServer(finalScore) {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping score submission');
        return;
    }

    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                score: finalScore,
                final_day: gameState.currentDay,
                employment: gameState.employment,
                inflation: gameState.inflation,
                services: gameState.servicesScore
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('High score submitted successfully');
        } else {
            console.error('Failed to submit score:', data.error);
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Load leaderboard from server
export async function loadLeaderboardFromServer(limit = 50) {
    try {
        const response = await fetch(`/api/leaderboard?limit=${limit}`);
        const data = await response.json();

        if (data.success) {
            return data.data;
        } else {
            console.error('Failed to load leaderboard:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
    }
}

// Call Claude API through Django proxy
export async function callClaudeAPIProxy(messages) {
    if (!isUserAuthenticated()) {
        return {
            success: false,
            error: 'Please log in to use the Economic Advisor'
        };
    }

    try {
        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                messages: messages
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling Claude API:', error);
        return {
            success: false,
            error: 'Failed to connect to Economic Advisor'
        };
    }
}
