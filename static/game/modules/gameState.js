/**
 * gameState.js - Game state management with memoization
 * Keystroke Kingdom v7.0 - Enhanced Drama & Gameplay Update
 */

import { GAME_CONSTANTS, DIFFICULTY_SETTINGS, GAME_MODES } from './config.js';

// Cache for computed values
let computedCache = {
    totalCapacity: null,
    aggregateDemand: null,
    demandGap: null,
    unemploymentRate: null,
    lastStateHash: null
};

// Initial game state factory
export function createInitialState(difficulty = 'normal', gameMode = 'standard') {
    const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
    const modeSettings = GAME_MODES[gameMode] || GAME_MODES.standard;

    // Get base values, potentially overridden by game mode
    const baseCapacity = GAME_CONSTANTS.INITIAL_CAPACITY;
    const startingState = modeSettings.startingState || {};

    return {
        // Game Settings
        difficulty: difficulty,
        gameMode: gameMode,
        difficultySettings: diffSettings,

        currentDay: 1,
        totalDays: modeSettings.totalDays || GAME_CONSTANTS.TOTAL_DAYS,
        actionsRemaining: diffSettings.actionsPerTurn,

        employment: startingState.employment ?? GAME_CONSTANTS.INITIAL_EMPLOYMENT,
        inflation: startingState.inflation ?? GAME_CONSTANTS.INITIAL_INFLATION,
        servicesScore: startingState.servicesScore ?? GAME_CONSTANTS.INITIAL_SERVICES,

        capacity: startingState.capacity ? { ...startingState.capacity } : {
            energy: baseCapacity,
            skills: baseCapacity,
            logistics: baseCapacity
        },
        capacityUsed: startingState.employment ?? GAME_CONSTANTS.INITIAL_EMPLOYMENT,

        publicSpending: startingState.publicSpending ?? GAME_CONSTANTS.INITIAL_PUBLIC_SPENDING,
        privateCredit: startingState.privateCredit ?? GAME_CONSTANTS.INITIAL_PRIVATE_CREDIT,
        netExports: startingState.netExports ?? GAME_CONSTANTS.INITIAL_NET_EXPORTS,

        taxRate: startingState.taxRate ?? GAME_CONSTANTS.INITIAL_TAX_RATE,
        policyRate: startingState.policyRate ?? GAME_CONSTANTS.INITIAL_POLICY_RATE,

        jgEnabled: false,
        jgWage: 15,
        jgPoolSize: 0,

        creditRegulation: 0,
        yieldControl: false,
        iorEnabled: false,

        currencyIssued: 0,
        taxesDeleted: 0,

        // MMT Metrics - Deficit and Sectoral Balances
        deficit: 0,
        sectorialBalances: {
            government: -40,
            private: 40,
            external: 0
        },

        // MMT Score Gamification
        mmtScore: 0,
        mmtBadges: [],
        mmtDecisions: {
            aligned: 0,
            hawkish: 0
        },

        finalScore: 0,
        gameOver: false,

        // Economic Events System
        events: {
            triggeredEvents: [],
            activeEvent: null,
            eventHistory: [],
            mmtInsightsShown: [],
            eventCounter: 0,
            pendingChainEvents: [],  // For event chain system
            eventsRepeatable: modeSettings.eventsRepeatable || false
        },

        // Achievement Tracking
        achievements: [],  // Unlocked achievement IDs
        tracking: {
            // Starting values for comparison
            startingCapacity: startingState.capacity ? { ...startingState.capacity } : {
                energy: baseCapacity,
                skills: baseCapacity,
                logistics: baseCapacity
            },
            startingEmployment: startingState.employment ?? GAME_CONSTANTS.INITIAL_EMPLOYMENT,

            // Streak tracking
            fullEmploymentStreak: 0,
            stableInflationStreak: 0,
            jgActiveDays: 0,
            everUsedJG: false,

            // Event/Crisis tracking
            shocksHandled: 0,
            recessionDays: 0,
            peakInflation: startingState.inflation ?? GAME_CONSTANTS.INITIAL_INFLATION,
            lowestEmployment: startingState.employment ?? GAME_CONSTANTS.INITIAL_EMPLOYMENT,
            tamedInflation: false,
            fastRecovery: false,
            recessionStartDay: null,

            // Investment tracking
            greenInvestment: 0,
            capacityGrowth: 0,

            // Daily snapshots for trend analysis
            dailySnapshots: []
        },

        // Scenario objectives (if applicable)
        objectives: modeSettings.objectives || null
    };
}

