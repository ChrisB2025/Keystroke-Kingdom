/**
 * events.js - Economic events system
 * Keystroke Kingdom v6.0
 */

import { gameState, invalidateCache } from './gameState.js';
import { economicEvents, GAME_CONSTANTS } from './config.js';
import { updateDisplay } from './ui.js';

// Current event data for modal handlers
let currentEventData = null;
let currentEventChoices = null;

export function getCurrentEventData() {
    return currentEventData;
}

export function getCurrentEventChoices() {
    return currentEventChoices;
}

// Check for and potentially trigger events
export function checkForEvents() {
    if (gameState.gameOver) return;
    if (gameState.events.activeEvent) return; // Only one event at a time

    // Convert economicEvents object to array
    const availableEvents = Object.values(economicEvents);

    // Filter eligible events
    const eligibleEvents = availableEvents.filter(event => {
        const [minDay, maxDay] = event.dayRange;
        const inDayRange = gameState.currentDay >= minDay && gameState.currentDay <= maxDay;
        const notTriggered = !gameState.events.triggeredEvents.includes(event.id);
        const conditionMet = event.condition(gameState);

        return inDayRange && notTriggered && conditionMet;
    });

    if (eligibleEvents.length === 0) return;

    // Check each eligible event against its probability
    for (const event of eligibleEvents) {
        if (Math.random() < event.probability) {
            triggerEvent(event);
            break; // Only trigger one event per check
        }
    }
}

// Trigger a specific event
export function triggerEvent(event) {
    gameState.events.activeEvent = event;
    gameState.events.triggeredEvents.push(event.id);

    // Apply immediate effects
    applyEventEffects(event.effects);

    invalidateCache();
    updateDisplay();
    showEventModal(event);
}

// Apply event effects to game state
function applyEventEffects(effects) {
    if (!effects) return;

    if (effects.capacity) {
        if (effects.capacity.energy) {
            gameState.capacity.energy += effects.capacity.energy;
            gameState.capacity.energy = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.energy);
        }
        if (effects.capacity.skills) {
            gameState.capacity.skills += effects.capacity.skills;
            gameState.capacity.skills = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.skills);
        }
        if (effects.capacity.logistics) {
            gameState.capacity.logistics += effects.capacity.logistics;
            gameState.capacity.logistics = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.capacity.logistics);
        }
    }
    if (effects.privateCredit !== undefined) {
        gameState.privateCredit += effects.privateCredit;
        gameState.privateCredit = Math.max(GAME_CONSTANTS.MIN_CAPACITY, gameState.privateCredit);
    }
    if (effects.inflation !== undefined) {
        gameState.inflation += effects.inflation;
    }
    if (effects.employment !== undefined) {
        gameState.employment += effects.employment;
        gameState.employment = Math.max(
            GAME_CONSTANTS.MIN_EMPLOYMENT,
            Math.min(GAME_CONSTANTS.MAX_EMPLOYMENT, gameState.employment)
        );
    }
    if (effects.netExports !== undefined) {
        gameState.netExports += effects.netExports;
    }
}

// Show the event modal
export function showEventModal(eventData) {
    console.log('=== SHOWING EVENT MODAL ===');
    console.log('Event data:', eventData);

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

    title.innerHTML = `Event: ${eventData.name}`;
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

    // Execute choice effect
    try {
        const resultMessage = choice.effect(gameState);

        // Record in history
        gameState.events.eventHistory.push({
            day: gameState.currentDay,
            eventId: eventData.id,
            eventName: eventData.name,
            choice: choice.text,
            result: resultMessage
        });

        // Clear active event
        gameState.events.activeEvent = null;

        invalidateCache();
        updateDisplay();

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
