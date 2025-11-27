/**
 * engine.js - Economic calculations and game mechanics
 * Keystroke Kingdom v6.0
 */

import { gameState, useAction, invalidateCache, getTotalCapacity, getAggregateDemand, updateSectoralBalances } from './gameState.js';
import { GAME_CONSTANTS } from './config.js';
import { updateDisplay, showEconomicNarrative, showFloatingFeedback, pulseElement, updateRecommendedActions, showMMTInsight, awardMMTPoints, penalizeHawkishThinking } from './ui.js';
import { checkForEvents } from './events.js';
import { saveGameToServer } from './api.js';
import { endGame } from './scoring.js';

// Advance to next turn
export function nextTurn() {
    if (gameState.gameOver) return;

    gameState.currentDay++;
    gameState.actionsRemaining = GAME_CONSTANTS.ACTIONS_PER_TURN;

    evolveEconomy();
    calculateInflation();
    updateEmployment();

    invalidateCache();

    // Check if game should end at day 30
    if (gameState.currentDay > gameState.totalDays) {
        endGame();
    } else {
        updateDisplay();
        showEconomicNarrative();

        // Update recommended actions based on new state
        updateRecommendedActions();

        // Check for economic events
        checkForEvents();

        // Auto-save (debounced)
        saveGameToServer();
    }
}

// Evolve the economy each turn
export function evolveEconomy() {
    // Private credit growth based on policy rate and regulation
    const privCreditGrowth = 0.5 - (gameState.policyRate / 20) + (gameState.creditRegulation * 0.3);
    gameState.privateCredit += privCreditGrowth;
    gameState.privateCredit = Math.max(GAME_CONSTANTS.MIN_PRIVATE_CREDIT, gameState.privateCredit);

    // Tax effect on private credit
    const taxMultiplier = 1 - (gameState.taxRate / 100) * 0.7;
    gameState.privateCredit *= (0.98 + taxMultiplier * 0.02);

    // Calculate taxes deleted based on current spending and tax rate
    const totalTaxes = gameState.publicSpending * (gameState.taxRate / 100);
    gameState.taxesDeleted = totalTaxes;

    // Job Guarantee effects
    if (gameState.jgEnabled) {
        const unemploymentRate = 100 - gameState.employment;
        gameState.jgPoolSize = unemploymentRate * GAME_CONSTANTS.JG_ABSORPTION_RATE;
        const jgSpending = gameState.jgPoolSize * gameState.jgWage * 0.01;
        gameState.publicSpending += jgSpending * 0.1;
        gameState.currencyIssued += jgSpending * 0.1;
    }

    // Random capacity fluctuations
    gameState.capacity.energy += Math.random() * 0.3 - 0.1;
    gameState.capacity.skills += Math.random() * 0.3 - 0.1;
    gameState.capacity.logistics += Math.random() * 0.3 - 0.1;

    // Update sectoral balances at end of turn
    updateSectoralBalances();
}

// Calculate inflation based on demand vs capacity
export function calculateInflation() {
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();

    gameState.capacityUsed = Math.min(100, (aggDemand / totalCapacity) * 100);

    const demandGap = aggDemand - totalCapacity;

    if (demandGap > 0) {
        const baseInflation = Math.pow(demandGap / totalCapacity, 1.5) * 10;
        gameState.inflation = 2.0 + baseInflation;
    } else {
        const deflationPressure = Math.abs(demandGap) / totalCapacity;
        gameState.inflation = Math.max(0, 2.0 - deflationPressure * 3);
    }

    // Job Guarantee stabilizes inflation
    if (gameState.jgEnabled) {
        gameState.inflation *= 0.9;
    }
}

// Update employment based on demand
export function updateEmployment() {
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();

    const baseEmployment = 60 + (aggDemand / totalCapacity) * 35;
    gameState.employment = Math.min(
        GAME_CONSTANTS.MAX_EMPLOYMENT,
        Math.max(GAME_CONSTANTS.MIN_EMPLOYMENT, baseEmployment)
    );

    // Job Guarantee absorbs unemployment
    if (gameState.jgEnabled) {
        const unemploymentRate = 100 - gameState.employment;
        const jgAbsorption = unemploymentRate * GAME_CONSTANTS.JG_ABSORPTION_RATE;
        gameState.employment += jgAbsorption;
        gameState.employment = Math.min(GAME_CONSTANTS.MAX_EMPLOYMENT, gameState.employment);
    }
}