// Get difficulty-adjusted value
export function getDifficultyMultiplier(type) {
    const settings = gameState.difficultySettings || DIFFICULTY_SETTINGS.normal;
    switch (type) {
        case 'inflation': return settings.inflationMultiplier;
        case 'eventProbability': return settings.eventProbabilityMultiplier;
        case 'shockSeverity': return settings.shockSeverityMultiplier;
        case 'score': return settings.scoreMultiplier;
        case 'capacityFluctuation': return settings.capacityFluctuationRange;
        default: return 1.0;
    }
}

// The main game state object
export let gameState = createInitialState();

// Generate a simple hash of key state values for cache invalidation
function getStateHash(state) {
    return `${state.capacity.energy}-${state.capacity.skills}-${state.capacity.logistics}-${state.publicSpending}-${state.privateCredit}-${state.netExports}`;
}

// Invalidate cache when state changes
export function invalidateCache() {
    computedCache.lastStateHash = null;
}

// Check if cache needs refresh
function needsCacheRefresh() {
    const currentHash = getStateHash(gameState);
    if (computedCache.lastStateHash !== currentHash) {
        computedCache.lastStateHash = currentHash;
        return true;
    }
    return false;
}

// Memoized computed values
export function getTotalCapacity() {
    if (needsCacheRefresh() || computedCache.totalCapacity === null) {
        computedCache.totalCapacity = Math.min(
            gameState.capacity.energy,
            gameState.capacity.skills,
            gameState.capacity.logistics
        );
    }
    return computedCache.totalCapacity;
}

export function getAggregateDemand() {
    if (needsCacheRefresh() || computedCache.aggregateDemand === null) {
        computedCache.aggregateDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
    }
    return computedCache.aggregateDemand;
}

export function getDemandGap() {
    return getAggregateDemand() - getTotalCapacity();
}

export function getUnemploymentRate() {
    return 100 - gameState.employment;
}

// Calculate deficit (government spending - taxes)
export function getDeficit() {
    return gameState.publicSpending - gameState.taxesDeleted;
}

// Update sectoral balances based on current state
export function updateSectoralBalances() {
    // Government sector balance (deficit positive, surplus negative)
    const govBalance = -(gameState.publicSpending - gameState.taxesDeleted);

    // External sector (from net exports - negative exports = foreign surplus)
    const extBalance = -gameState.netExports;

    // Private sector balance must equal government + external (sectoral balance identity)
    // Private surplus = Government deficit + External deficit
    const pvtBalance = -govBalance + extBalance;

    gameState.sectorialBalances = {
        government: govBalance,
        private: pvtBalance,
        external: extBalance
    };

    // Update deficit tracking
    gameState.deficit = -govBalance;  // Deficit is positive when government runs deficit
}

// State update helpers
export function useAction() {
    if (gameState.actionsRemaining > 0) {
        gameState.actionsRemaining--;
        invalidateCache();
        return true;
    }
    return false;
}

export function resetState(difficulty = 'normal', gameMode = 'standard') {
    Object.assign(gameState, createInitialState(difficulty, gameMode));
    invalidateCache();
}

export function loadState(savedState) {
    if (savedState && typeof savedState === 'object') {
        Object.assign(gameState, savedState);
        invalidateCache();
    }
}

// Track which fields have changed for selective updates
let changedFields = new Set();

export function markFieldChanged(field) {
    changedFields.add(field);
}

export function getChangedFields() {
    return changedFields;
}

export function clearChangedFields() {
    changedFields = new Set();
}

// Batch state updates
export function batchUpdate(updates) {
    Object.entries(updates).forEach(([key, value]) => {
        if (gameState.hasOwnProperty(key)) {
            gameState[key] = value;
            markFieldChanged(key);
        }
    });
    invalidateCache();
}
