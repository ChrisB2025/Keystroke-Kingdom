/**
 * ui.js - DOM updates and user interface management
 * Keystroke Kingdom v6.0
 */

import { gameState, getTotalCapacity, getAggregateDemand, getChangedFields, clearChangedFields } from './gameState.js';

// DOM element cache to avoid redundant queries
const elementCache = new Map();

function getElement(id) {
    if (!elementCache.has(id)) {
        elementCache.set(id, document.getElementById(id));
    }
    return elementCache.get(id);
}

// Clear element cache (useful for testing or dynamic content)
export function clearElementCache() {
    elementCache.clear();
}

// Update display with optional selective updates
export function updateDisplay(changedFields = null) {
    const fields = changedFields || getChangedFields();

    // If no specific fields changed, update everything
    const updateAll = fields.size === 0;

    // Day and actions
    if (updateAll || fields.has('currentDay') || fields.has('actionsRemaining')) {
        const dayCounter = getElement('dayCounter');
        const actionsDisplay = getElement('actionsDisplay');
        if (dayCounter) dayCounter.textContent = `Day ${gameState.currentDay} / ${gameState.totalDays}`;
        if (actionsDisplay) actionsDisplay.textContent = `${gameState.actionsRemaining} actions left`;
    }

    // Main stats
    if (updateAll || fields.has('employment')) {
        const employmentStat = getElement('employmentStat');
        if (employmentStat) {
            employmentStat.textContent = `${gameState.employment.toFixed(0)}%`;
            // Update class based on value
            if (gameState.employment >= 95) {
                employmentStat.className = 'stat-value good';
            } else if (gameState.employment >= 85) {
                employmentStat.className = 'stat-value warning';
            } else {
                employmentStat.className = 'stat-value bad';
            }
        }
    }

    if (updateAll || fields.has('inflation')) {
        const inflationStat = getElement('inflationStat');
        if (inflationStat) {
            inflationStat.textContent = `${gameState.inflation.toFixed(1)}%`;
            // Update class based on value
            if (gameState.inflation >= 2 && gameState.inflation <= 3) {
                inflationStat.className = 'stat-value good';
            } else if (gameState.inflation >= 1 && gameState.inflation <= 4) {
                inflationStat.className = 'stat-value warning';
            } else {
                inflationStat.className = 'stat-value bad';
            }
        }
    }

    if (updateAll || fields.has('capacityUsed')) {
        const capacityStat = getElement('capacityStat');
        if (capacityStat) capacityStat.textContent = `${gameState.capacityUsed.toFixed(0)}%`;
    }

    if (updateAll || fields.has('servicesScore')) {
        const servicesStat = getElement('servicesStat');
        if (servicesStat) servicesStat.textContent = gameState.servicesScore.toFixed(0);
    }

    if (updateAll || fields.has('taxRate')) {
        const taxRateStat = getElement('taxRateStat');
        if (taxRateStat) taxRateStat.textContent = `${gameState.taxRate}%`;
    }

    if (updateAll || fields.has('policyRate')) {
        const policyRateStat = getElement('policyRateStat');
        if (policyRateStat) policyRateStat.textContent = `${gameState.policyRate.toFixed(1)}%`;
    }

    // Spending stats
    if (updateAll || fields.has('publicSpending')) {
        const pubSpend = getElement('pubSpend');
        if (pubSpend) pubSpend.textContent = `$${gameState.publicSpending.toFixed(0)}B`;
    }

    if (updateAll || fields.has('privateCredit')) {
        const pvtCredit = getElement('pvtCredit');
        if (pvtCredit) pvtCredit.textContent = `$${gameState.privateCredit.toFixed(0)}B`;
    }

    // Aggregate demand (depends on multiple fields)
    if (updateAll || fields.has('publicSpending') || fields.has('privateCredit') || fields.has('netExports')) {
        const aggDemand = getElement('aggDemand');
        if (aggDemand) {
            const demand = getAggregateDemand();
            aggDemand.textContent = `$${demand.toFixed(0)}B`;
        }
    }

    // Capacity bars
    if (updateAll || fields.has('capacity')) {
        updateCapacityBars();
    }

    // Policy indicators
    if (updateAll || fields.has('jgEnabled') || fields.has('yieldControl') || fields.has('iorEnabled')) {
        updatePolicyIndicators();
    }

    // Clear changed fields after update
    clearChangedFields();
}

// Update capacity bars
export function updateCapacityBars() {
    const bars = [
        { id: 'energyBar', value: gameState.capacity.energy },
        { id: 'skillsBar', value: gameState.capacity.skills },
        { id: 'logisticsBar', value: gameState.capacity.logistics }
    ];

    bars.forEach(bar => {
        const element = getElement(bar.id);
        if (element) {
            const percentage = Math.min(100, bar.value);
            element.style.width = `${percentage}%`;
            element.textContent = bar.value.toFixed(0);
        }
    });
}

