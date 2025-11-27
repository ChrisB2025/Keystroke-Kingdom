/**
 * events.js - Economic events system with drama and chain reactions
 * Keystroke Kingdom v7.0 - Enhanced Drama & Gameplay Update
 */

import { gameState, invalidateCache, getDifficultyMultiplier } from './gameState.js';
import { economicEvents, GAME_CONSTANTS, EVENT_CHAINS, ACHIEVEMENTS } from './config.js';
import { updateDisplay, showAchievementUnlock } from './ui.js';

// Current event data for modal handlers
let currentEventData = null;
let currentEventChoices = null;

export function getCurrentEventData() {
    return currentEventData;
}

export function getCurrentEventChoices() {
    return currentEventChoices;
}

// Check for and potentially trigger events (including chain events)
export function checkForEvents() {
    if (gameState.gameOver) return;
    if (gameState.events.activeEvent) return; // Only one event at a time

    // First, check for pending chain events
    if (checkPendingChainEvents()) return;

    // Convert economicEvents object to array
    const availableEvents = Object.values(economicEvents);

    // Get difficulty multiplier for event probability
    const probMultiplier = getDifficultyMultiplier('eventProbability');

    // Filter eligible events
    const eligibleEvents = availableEvents.filter(event => {
        const [minDay, maxDay] = event.dayRange;
        const inDayRange = gameState.currentDay >= minDay && gameState.currentDay <= maxDay;

        // In sandbox mode with repeatable events, allow re-triggering
        const notTriggered = gameState.events.eventsRepeatable ||
                            !gameState.events.triggeredEvents.includes(event.id);

        const conditionMet = event.condition(gameState);

        return inDayRange && notTriggered && conditionMet;
    });

    if (eligibleEvents.length === 0) return;

    // Check each eligible event against its probability (adjusted for difficulty)
    for (const event of eligibleEvents) {
        const adjustedProbability = event.probability * probMultiplier;
        if (Math.random() < adjustedProbability) {
            triggerEvent(event);
            break; // Only trigger one event per check
        }
    }
}

// Check and trigger pending chain events
function checkPendingChainEvents() {
    if (!gameState.events.pendingChainEvents ||
        gameState.events.pendingChainEvents.length === 0) return false;

    // Find events that are due to trigger
    const dueEvents = gameState.events.pendingChainEvents.filter(
        pending => pending.triggerDay <= gameState.currentDay
    );

    if (dueEvents.length === 0) return false;

    // Get the first due event
    const pending = dueEvents[0];

    // Remove from pending list
    gameState.events.pendingChainEvents = gameState.events.pendingChainEvents.filter(
        p => p !== pending
    );

    // Check condition before triggering
    const chain = EVENT_CHAINS[pending.chainId];
    if (chain && chain.condition(gameState)) {
        const followUpEvent = economicEvents[pending.eventId];
        if (followUpEvent) {
            // Add drama: show chain event warning
            console.log(`Chain event triggered: ${followUpEvent.name}`);
            triggerEvent(followUpEvent, true); // Mark as chain event
            return true;
        }
    }

    return false;
}

// Schedule a chain event for future triggering
export function scheduleChainEvent(chainId, triggeredEventId) {
    const chain = EVENT_CHAINS[chainId];
    if (!chain) return;

    // Check if this chain applies to the triggered event
    if (chain.trigger !== triggeredEventId) return;

    // Roll probability
    if (Math.random() > chain.probability) return;

    // Calculate trigger day
    const delay = chain.delayDays.min +
                  Math.floor(Math.random() * (chain.delayDays.max - chain.delayDays.min + 1));
    const triggerDay = gameState.currentDay + delay;

    // Add to pending events
    if (!gameState.events.pendingChainEvents) {
        gameState.events.pendingChainEvents = [];
    }

    gameState.events.pendingChainEvents.push({
        chainId: chainId,
        eventId: chain.followUp,
        triggerDay: triggerDay,
        originalEvent: triggeredEventId
    });

    console.log(`Chain event scheduled: ${chain.followUp} on day ${triggerDay}`);
}

// Trigger a specific event
export function triggerEvent(event, isChainEvent = false) {
    gameState.events.activeEvent = event;
    gameState.events.triggeredEvents.push(event.id);
    gameState.events.eventCounter++;

    // Apply immediate effects (adjusted for difficulty)
    applyEventEffects(event.effects);

    // Check for chain events this might trigger
    Object.keys(EVENT_CHAINS).forEach(chainId => {
        scheduleChainEvent(chainId, event.id);
    });

    invalidateCache();
    updateDisplay();
    showEventModal(event, isChainEvent);
}

