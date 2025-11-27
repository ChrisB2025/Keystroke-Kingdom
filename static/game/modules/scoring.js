/**
 * scoring.js - Scoring and leaderboard functionality
 * Keystroke Kingdom v6.0
 *
 * Note: localStorage high score functions have been removed.
 * All scoring is now handled via the server API for authenticated users.
 */

import { gameState } from './gameState.js';
import { submitHighScoreToServer, loadLeaderboardFromServer } from './api.js';

// End the game and calculate final score
export function endGame() {
    gameState.gameOver = true;

    // Darken and disable the game container
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.classList.add('game-over');
    }

    // Calculate final score
    const employmentScore = gameState.employment * 2;
    const inflationPenalty = Math.abs(gameState.inflation - 2.5) * 10;
    const servicesBonus = gameState.servicesScore * 1.5;

    gameState.finalScore = Math.max(0, employmentScore + servicesBonus - inflationPenalty);

    // Submit high score to server (if authenticated)
    submitHighScoreToServer(gameState.finalScore);

    // Show game over modal
    showGameOverModal();
}

// Show game over modal
export function showGameOverModal() {
    const modal = document.getElementById('gameOverModal');
    if (!modal) return;

    // Set title
    const titleEl = document.getElementById('gameOverTitle');
    if (titleEl) titleEl.textContent = 'Game Complete!';

    // Set message
    const message = `Congratulations! You completed 30 days of economic management.`;
    const messageEl = document.getElementById('gameOverMessage');
    if (messageEl) {
        messageEl.innerHTML = `<p style="text-align: center; margin: 16px 0;">${message}</p>`;
    }

    // Set stats
    const statsEl = document.getElementById('gameOverStats');
    if (statsEl) {
        const employmentColor = gameState.employment >= 95 ? '#059669' : gameState.employment >= 85 ? '#d97706' : '#dc2626';
        const inflationColor = (gameState.inflation >= 2 && gameState.inflation <= 3) ? '#059669' : (gameState.inflation >= 1 && gameState.inflation <= 4) ? '#d97706' : '#dc2626';

        statsEl.innerHTML = `
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 12px 0; text-align: center; color: #2d3748;">Final Score: ${gameState.finalScore.toFixed(0)}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                    <div style="text-align: center;">
                        <div style="color: #64748b; margin-bottom: 4px;">Final Employment</div>
                        <div style="font-weight: bold; font-size: 16px; color: ${employmentColor};">${gameState.employment.toFixed(1)}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; margin-bottom: 4px;">Final Inflation</div>
                        <div style="font-weight: bold; font-size: 16px; color: ${inflationColor};">${gameState.inflation.toFixed(1)}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; margin-bottom: 4px;">Services Score</div>
                        <div style="font-weight: bold; font-size: 16px; color: #4338ca;">${gameState.servicesScore.toFixed(0)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; margin-bottom: 4px;">Capacity Used</div>
                        <div style="font-weight: bold; font-size: 16px; color: #7c3aed;">${gameState.capacityUsed.toFixed(0)}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Show modal
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Show high scores modal
export async function showHighScores() {
    const modal = document.getElementById('highScoresModal');
    if (!modal) return;

    modal.classList.add('active');
    modal.style.display = 'flex';

    // Load from server API
    const highscores = await loadLeaderboardFromServer(50);
    const list = document.getElementById('highScoresList');

    if (!list) return;

    if (highscores && highscores.length > 0) {
        list.innerHTML = `<table class="highscore-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${highscores.map((score, index) => `
                    <tr>
                        <td class="highscore-rank">${index + 1}</td>
                        <td>${escapeHtml(score.username)}</td>
                        <td class="highscore-score">${score.score}</td>
                        <td class="highscore-date">${new Date(score.achieved_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    } else {
        list.innerHTML = '<p style="text-align:center; padding: 20px; color: #64748b;">No high scores yet. Be the first to play!</p>';
    }
}

// Close high scores modal
export function closeHighScores() {
    const modal = document.getElementById('highScoresModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
