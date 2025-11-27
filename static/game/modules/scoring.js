/**
 * scoring.js - Scoring and leaderboard functionality
 * Keystroke Kingdom v7.0 - Enhanced Drama & Gameplay Update
 *
 * Note: localStorage high score functions have been removed.
 * All scoring is now handled via the server API for authenticated users.
 */

import { gameState, getDifficultyMultiplier } from './gameState.js';
import { ACHIEVEMENTS, GAME_MODES } from './config.js';
import { submitHighScoreToServer, loadLeaderboardFromServer } from './api.js';

// End the game and calculate final score
export function endGame() {
    gameState.gameOver = true;

    // Darken and disable the game container
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.classList.add('game-over');
    }

    // Calculate final score with all components
    const scoreBreakdown = calculateDetailedScore();
    gameState.finalScore = scoreBreakdown.total;
    gameState.scoreBreakdown = scoreBreakdown;

    // Submit high score to server (if authenticated)
    submitHighScoreToServer(gameState.finalScore);

    // Show game over modal
    showGameOverModal();
}

// Calculate detailed score breakdown
function calculateDetailedScore() {
    const diffMultiplier = getDifficultyMultiplier('score');

    // Base scores
    const employmentScore = gameState.employment * 2;
    const inflationPenalty = Math.abs(gameState.inflation - 2.5) * 10;
    const servicesBonus = gameState.servicesScore * 1.5;
    const baseScore = Math.max(0, employmentScore + servicesBonus - inflationPenalty);

    // Shock handling bonus (10 points per shock handled)
    const shocksHandled = gameState.tracking?.shocksHandled || 0;
    const shockBonus = shocksHandled * 10;

    // Stability bonuses
    const fullEmploymentDays = gameState.tracking?.fullEmploymentStreak || 0;
    const stableInflationDays = gameState.tracking?.stableInflationStreak || 0;
    const stabilityBonus = (fullEmploymentDays * 2) + (stableInflationDays * 2);

    // Job Guarantee usage bonus
    const jgBonus = (gameState.tracking?.jgActiveDays || 0) * 0.5;

    // Achievement bonus
    const achievementPoints = (gameState.achievements || []).reduce((sum, achId) => {
        const ach = Object.values(ACHIEVEMENTS).find(a => a.id === achId);
        return sum + (ach ? ach.points : 0);
    }, 0);

    // MMT understanding bonus
    const mmtBonus = (gameState.mmtScore || 0) * 0.5;

    // Scenario objective bonus
    let objectiveBonus = 0;
    if (gameState.objectives) {
        const mode = GAME_MODES[gameState.gameMode];
        if (mode && mode.objectives) {
            Object.entries(mode.objectives).forEach(([key, obj]) => {
                if (checkObjective(key, obj.target)) {
                    objectiveBonus += obj.bonus;
                }
            });
        }
    }

    // Calculate subtotal before difficulty multiplier
    const subtotal = baseScore + shockBonus + stabilityBonus + jgBonus + mmtBonus + objectiveBonus;

    // Apply difficulty multiplier
    const total = Math.round(subtotal * diffMultiplier);

    return {
        base: Math.round(baseScore),
        employmentScore: Math.round(employmentScore),
        inflationPenalty: Math.round(inflationPenalty),
        servicesBonus: Math.round(servicesBonus),
        shockBonus: Math.round(shockBonus),
        stabilityBonus: Math.round(stabilityBonus),
        jgBonus: Math.round(jgBonus),
        mmtBonus: Math.round(mmtBonus),
        achievementPoints: Math.round(achievementPoints),
        objectiveBonus: Math.round(objectiveBonus),
        diffMultiplier: diffMultiplier,
        subtotal: Math.round(subtotal),
        total: total
    };
}

