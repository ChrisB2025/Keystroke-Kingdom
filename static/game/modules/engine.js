/**
 * engine.js - Economic calculations and game mechanics
 * Keystroke Kingdom v6.0
 */

import { gameState, useAction, invalidateCache, getTotalCapacity, getAggregateDemand } from './gameState.js';
import { GAME_CONSTANTS } from './config.js';
import { updateDisplay, showEconomicNarrative } from './ui.js';
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

    // Job Guarantee effects
    if (gameState.jgEnabled) {
        const unemploymentRate = 100 - gameState.employment;
        gameState.jgPoolSize = unemploymentRate * GAME_CONSTANTS.JG_ABSORPTION_RATE;
        const jgSpending = gameState.jgPoolSize * gameState.jgWage * 0.01;
        gameState.publicSpending += jgSpending * 0.1;
    }

    // Random capacity fluctuations
    gameState.capacity.energy += Math.random() * 0.3 - 0.1;
    gameState.capacity.skills += Math.random() * 0.3 - 0.1;
    gameState.capacity.logistics += Math.random() * 0.3 - 0.1;
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

    invalidateCache();
    updateDisplay();
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

    invalidateCache();
    updateDisplay();
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
    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Adjust tax rate
export function adjustTax(amount) {
    if (!useAction()) return;

    gameState.taxRate = Math.max(
        GAME_CONSTANTS.MIN_TAX_RATE,
        Math.min(GAME_CONSTANTS.MAX_TAX_RATE, gameState.taxRate + amount)
    );

    const totalTaxes = gameState.publicSpending * (gameState.taxRate / 100);
    gameState.taxesDeleted = totalTaxes;

    invalidateCache();
    updateDisplay();
    saveGameToServer();
}

// Adjust policy rate
export function adjustPolicyRate(amount) {
    if (!useAction()) return;

    gameState.policyRate = Math.max(
        GAME_CONSTANTS.MIN_POLICY_RATE,
        Math.min(GAME_CONSTANTS.MAX_POLICY_RATE, gameState.policyRate + amount)
    );

    invalidateCache();
    updateDisplay();
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