// Public spending action
export function publicSpending(sector, amount) {
    if (!useAction()) return;

    gameState.publicSpending += amount;
    gameState.currencyIssued += amount;

    // Update sectoral balances after spending change
    updateSectoralBalances();

    // MMT Teaching Moment: Show insight on first few spending actions
    if (gameState.currentDay <= 10) {
        showMMTInsight('spending_creates_money');
    }

    // Award MMT points for using fiscal policy appropriately
    const demandGap = getAggregateDemand() - getTotalCapacity();
    if (amount > 0 && demandGap < 0) {
        // Spending when there's slack - MMT-aligned!
        awardMMTPoints(5, 'Fiscal expansion with spare capacity');
    } else if (amount > 0 && demandGap > 20 && gameState.inflation > 4) {
        // Spending when already overheating - risky but educational
        setTimeout(() => {
            showMMTInsight('real_resource_constraint');
        }, 500);
    }

    // Track deficit for MMT insight
    if (gameState.deficit > 20 && !gameState.events.mmtInsightsShown.includes('deficit_is_private_wealth')) {
        setTimeout(() => {
            showMMTInsight('deficit_is_private_wealth');
        }, 1000);
    }

    // Sector-specific services bonuses
    const sectorBonuses = {
        healthcare: 2,
        education: 2,
        infrastructure: 1.5,
        consumption: 1,
        stimulus: 1.5,
        training: 1.5,
        wages: 1,
        green: 2
    };

    if (sectorBonuses[sector]) {
        gameState.servicesScore += sectorBonuses[sector];
    }

    // Show visual feedback
    const feedbackType = amount > 0 ? 'positive' : 'negative';
    const feedbackText = amount > 0 ? `+$${amount}B` : `-$${Math.abs(amount)}B`;
    showFloatingFeedback(feedbackText, feedbackType);

    // Pulse affected stats
    pulseElement('pubSpend');
    if (sectorBonuses[sector]) {
        pulseElement('servicesStat');
    }

    invalidateCache();
    updateDisplay();
    updateRecommendedActions();
    saveGameToServer();
}

// Invest in capacity
export function investInCapacity(type) {
    if (!useAction()) return;

    const investAmount = 10;
    if (type === 'energy') gameState.capacity.energy += investAmount;
    if (type === 'skills') gameState.capacity.skills += investAmount;
    if (type === 'logistics') gameState.capacity.logistics += investAmount;

    gameState.publicSpending += 3;
    gameState.currencyIssued += 3;

    // Update sectoral balances
    updateSectoralBalances();

    // MMT Teaching Moment: Show insight about expanding productive capacity
    if (gameState.capacityUsed > 85 || gameState.inflation > 3) {
        showMMTInsight('capacity_investment');
        awardMMTPoints(10, 'Expanding productive capacity');
    }

    // Show visual feedback
    showFloatingFeedback(`+${investAmount} ${type}`, 'positive');
    pulseElement(`${type}Bar`);

    invalidateCache();
    updateDisplay();
    updateRecommendedActions();
    saveGameToServer();
}