// Apply event effects to game state (with difficulty scaling for shocks)
function applyEventEffects(effects) {
    if (!effects) return;

    // Get shock severity multiplier based on difficulty
    const severityMultiplier = getDifficultyMultiplier('shockSeverity');

    // Track if this is a negative shock for achievement purposes
    let isNegativeShock = false;

    if (effects.capacity) {
        if (effects.capacity.energy) {
            const adjustedEffect = effects.capacity.energy < 0 ?
                effects.capacity.energy * severityMultiplier :
                effects.capacity.energy;
            gameState.capacity.energy += adjustedEffect;
            gameState.capacity.energy = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.energy);
            if (effects.capacity.energy < 0) isNegativeShock = true;
        }
        if (effects.capacity.skills) {
            const adjustedEffect = effects.capacity.skills < 0 ?
                effects.capacity.skills * severityMultiplier :
                effects.capacity.skills;
            gameState.capacity.skills += adjustedEffect;
            gameState.capacity.skills = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.skills);
            if (effects.capacity.skills < 0) isNegativeShock = true;
        }
        if (effects.capacity.logistics) {
            const adjustedEffect = effects.capacity.logistics < 0 ?
                effects.capacity.logistics * severityMultiplier :
                effects.capacity.logistics;
            gameState.capacity.logistics += adjustedEffect;
            gameState.capacity.logistics = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.logistics);
            if (effects.capacity.logistics < 0) isNegativeShock = true;
        }
    }
    if (effects.privateCredit !== undefined) {
        const adjustedEffect = effects.privateCredit < 0 ?
            effects.privateCredit * severityMultiplier :
            effects.privateCredit;
        gameState.privateCredit += adjustedEffect;
        gameState.privateCredit = Math.max(GAME_CONSTANTS.MIN_PRIVATE_CREDIT, gameState.privateCredit);
        if (effects.privateCredit < 0) isNegativeShock = true;
    }
    if (effects.inflation !== undefined) {
        // Positive inflation effects are worse, so apply severity to those
        const adjustedEffect = effects.inflation > 0 ?
            effects.inflation * severityMultiplier :
            effects.inflation;
        gameState.inflation += adjustedEffect;
    }
    if (effects.employment !== undefined) {
        const adjustedEffect = effects.employment < 0 ?
            effects.employment * severityMultiplier :
            effects.employment;
        gameState.employment += adjustedEffect;
        gameState.employment = Math.max(
            GAME_CONSTANTS.MIN_EMPLOYMENT,
            Math.min(GAME_CONSTANTS.MAX_EMPLOYMENT, gameState.employment)
        );
        if (effects.employment < 0) isNegativeShock = true;
    }
    if (effects.netExports !== undefined) {
        const adjustedEffect = effects.netExports < 0 ?
            effects.netExports * severityMultiplier :
            effects.netExports;
        gameState.netExports += adjustedEffect;
        if (effects.netExports < 0) isNegativeShock = true;
    }

    // Track shock for achievements
    if (isNegativeShock) {
        // This will be incremented when the player handles the shock via their choice
        console.log('Negative shock applied - player must respond');
    }
}

// Show the event modal
export function showEventModal(eventData, isChainEvent = false) {
    console.log('=== SHOWING EVENT MODAL ===');
    console.log('Event data:', eventData);
    console.log('Is chain event:', isChainEvent);

    const modal = document.getElementById('eventModal');
    const title = document.getElementById('eventTitle');
    const description = document.getElementById('eventDescription');
    const choicesContainer = document.getElementById('eventChoices');
    const lessonContainer = document.getElementById('eventLesson');

    if (!modal || !title || !description || !choicesContainer || !lessonContainer) {
        console.error('Event modal elements not found!');
        alert('ERROR: Modal elements not found! Check console.');
        return;
    }

    // Add chain event indicator if applicable
    const chainIndicator = isChainEvent ?
        '<span class="chain-event-badge">Chain Reaction!</span> ' : '';
    title.innerHTML = `${chainIndicator}Event: ${eventData.name}`;
    description.innerHTML = eventData.description;

    // Build choices
    choicesContainer.innerHTML = '';

    // Store event data for onclick access
    currentEventData = eventData;
    currentEventChoices = eventData.choices;

    eventData.choices.forEach((choice, index) => {
        const choiceBtn = document.createElement('button');
        choiceBtn.className = 'event-choice-btn';
        choiceBtn.setAttribute('data-choice-index', index);
        choiceBtn.setAttribute('type', 'button');

        // Set onclick as a function reference to bypass CSP
        choiceBtn.onclick = () => {
            handleEventChoiceByIndex(index);
        };

        choiceBtn.innerHTML = `
            <div class="choice-main">
                <div class="choice-text">${choice.text}</div>
                <div class="choice-framing">${choice.mmtFraming}</div>
            </div>
            <div class="choice-cost">${choice.cost > 0 ? `${choice.cost} action${choice.cost > 1 ? 's' : ''}` : 'Free'}</div>
        `;

        choicesContainer.appendChild(choiceBtn);
    });

    // Show MMT lesson
    lessonContainer.innerHTML = eventData.mmtLesson;

    modal.classList.add('active');
    modal.style.display = 'flex';

    // Remove modal's onclick to prevent interference
    modal.onclick = null;

    console.log('=== EVENT MODAL DISPLAY COMPLETE ===');
}

