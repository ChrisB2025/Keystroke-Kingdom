/**
 * main.js - Main entry point and initialization
 * Keystroke Kingdom v6.0
 *
 * This module orchestrates all game modules and provides
 * backward-compatible window exports for HTML onclick handlers.
 */

// Import all modules
import { gameState, loadState } from './gameState.js';
import { updateDisplay } from './ui.js';
import {
    nextTurn,
    publicSpending,
    investInCapacity,
    importGoods,
    toggleJobGuarantee,
    adjustTax,
    adjustPolicyRate,
    setJGWage,
    applyMacroprudential,
    regulatePrivateCredit,
    fundProject,
    toggleYieldControl,
    toggleIOR,
    selectLocation
} from './engine.js';
import {
    closeEventModal,
    closeEventResultModal,
    handleEventChoiceByIndex
} from './events.js';
import {
    openAdvisor,
    closeAdvisor,
    askAdvisor,
    askQuickAdvisorQuestion
} from './advisor.js';
import {
    showHighScores,
    closeHighScores
} from './scoring.js';
import { loadGameFromServer } from './api.js';

// Initialize the game
async function init() {
    console.log('=== INIT STARTING ===');

    // Try to load saved game from server
    const savedState = await loadGameFromServer();
    if (savedState) {
        loadState(savedState);
        console.log('Loaded saved game state');
    }

    updateDisplay();
    selectLocation('treasury');

    // Set up onclick handlers using function assignment (CSP-friendly)
    setupEventHandlers();

    console.log('=== INIT COMPLETE ===');
    console.log('Using ES6 modules with onclick function assignment (CSP-friendly)');
}

// Set up event handlers for modals
function setupEventHandlers() {
    const eventCloseBtn = document.getElementById('eventModalCloseBtn');
    if (eventCloseBtn) {
        eventCloseBtn.onclick = () => {
            console.log('Event modal close clicked');
            closeEventModal();
        };
    }

    const resultContinueBtn = document.getElementById('eventResultContinueBtn');
    if (resultContinueBtn) {
        resultContinueBtn.onclick = () => {
            console.log('Event result continue clicked');
            closeEventResultModal();
        };
    }

    const advisorFab = document.getElementById('advisorFab');
    if (advisorFab) {
        advisorFab.onclick = () => {
            console.log('Advisor FAB clicked');
            openAdvisor();
        };
    }

    // Handle Enter key in advisor input
    const advisorInput = document.getElementById('advisorInput');
    if (advisorInput) {
        advisorInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                askAdvisor();
            }
        });
    }
}

// Export functions to window for backward compatibility with HTML onclick handlers
window.publicSpending = publicSpending;
window.investInCapacity = investInCapacity;
window.importGoods = importGoods;
window.toggleJobGuarantee = toggleJobGuarantee;
window.adjustTax = adjustTax;
window.adjustPolicyRate = adjustPolicyRate;
window.setJGWage = setJGWage;
window.applyMacroprudential = applyMacroprudential;
window.fundProject = fundProject;
window.toggleYieldControl = toggleYieldControl;
window.toggleIOR = toggleIOR;
window.regulatePrivateCredit = regulatePrivateCredit;
window.selectLocation = selectLocation;
window.nextTurn = nextTurn;

// Event system functions
window.closeEventModal = closeEventModal;
window.closeEventResultModal = closeEventResultModal;
window.handleEventChoiceByIndex = handleEventChoiceByIndex;

// Advisor functions
window.openAdvisor = openAdvisor;
window.closeAdvisor = closeAdvisor;
window.askAdvisor = askAdvisor;
window.askQuickAdvisorQuestion = askQuickAdvisorQuestion;

// Scoring functions
window.showHighScores = showHighScores;
window.closeHighScores = closeHighScores;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