// Import goods
export function importGoods() {
    if (!useAction()) return;

    gameState.netExports -= 5;
    gameState.capacity.energy += 2;
    gameState.capacity.skills += 2;
    gameState.capacity.logistics += 2;

    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Toggle Job Guarantee
export function toggleJobGuarantee() {
    if (!useAction()) return;

    gameState.jgEnabled = !gameState.jgEnabled;

    // MMT Teaching Moments for Job Guarantee
    if (gameState.jgEnabled) {
        const unemploymentRate = 100 - gameState.employment;

        // Show buffer stock insight
        showMMTInsight('jg_buffer_stock');
        awardMMTPoints(15, 'Enabled Job Guarantee');

        // If enabling JG with significant unemployment, extra insight
        if (unemploymentRate > 10) {
            setTimeout(() => {
                showMMTInsight('jg_price_anchor');
            }, 2000);
        }
    }

    // Show visual feedback
    const status = gameState.jgEnabled ? 'ON' : 'OFF';
    showFloatingFeedback(`Job Guarantee: ${status}`, gameState.jgEnabled ? 'positive' : 'neutral');
    pulseElement('jgIndicator');
    pulseElement('employmentStat');

    invalidateCache();
    updateDisplay();
    updateRecommendedActions();
    saveGameToServer();
}

// Adjust tax rate
export function adjustTax(amount) {
    if (!useAction()) return;

    const oldTaxRate = gameState.taxRate;
    gameState.taxRate = Math.max(
        GAME_CONSTANTS.MIN_TAX_RATE,
        Math.min(GAME_CONSTANTS.MAX_TAX_RATE, gameState.taxRate + amount)
    );

    const totalTaxes = gameState.publicSpending * (gameState.taxRate / 100);
    gameState.taxesDeleted = totalTaxes;

    // Update sectoral balances
    updateSectoralBalances();

    // MMT Teaching Moment: Taxes delete money
    if (gameState.currentDay <= 15) {
        showMMTInsight('taxes_delete_money');
    }

    // MMT scoring based on context
    const demandGap = getAggregateDemand() - getTotalCapacity();

    if (amount > 0 && demandGap > 15 && gameState.inflation > 4) {
        // Raising taxes when overheating - MMT-aligned!
        awardMMTPoints(10, 'Cooling overheated economy with taxes');
    } else if (amount > 0 && demandGap < -10 && gameState.employment < 90) {
        // Raising taxes during slack - "deficit hawk" thinking
        penalizeHawkishThinking(5, 'Contractionary policy during recession');
    } else if (amount < 0 && demandGap < 0) {
        // Cutting taxes when there's slack - reasonable
        awardMMTPoints(5, 'Stimulative tax cut with spare capacity');
    }

    // Sectoral balances insight if running a surplus
    if (gameState.deficit < 0) {
        setTimeout(() => {
            showMMTInsight('sectoral_balances');
        }, 500);
    }

    // Show visual feedback
    const feedbackText = amount > 0 ? `+${amount}% tax` : `${amount}% tax`;
    showFloatingFeedback(feedbackText, amount > 0 ? 'neutral' : 'positive');
    pulseElement('taxRateStat');

    invalidateCache();
    updateDisplay();
    updateRecommendedActions();
    saveGameToServer();
}

// Adjust policy rate
export function adjustPolicyRate(amount) {
    if (!useAction()) return;

    gameState.policyRate = Math.max(
        GAME_CONSTANTS.MIN_POLICY_RATE,
        Math.min(GAME_CONSTANTS.MAX_POLICY_RATE, gameState.policyRate + amount)
    );

    // Show visual feedback
    const feedbackText = amount > 0 ? `+${amount}% rate` : `${amount}% rate`;
    showFloatingFeedback(feedbackText, 'neutral');
    pulseElement('policyRateStat');

    invalidateCache();
    updateDisplay();
    updateRecommendedActions();
    saveGameToServer();
}

// Set Job Guarantee wage
export function setJGWage(value) {
    if (!useAction()) {
        const input = document.getElementById('jgWageInput');
        const display = document.getElementById('jgWageDisplay');
        if (input) input.value = gameState.jgWage;
        if (display) display.textContent = gameState.jgWage;
        return;
    }

    gameState.jgWage = parseInt(value);
    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Apply macroprudential regulation
export function applyMacroprudential(type) {
    if (type === 'tighten') {
        gameState.creditRegulation = -1;
    } else if (type === 'loosen') {
        gameState.creditRegulation = 1;
    } else {
        gameState.creditRegulation = 0;
    }

    invalidateCache();
    updateDisplay();
    selectLocation('central-bank');
    saveGameToServer();
}

// Regulate private credit (wrapper that consumes action)
export function regulatePrivateCredit(type) {
    if (!useAction()) return;
    applyMacroprudential(type);
}

// Fund project
export function fundProject(project) {
    if (!useAction()) return;

    gameState.publicSpending += 3;
    gameState.currencyIssued += 3;
    gameState.servicesScore += 1.5;

    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Toggle yield control
export function toggleYieldControl() {
    if (!useAction()) return;

    gameState.yieldControl = !gameState.yieldControl;
    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Toggle interest on reserves
export function toggleIOR() {
    if (!useAction()) return;

    gameState.iorEnabled = !gameState.iorEnabled;
    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Select location (UI navigation)
export function selectLocation(location, event) {
    // Update button active state
    document.querySelectorAll('.location-btn').forEach(btn => btn.classList.remove('active'));

    if (event && event.target) {
        event.target.closest('.location-btn').classList.add('active');
    } else {
        // If no event (programmatic call), find and activate the correct button
        const buttons = document.querySelectorAll('.location-btn');
        const locationIndex = {
            'treasury': 0,
            'central-bank': 1,
            'demand': 2,
            'investment': 3,
            'employment': 4,
            'trade': 5
        };
        if (buttons[locationIndex[location]]) {
            buttons[locationIndex[location]].classList.add('active');
        }
    }

    // Hide all location content
    document.querySelectorAll('.location-content').forEach(content => {
        content.classList.remove('active');
    });

    // Show selected location content
    const selectedContent = document.getElementById(`${location}-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
}