// Handle event choice by index
export function handleEventChoiceByIndex(index) {
    console.log('=== HANDLE EVENT CHOICE BY INDEX ===');
    console.log('Index:', index);

    const eventData = currentEventData;
    const choice = currentEventChoices[index];

    if (!eventData || !choice) {
        console.error('Missing event data or choice!', { eventData, choice });
        return;
    }

    handleEventChoice(eventData, choice);
}

// Handle a player's event choice
export function handleEventChoice(eventData, choice) {
    console.log('=== HANDLE EVENT CHOICE START ===');
    console.log('Event:', eventData.name);
    console.log('Choice:', choice.text);
    console.log('Choice cost:', choice.cost);
    console.log('Actions remaining:', gameState.actionsRemaining);

    // Check if player has enough actions
    if (choice.cost > gameState.actionsRemaining) {
        console.log('NOT ENOUGH ACTIONS!');
        alert(`You need ${choice.cost} actions but only have ${gameState.actionsRemaining} remaining.`);
        return;
    }

    // Deduct actions
    if (choice.cost > 0) {
        gameState.actionsRemaining -= choice.cost;
    }

    // Store pre-choice state for achievement tracking
    const preChoiceEmployment = gameState.employment;
    const preChoiceInflation = gameState.inflation;

    // Execute choice effect
    try {
        const resultMessage = choice.effect(gameState);

        // Track shock handling for achievements
        // If player took action (cost > 0) on a negative shock, count it
        if (choice.cost > 0 && eventData.effects &&
            (eventData.effects.employment < 0 ||
             eventData.effects.privateCredit < 0 ||
             (eventData.effects.capacity &&
              (eventData.effects.capacity.energy < 0 ||
               eventData.effects.capacity.skills < 0 ||
               eventData.effects.capacity.logistics < 0)))) {
            gameState.tracking.shocksHandled++;
            console.log(`Shocks handled: ${gameState.tracking.shocksHandled}`);
        }

        // Record in history
        gameState.events.eventHistory.push({
            day: gameState.currentDay,
            eventId: eventData.id,
            eventName: eventData.name,
            choice: choice.text,
            result: resultMessage,
            preEmployment: preChoiceEmployment,
            preInflation: preChoiceInflation
        });

        // Clear active event
        gameState.events.activeEvent = null;

        invalidateCache();
        updateDisplay();

        // Check for newly unlocked achievements
        checkAchievements();

        // Show result modal
        showEventResultModal(eventData.name, choice.text, resultMessage, eventData.mmtLesson);

        // Close event modal
        closeEventModal();

        console.log('=== HANDLE EVENT CHOICE COMPLETE ===');
    } catch (error) {
        console.error('ERROR in handleEventChoice:', error);
        alert('An error occurred processing your choice: ' + error.message);
    }
}

// Check and unlock achievements
export function checkAchievements() {
    if (!gameState.achievements) {
        gameState.achievements = [];
    }

    Object.values(ACHIEVEMENTS).forEach(achievement => {
        // Skip already unlocked achievements
        if (gameState.achievements.includes(achievement.id)) return;

        // Check condition
        try {
            if (achievement.condition(gameState)) {
                gameState.achievements.push(achievement.id);
                gameState.mmtScore += achievement.points;
                console.log(`Achievement unlocked: ${achievement.name}`);

                // Show achievement notification
                if (typeof showAchievementUnlock === 'function') {
                    showAchievementUnlock(achievement);
                }
            }
        } catch (e) {
            // Condition check failed, skip
        }
    });
}

// Show event result modal
export function showEventResultModal(eventName, choiceMade, result, mmtLesson) {
    console.log('=== SHOWING RESULT MODAL ===');

    const modal = document.getElementById('eventResultModal');
    const title = document.getElementById('eventResultTitle');
    const content = document.getElementById('eventResultContent');

    title.innerHTML = `Decision Made: ${eventName}`;
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <strong>Your Choice:</strong><br>
            ${choiceMade}
        </div>
        <div style="margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
            <strong>Result:</strong><br>
            ${result}
        </div>
        <div style="padding: 12px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 6px;">
            ${mmtLesson}
        </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';

    console.log('=== RESULT MODAL DISPLAYED ===');
}

// Close event modal
export function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('active');
    modal.style.display = 'none';

    // Clear the active event so game can continue
    gameState.events.activeEvent = null;
}

// Close event result modal
export function closeEventResultModal() {
    const modal = document.getElementById('eventResultModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
}
