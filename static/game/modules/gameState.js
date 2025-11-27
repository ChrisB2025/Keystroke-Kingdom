/**
 * gameState.js - Game state management with memoization
 * Keystroke Kingdom v6.0
 */

import { GAME_CONSTANTS } from './config.js';

// Cache for computed values
let computedCache = {
    totalCapacity: null,
    aggregateDemand: null,
    demandGap: null,
    unemploymentRate: null,
    lastStateHash: null
};

// Initial game state factory
export function createInitialState() {
    return {
        currentDay: 1,
        totalDays: GAME_CONSTANTS.TOTAL_DAYS,
        actionsRemaining: GAME_CONSTANTS.ACTIONS_PER_TURN,

        employment: GAME_CONSTANTS.INITIAL_EMPLOYMENT,
        inflation: GAME_CONSTANTS.INITIAL_INFLATION,
        servicesScore: GAME_CONSTANTS.INITIAL_SERVICES,

        capacity: {
            energy: GAME_CONSTANTS.INITIAL_CAPACITY,
            skills: GAME_CONSTANTS.INITIAL_CAPACITY,
            logistics: GAME_CONSTANTS.INITIAL_CAPACITY
        },
        capacityUsed: GAME_CONSTANTS.INITIAL_EMPLOYMENT,

        publicSpending: GAME_CONSTANTS.INITIAL_PUBLIC_SPENDING,
        privateCredit: GAME_CONSTANTS.INITIAL_PRIVATE_CREDIT,
        netExports: GAME_CONSTANTS.INITIAL_NET_EXPORTS,

        taxRate: GAME_CONSTANTS.INITIAL_TAX_RATE,
        policyRate: GAME_CONSTANTS.INITIAL_POLICY_RATE,

        jgEnabled: false,
        jgWage: 15,
        jgPoolSize: 0,

        creditRegulation: 0,
        yieldControl: false,
        iorEnabled: false,

        currencyIssued: 0,
        taxesDeleted: 0,

        finalScore: 0,
        gameOver: false,

        // Economic Events System
        events: {
            triggeredEvents: [],
            activeEvent: null,
            eventHistory: [],
            mmtInsightsShown: [],
            eventCounter: 0
        }
    };
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

// State update helpers
export function useAction() {
    if (gameState.actionsRemaining > 0) {
        gameState.actionsRemaining--;
        invalidateCache();
        return true;
    }
    return false;
}

export function resetState() {
    Object.assign(gameState, createInitialState());
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
