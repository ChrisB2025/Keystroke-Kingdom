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

// ============================================
// VISUAL FEEDBACK SYSTEM
// ============================================

// Show floating feedback indicator (e.g., "+$10B")
export function showFloatingFeedback(text, type = 'neutral') {
    const container = getElement('floatingFeedbackContainer');
    if (!container) return;

    const feedback = document.createElement('div');
    feedback.className = `floating-feedback ${type}`;
    feedback.textContent = text;

    // Random horizontal offset for variety
    const offsetX = (Math.random() - 0.5) * 60;
    feedback.style.left = `${offsetX}px`;

    container.appendChild(feedback);

    // Remove after animation completes
    setTimeout(() => {
        feedback.remove();
    }, 1500);
}

// Pulse a stat element to draw attention
export function pulseElement(elementId) {
    const element = getElement(elementId);
    if (!element) return;

    element.classList.remove('pulse');
    // Force reflow to restart animation
    void element.offsetWidth;
    element.classList.add('pulse');

    setTimeout(() => {
        element.classList.remove('pulse');
    }, 500);
}

// Animate a numeric value change
export function animateValue(elementId, start, end, duration = 500) {
    const element = getElement(elementId);
    if (!element) return;

    const startTime = performance.now();
    const change = end - start;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + change * easeOut;

        // Format based on element type
        if (elementId.includes('Stat') && elementId !== 'servicesStat') {
            element.textContent = `${current.toFixed(current < 10 ? 1 : 0)}%`;
        } else if (elementId.includes('Spend') || elementId.includes('Credit') || elementId.includes('Demand')) {
            element.textContent = `$${current.toFixed(0)}B`;
        } else {
            element.textContent = current.toFixed(0);
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// ACCORDION TOGGLE
// ============================================

export function toggleAdvancedStats() {
    const toggle = getElement('advancedStatsToggle');
    const content = getElement('advancedStatsContent');

    if (!toggle || !content) return;

    const isExpanded = content.classList.contains('expanded');

    if (isExpanded) {
        content.classList.remove('expanded');
        toggle.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        toggle.classList.add('expanded');
    }
}

// ============================================
// PRIMARY STATS UPDATES
// ============================================

// Update employment progress bar
export function updateEmploymentBar() {
    const bar = getElement('employmentBar');
    if (!bar) return;

    const percentage = Math.min(100, Math.max(0, gameState.employment));
    bar.style.width = `${percentage}%`;
}

// Update inflation zone indicator
export function updateInflationZone() {
    const zones = document.querySelectorAll('.zone');
    if (!zones.length) return;

    zones.forEach(zone => zone.classList.remove('active'));

    const inflation = gameState.inflation;
    let activeZone;

    if (inflation < 1.5) {
        activeZone = document.querySelector('.zone-low');
    } else if (inflation >= 1.5 && inflation <= 4) {
        activeZone = document.querySelector('.zone-good');
    } else {
        activeZone = document.querySelector('.zone-high');
    }

    if (activeZone) {
        activeZone.classList.add('active');
    }
}

// Update services score bar
export function updateServicesBar() {
    const bar = getElement('servicesBar');
    if (!bar) return;

    // Scale services score to percentage (assuming max around 100 for a good game)
    const percentage = Math.min(100, (gameState.servicesScore / 100) * 100);
    bar.style.width = `${percentage}%`;
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

    // Main stats - Primary metrics
    if (updateAll || fields.has('employment')) {
        const employmentStat = getElement('employmentStat');
        if (employmentStat) {
            employmentStat.textContent = `${gameState.employment.toFixed(0)}%`;
            // Update class based on value
            if (gameState.employment >= 95) {
                employmentStat.className = 'primary-stat-value good';
            } else if (gameState.employment >= 85) {
                employmentStat.className = 'primary-stat-value warning';
            } else {
                employmentStat.className = 'primary-stat-value bad';
            }
        }
        // Update employment progress bar
        updateEmploymentBar();
    }

    if (updateAll || fields.has('inflation')) {
        const inflationStat = getElement('inflationStat');
        if (inflationStat) {
            inflationStat.textContent = `${gameState.inflation.toFixed(1)}%`;
            // Update class based on value
            if (gameState.inflation >= 2 && gameState.inflation <= 3) {
                inflationStat.className = 'primary-stat-value good';
            } else if (gameState.inflation >= 1 && gameState.inflation <= 4) {
                inflationStat.className = 'primary-stat-value warning';
            } else {
                inflationStat.className = 'primary-stat-value bad';
            }
        }
        // Update inflation zone indicator
        updateInflationZone();
    }

    if (updateAll || fields.has('capacityUsed')) {
        const capacityStat = getElement('capacityStat');
        if (capacityStat) capacityStat.textContent = `${gameState.capacityUsed.toFixed(0)}%`;
    }

    if (updateAll || fields.has('servicesScore')) {
        const servicesStat = getElement('servicesStat');
        if (servicesStat) servicesStat.textContent = gameState.servicesScore.toFixed(0);
        // Update services progress bar
        updateServicesBar();
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

// ============================================
// RECOMMENDED ACTIONS SYSTEM
// ============================================

// Generate recommended actions based on current game state
export function updateRecommendedActions() {
    const container = getElement('recommendedActionsList');
    if (!container) return;

    const recommendations = generateRecommendations();

    // Clear existing recommendations
    container.innerHTML = '';

    // Add new recommendations
    recommendations.forEach(rec => {
        const button = document.createElement('button');
        button.className = 'recommended-action';
        button.setAttribute('data-action', rec.action);
        button.onclick = rec.handler;

        button.innerHTML = `
            <div class="recommended-action-content">
                <span class="recommended-action-name">${rec.name}</span>
                <span class="recommended-action-preview">${rec.preview}</span>
            </div>
            <span class="recommended-arrow">&#8594;</span>
        `;

        container.appendChild(button);
    });
}

// Generate contextual recommendations based on game state
function generateRecommendations() {
    const recommendations = [];
    const totalCapacity = getTotalCapacity();
    const aggDemand = getAggregateDemand();
    const demandGap = aggDemand - totalCapacity;
    const unemploymentRate = 100 - gameState.employment;

    // High unemployment, low inflation - expand demand
    if (unemploymentRate > 10 && gameState.inflation < 3) {
        if (!gameState.jgEnabled) {
            recommendations.push({
                name: 'Enable Job Guarantee',
                preview: 'Absorbs ~60% unemployment, stabilizes wages',
                action: 'jg',
                handler: () => window.toggleJobGuarantee && window.toggleJobGuarantee()
            });
        }
        recommendations.push({
            name: 'Fund Education',
            preview: `+~3% employment, +~0.4% inflation`,
            action: 'education',
            handler: () => window.publicSpending && window.publicSpending('education', 10)
        });
    }

    // High inflation - cool demand
    if (gameState.inflation > 4) {
        if (gameState.taxRate < 35) {
            recommendations.push({
                name: 'Raise Taxes',
                preview: 'Reduces demand, cools inflation',
                action: 'tax-up',
                handler: () => window.adjustTax && window.adjustTax(5)
            });
        }
        if (gameState.policyRate < 5) {
            recommendations.push({
                name: 'Raise Policy Rate',
                preview: 'Slows credit growth, reduces inflation',
                action: 'rate-up',
                handler: () => window.adjustPolicyRate && window.adjustPolicyRate(0.5)
            });
        }
    }

    // Near full capacity but can expand
    if (gameState.capacityUsed > 85 && gameState.inflation > 3) {
        const lowestCapacity = Math.min(
            gameState.capacity.energy,
            gameState.capacity.skills,
            gameState.capacity.logistics
        );
        let capacityType = 'energy';
        if (gameState.capacity.skills === lowestCapacity) capacityType = 'skills';
        if (gameState.capacity.logistics === lowestCapacity) capacityType = 'logistics';

        recommendations.push({
            name: `Invest in ${capacityType.charAt(0).toUpperCase() + capacityType.slice(1)}`,
            preview: 'Expand productive capacity, reduce bottlenecks',
            action: `invest-${capacityType}`,
            handler: () => window.investInCapacity && window.investInCapacity(capacityType)
        });
    }

    // Demand well below capacity
    if (demandGap < -10 && gameState.inflation < 2) {
        recommendations.push({
            name: 'Fiscal Stimulus',
            preview: '+$20B demand boost, +~4% employment',
            action: 'stimulus',
            handler: () => window.publicSpending && window.publicSpending('stimulus', 20)
        });
    }

    // Employment close to target but not there yet
    if (gameState.employment >= 85 && gameState.employment < 95 && gameState.inflation < 3.5) {
        recommendations.push({
            name: 'Fund Healthcare',
            preview: '+2 services, +~2% employment',
            action: 'healthcare',
            handler: () => window.publicSpending && window.publicSpending('healthcare', 10)
        });
    }

    // Default suggestions if no specific conditions
    if (recommendations.length === 0) {
        if (gameState.servicesScore < 60) {
            recommendations.push({
                name: 'Fund Infrastructure',
                preview: '+1.5 services, boosts long-term capacity',
                action: 'infrastructure',
                handler: () => window.publicSpending && window.publicSpending('infrastructure', 10)
            });
        }
        recommendations.push({
            name: 'Continue Current Policy',
            preview: 'Economy on stable trajectory',
            action: 'next',
            handler: () => window.nextTurn && window.nextTurn()
        });
    }

    // Return top 2-3 recommendations
    return recommendations.slice(0, 3);
}