// Update policy indicators
export function updatePolicyIndicators() {
    const jgIndicator = getElement('jgIndicator');
    if (jgIndicator) {
        jgIndicator.textContent = gameState.jgEnabled ? 'Job Guarantee: ON' : 'Job Guarantee: OFF';
        jgIndicator.className = gameState.jgEnabled ? 'indicator-btn active' : 'indicator-btn';
    }

    const yieldIndicator = getElement('yieldControlIndicator');
    if (yieldIndicator) {
        yieldIndicator.textContent = gameState.yieldControl ? 'Yield Control: ON' : 'Yield Control: OFF';
        yieldIndicator.className = gameState.yieldControl ? 'indicator-btn active' : 'indicator-btn';
    }

    const iorIndicator = getElement('iorIndicator');
    if (iorIndicator) {
        iorIndicator.textContent = gameState.iorEnabled ? 'IOR: ON' : 'IOR: OFF';
        iorIndicator.className = gameState.iorEnabled ? 'indicator-btn active' : 'indicator-btn';
    }
}

// Show economic narrative
export function showEconomicNarrative() {
    const narrative = generateEconomicNarrative();
    const narrativeEl = getElement('economicNarrative');

    if (narrativeEl) {
        narrativeEl.innerHTML = narrative;

        // Trigger update animation
        narrativeEl.classList.remove('updated');
        setTimeout(() => {
            narrativeEl.classList.add('updated');
        }, 10);

        // Remove animation class after it completes
        setTimeout(() => {
            narrativeEl.classList.remove('updated');
        }, 600);
    }
}

// Generate economic narrative based on current state
export function generateEconomicNarrative() {
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();
    const demandGap = aggDemand - totalCapacity;
    const unemploymentRate = 100 - gameState.employment;

    // Day-specific introductions
    let intro = `<strong>Day ${gameState.currentDay}:</strong> `;

    // Analyze the economic situation and provide MMT-based narrative
    if (gameState.inflation > 4 && demandGap > 10) {
        intro += `<strong>Inflation pressure building!</strong> Your aggregate demand ($${aggDemand.toFixed(0)}B) exceeds productive capacity (${totalCapacity.toFixed(0)} units). MMT principle: The real constraint is resources, not money. Consider cooling demand or expanding capacity.`;
    } else if (gameState.inflation < 1.5 && unemploymentRate > 10) {
        intro += `<strong>Economy running cold.</strong> With ${unemploymentRate.toFixed(0)}% unemployment and low inflation, you're under-utilizing real resources. MMT says: Increase public spending to put idle resources to work!`;
    } else if (gameState.employment >= 95 && gameState.inflation >= 2 && gameState.inflation <= 3) {
        intro += `<strong>Excellent balance!</strong> You've achieved full employment (${gameState.employment.toFixed(0)}%) with stable inflation (${gameState.inflation.toFixed(1)}%). This demonstrates MMT's insight: governments can achieve prosperity by managing real resources effectively.`;
    } else if (gameState.jgEnabled && unemploymentRate < 5) {
        intro += `<strong>Job Guarantee working!</strong> Your JG program absorbed ${gameState.jgPoolSize.toFixed(1)}% of workers, providing a buffer stock that stabilizes employment. The fixed JG wage acts as a price anchor, demonstrating MMT's automatic stabilizer concept.`;
    } else if (!gameState.jgEnabled && unemploymentRate > 5) {
        intro += `<strong>Slack in labor market.</strong> ${unemploymentRate.toFixed(0)}% unemployment means idle human resources. MMT insight: These are real resources being wasted. A Job Guarantee could provide full employment while anchoring prices.`;
    } else if (gameState.capacityUsed > 90 && gameState.inflation > 3) {
        intro += `<strong>Hitting capacity limits.</strong> At ${gameState.capacityUsed.toFixed(0)}% utilization, you're near the productive boundary. MMT teaches: Inflation signals real resource scarcity, not money scarcity. Invest in capacity to expand the frontier!`;
    } else if (gameState.taxRate > 30 && aggDemand < totalCapacity) {
        intro += `<strong>High taxes cooling demand.</strong> Your ${gameState.taxRate}% tax rate is deleting money from the economy. MMT principle: Taxes don't fund spending—they free up real resources by reducing private demand. But you may have room to cut taxes and boost activity.`;
    } else if (gameState.publicSpending > 60 && gameState.inflation < 3) {
        intro += `<strong>Fiscal expansion working!</strong> Public spending of $${gameState.publicSpending.toFixed(0)}B is creating currency and demand without triggering inflation. MMT vindicated: Currency issuers aren't financially constrained—real resources are the limit.`;
    } else if (demandGap < -15) {
        intro += `<strong>Demand well below capacity.</strong> You have ${Math.abs(demandGap).toFixed(0)} units of spare capacity. MMT lesson: This represents potential prosperity being left on the table. Government spending creates the money needed to mobilize these resources!`;
    } else {
        intro += `<strong>Steady progress.</strong> Employment at ${gameState.employment.toFixed(0)}%, inflation at ${gameState.inflation.toFixed(1)}%. Keep monitoring the balance between aggregate demand and productive capacity—the true constraint in MMT economics.`;
    }

    return intro;
}