// Check if a scenario objective was met
function checkObjective(key, target) {
    switch (key) {
        case 'employment':
            return gameState.employment >= target;
        case 'inflationTarget':
            return gameState.inflation <= target;
        case 'employmentFloor':
            return gameState.employment >= target;
        case 'stabilityStreak':
            return (gameState.tracking?.fullEmploymentStreak || 0) >= target;
        case 'greenInvestment':
            return (gameState.tracking?.greenInvestment || 0) >= target;
        case 'capacityGrowth':
            return (gameState.tracking?.capacityGrowth || 0) >= target;
        default:
            return false;
    }
}

// Show game over modal with detailed breakdown
export function showGameOverModal() {
    const modal = document.getElementById('gameOverModal');
    if (!modal) return;

    const breakdown = gameState.scoreBreakdown || {};
    const difficulty = gameState.difficulty || 'normal';
    const gameMode = gameState.gameMode || 'standard';

    // Set title
    const titleEl = document.getElementById('gameOverTitle');
    if (titleEl) titleEl.textContent = 'Game Complete!';

    // Set message based on performance
    let message = '';
    if (gameState.employment >= 95 && gameState.inflation >= 2 && gameState.inflation <= 3) {
        message = 'Outstanding! You achieved the economic ideal - full employment with stable prices!';
    } else if (gameState.employment >= 90) {
        message = 'Great job! You maintained strong employment throughout your term.';
    } else if (gameState.inflation < 2) {
        message = 'You kept inflation low, but there may have been room for more economic activity.';
    } else {
        message = 'You completed your term. Review the breakdown to see how you can improve!';
    }

    const messageEl = document.getElementById('gameOverMessage');
    if (messageEl) {
        messageEl.innerHTML = `<p style="text-align: center; margin: 16px 0;">${message}</p>`;
    }

    // Set detailed stats
    const statsEl = document.getElementById('gameOverStats');
    if (statsEl) {
        const employmentColor = gameState.employment >= 95 ? '#059669' : gameState.employment >= 85 ? '#d97706' : '#dc2626';
        const inflationColor = (gameState.inflation >= 2 && gameState.inflation <= 3) ? '#059669' : (gameState.inflation >= 1 && gameState.inflation <= 4) ? '#d97706' : '#dc2626';

        // Generate bonus breakdown HTML
        const bonusItems = [];
        if (breakdown.shockBonus > 0) bonusItems.push(`Shocks Handled: +${breakdown.shockBonus}`);
        if (breakdown.stabilityBonus > 0) bonusItems.push(`Stability: +${breakdown.stabilityBonus}`);
        if (breakdown.jgBonus > 0) bonusItems.push(`Job Guarantee: +${breakdown.jgBonus}`);
        if (breakdown.mmtBonus > 0) bonusItems.push(`MMT Understanding: +${breakdown.mmtBonus}`);
        if (breakdown.objectiveBonus > 0) bonusItems.push(`Objectives Met: +${breakdown.objectiveBonus}`);

        const bonusHtml = bonusItems.length > 0 ?
            `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">BONUSES</div>
                ${bonusItems.map(b => `<div style="font-size: 12px; color: #059669;">${b}</div>`).join('')}
            </div>` : '';

        const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        const multiplierHtml = breakdown.diffMultiplier !== 1 ?
            `<div style="text-align: center; margin-top: 8px; font-size: 12px; color: #7c3aed;">
                ${difficultyLabel} Difficulty: x${breakdown.diffMultiplier}
            </div>` : '';

        statsEl.innerHTML = `
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 12px 0; text-align: center; color: #2d3748;">
                    Final Score: ${gameState.finalScore}
                </h3>
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
                        <div style="color: #64748b; margin-bottom: 4px;">Events Handled</div>
                        <div style="font-weight: bold; font-size: 16px; color: #7c3aed;">${gameState.tracking?.shocksHandled || 0}</div>
                    </div>
                </div>
                ${bonusHtml}
                ${multiplierHtml}
            </div>
            <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 8px;">
                Achievements Unlocked: ${(gameState.achievements || []).length} / ${Object.keys(ACHIEVEMENTS).length}
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
