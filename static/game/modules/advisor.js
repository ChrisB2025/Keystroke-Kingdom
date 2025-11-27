/**
 * advisor.js - Economic advisor system
 * Keystroke Kingdom v6.0
 *
 * Note: The legacy chat system has been removed in favor of the advisor modal.
 * The Claude API proxy is available but the local rule-based advisor provides
 * instant responses without API calls.
 */

import { gameState, getTotalCapacity, getAggregateDemand } from './gameState.js';
import { mmtKnowledge } from './config.js';

// Open advisor modal
export function openAdvisor() {
    const modal = document.getElementById('advisorModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('advisorInput');
            if (input) input.focus();
        }, 100);
    }
}

// Close advisor modal
export function closeAdvisor() {
    const modal = document.getElementById('advisorModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Ask advisor a question
export async function askAdvisor() {
    const input = document.getElementById('advisorInput');
    const message = input ? input.value.trim() : '';

    if (!message) return;

    // Add user message to conversation
    addAdvisorMessage('user', message);
    if (input) input.value = '';

    // Show typing indicator
    const conversationHistory = document.getElementById('conversationHistory');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'advisor-message assistant typing';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    if (conversationHistory) {
        conversationHistory.appendChild(typingDiv);
        conversationHistory.scrollTop = conversationHistory.scrollHeight;
    }

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate response based on game state
    const response = generateAdvisorResponse(message);

    // Remove typing indicator
    typingDiv.remove();

    addAdvisorMessage('assistant', response);
}

// Quick advisor questions
export function askQuickAdvisorQuestion(type) {
    const questions = {
        'situation': "What's happening in my economy right now? Should I be worried?",
        'next': "What should I prioritize in my next actions?",
        'mmt': "Can you explain the key MMT principles in this game?",
        'inflation': "How do I manage inflation risk?"
    };

    const question = questions[type];
    if (question) {
        const input = document.getElementById('advisorInput');
        if (input) {
            input.value = question;
            askAdvisor();
        }
    }
}

// Generate advisor response based on current game state
export function generateAdvisorResponse(question) {
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();
    const demandGap = aggDemand - totalCapacity;

    const q = question.toLowerCase();

    // Analyze current situation
    const unemploymentRate = 100 - gameState.employment;
    const inflationHigh = gameState.inflation > 3;
    const inflationLow = gameState.inflation < 2;
    const capacityTight = gameState.capacityUsed > 90;
    const capacitySlack = gameState.capacityUsed < 75;

    // Current situation questions
    if (q.includes('situation') || q.includes('economy') || q.includes('happening') || q.includes('worried')) {
        let response = `Your economy is currently running at ${gameState.capacityUsed.toFixed(0)}% capacity with ${gameState.employment.toFixed(0)}% employment and ${gameState.inflation.toFixed(1)}% inflation. `;

        if (inflationHigh && capacityTight) {
            response += `Inflation is above target because demand ($${aggDemand.toFixed(0)}B) exceeds your productive capacity (${totalCapacity.toFixed(0)} units). This is the real resource constraint MMT talks about. Consider cooling demand with spending cuts or tax increases, or invest in capacity expansion.`;
        } else if (unemploymentRate > 10 && !gameState.jgEnabled) {
            response += `With ${unemploymentRate.toFixed(0)}% unemployment, you have significant slack in the economy. MMT says you're under-utilizing real resources. You can safely increase public spending without causing inflation, or enable the Job Guarantee to provide a buffer stock of employed workers.`;
        } else if (inflationLow && capacitySlack) {
            response += `Your economy has room to grow! With low inflation and spare capacity, you can increase aggregate demand through public spending. Remember: the constraint is real resources, not money.`;
        } else {
            response += `You're in a relatively balanced position. Focus on maintaining stability while building long-term capacity through investment in energy, skills, and logistics.`;
        }
        return response;
    }

    // Next steps / what to do
    if (q.includes('next') || q.includes('priorit') || q.includes('should i do')) {
        let advice = [];

        if (unemploymentRate > 5 && !gameState.jgEnabled && gameState.actionsRemaining > 0) {
            advice.push("Enable the Job Guarantee to provide full employment and establish a price anchor through the fixed JG wage");
        }

        if (demandGap > 15 && inflationHigh) {
            advice.push("Your inflation is high because demand exceeds capacity. Either reduce spending/raise taxes, or invest in capacity to expand what the economy can produce");
        } else if (demandGap < -10 && unemploymentRate > 10) {
            advice.push("Increase public spending to boost demand and employment. You have spare capacity, so this won't cause inflation");
        }

        if (totalCapacity < 80) {
            advice.push("Invest in capacity (energy, skills, logistics) to expand your economy's productive potential");
        }

        if (advice.length === 0) {
            advice.push("Continue monitoring your economy. Consider building capacity for future growth or fine-tuning your tax and spending levels");
        }

        return advice.slice(0, 2).join('. ') + '.';
    }

    // MMT explanation
    if (q.includes('mmt') || q.includes('modern monetary') || q.includes('principle') || q.includes('theory')) {
        return `Key MMT insights: (1) As a currency issuer, government doesn't need to "find money" before spending - spending creates money. (2) Taxes delete money and free up real resources; they don't fund spending. (3) The real constraint is productive capacity, not money - inflation occurs when demand exceeds what the economy can produce. (4) Job Guarantee provides a buffer stock of employed workers at a fixed wage, which: ensures full employment, acts as an automatic stabilizer, and provides a price anchor. Your current challenge is managing these principles to achieve ${100 - unemploymentRate < 95 ? 'full employment' : 'price stability'}.`;
    }

    // Inflation questions
    if (q.includes('inflation') || q.includes('price')) {
        if (gameState.inflation > 4) {
            return `Your inflation is ${gameState.inflation.toFixed(1)}%, above the target. This happens when aggregate demand ($${aggDemand.toFixed(0)}B) exceeds productive capacity (${totalCapacity.toFixed(0)} units). Solutions: (1) Reduce demand via spending cuts or tax increases, (2) Expand capacity through investment, or (3) Enable Job Guarantee for wage stabilization. MMT says inflation is about real resources, not money supply.`;
        } else if (gameState.inflation < 1) {
            return `Your inflation is very low at ${gameState.inflation.toFixed(1)}%, suggesting demand is well below capacity. You can safely increase public spending to boost employment and economic activity without risking inflation. MMT shows that the constraint is real productive capacity, not monetary limits.`;
        } else {
            return `Your inflation is healthy at ${gameState.inflation.toFixed(1)}%. To keep it stable: (1) Monitor capacity utilization (currently ${gameState.capacityUsed.toFixed(0)}%), (2) Invest in capacity to allow higher demand without inflation, (3) Use Job Guarantee as a buffer stock to stabilize wages. Remember: inflation comes from demand exceeding real resources, not from money creation itself.`;
        }
    }

    // Capacity questions
    if (q.includes('capacity') || q.includes('invest')) {
        return `Your capacity utilization is ${gameState.capacityUsed.toFixed(0)}% with bottleneck capacity at ${totalCapacity.toFixed(0)} units. ${capacityTight ? 'This is quite high - invest in energy, skills, and logistics to expand capacity and enable higher sustainable demand.' : 'You have room to expand demand.'} Remember: capacity determines how hot you can run the economy without inflation. More capacity = more prosperity without price pressure.`;
    }

    // Job Guarantee questions
    if (q.includes('job') || q.includes('employment') || q.includes('jg')) {
        if (gameState.jgEnabled) {
            return `Job Guarantee is active, providing employment for ${gameState.jgPoolSize.toFixed(1)}% of the workforce at $${gameState.jgWage}/hour. This creates a buffer stock that automatically expands in downturns and contracts in upswings, stabilizing the economy. The fixed wage acts as a price anchor, helping control inflation while ensuring full employment.`;
        } else {
            return `With ${unemploymentRate.toFixed(0)}% unemployment, you could enable the Job Guarantee. MMT shows that JG provides a buffer stock of employed workers at a fixed wage, which: (1) ensures full employment, (2) acts as an automatic stabilizer, and (3) provides a price anchor through the fixed wage. It's countercyclical - the pool grows in downturns and shrinks in booms.`;
        }
    }

    // Default general advice
    return `Looking at your economy (Day ${gameState.currentDay}/30): Employment is ${gameState.employment.toFixed(0)}%, inflation is ${gameState.inflation.toFixed(1)}%, and you're using ${gameState.capacityUsed.toFixed(0)}% of capacity. ${inflationHigh ? 'Focus on cooling demand or expanding capacity.' : unemploymentRate > 5 ? 'You can safely increase spending to boost employment.' : 'Keep building capacity for sustainable growth.'} Remember: MMT shows that real resources are the constraint, not money.`;
}

// Add message to advisor conversation
export function addAdvisorMessage(role, content) {
    const conversationHistory = document.getElementById('conversationHistory');
    if (conversationHistory) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `advisor-message ${role}`;
        messageDiv.textContent = content;
        conversationHistory.appendChild(messageDiv);
        conversationHistory.scrollTop = conversationHistory.scrollHeight;
    }
}

// Build game context for API calls (if needed)
export function buildGameContext() {
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();

    return `Day ${gameState.currentDay}/${gameState.totalDays}
Employment: ${gameState.employment.toFixed(1)}% (Target: >95%)
Inflation: ${gameState.inflation.toFixed(1)}% (Target: 2-3%)
Capacity Utilization: ${gameState.capacityUsed.toFixed(1)}%
Public Spending: $${gameState.publicSpending.toFixed(0)}B
Private Credit: $${gameState.privateCredit.toFixed(0)}B
Aggregate Demand: $${aggDemand.toFixed(0)}B
Total Capacity: ${totalCapacity.toFixed(0)} units
Tax Rate: ${gameState.taxRate}%
Policy Rate: ${gameState.policyRate.toFixed(1)}%
Job Guarantee: ${gameState.jgEnabled ? 'ENABLED' : 'DISABLED'}
Actions Remaining: ${gameState.actionsRemaining}`;
}
