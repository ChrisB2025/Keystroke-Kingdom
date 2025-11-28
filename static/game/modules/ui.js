/**
 * ui.js - DOM updates and user interface management
 * Keystroke Kingdom v7.0 - Enhanced Drama & Gameplay Update
 */

import { gameState, getTotalCapacity, getAggregateDemand, getChangedFields, clearChangedFields, resetState } from './gameState.js';
import { DIFFICULTY_SETTINGS, GAME_MODES, ACHIEVEMENTS } from './config.js';

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
// MMT TEACHING MOMENTS
// ============================================

// Queue for MMT insights to prevent overlapping modals
let insightQueue = [];
let isInsightModalOpen = false;

// MMT Insight definitions
const mmtInsights = {
    spending_creates_money: {
        title: "Currency Creation",
        message: "Notice: The government doesn't need to 'find' money before spending. By spending, it creates currency and credits private bank accounts. This is the power of currency sovereignty!",
        badge: "Currency Creator"
    },
    taxes_delete_money: {
        title: "Taxes Delete Money",
        message: "When taxes are collected, money doesn't go into a 'government account' - it's actually deleted from circulation! Taxes free up real resources by reducing private spending power, not to 'fund' government.",
        badge: "Tax Truthseer"
    },
    real_resource_constraint: {
        title: "Real Resource Constraint",
        message: "Inflation is rising! This isn't because you 'printed too much money' - it's because demand is exceeding your economy's real productive capacity. The constraint is resources, not money!",
        badge: "Capacity Conscious"
    },
    jg_buffer_stock: {
        title: "Buffer Stock Employment",
        message: "The Job Guarantee creates a 'buffer stock' of employed workers. Like a commodity buffer stock, it expands in downturns and contracts in booms - an automatic stabilizer that ensures full employment!",
        badge: "Buffer Stock Builder"
    },
    sectoral_balances: {
        title: "Sectoral Balances Identity",
        message: "The private sector can only save (run a surplus) if another sector runs a deficit. Government deficits = private surpluses! This is an accounting identity, not an opinion.",
        badge: "Balance Master"
    },
    deficit_is_private_wealth: {
        title: "Deficit Creates Private Wealth",
        message: "When government runs a deficit, it adds net financial assets to the private sector. Government 'debt' is private sector wealth! This is the flip side of the balance sheet.",
        badge: "Wealth Watcher"
    },
    capacity_investment: {
        title: "Expanding the Frontier",
        message: "By investing in capacity (energy, skills, logistics), you're expanding what the economy can produce. This raises the 'speed limit' - allowing more demand without inflation!",
        badge: "Frontier Expander"
    },
    jg_price_anchor: {
        title: "Price Anchor Effect",
        message: "The Job Guarantee wage acts as a price anchor. Since JG workers are available at a fixed wage, private employers have a stable reference point, reducing wage-price spirals!",
        badge: "Price Anchor"
    }
};

// Show an MMT teaching moment (queued to prevent overlapping)
export function showMMTInsight(insightKey, forceShow = false) {
    if (!gameState.events.mmtInsightsShown) {
        gameState.events.mmtInsightsShown = [];
    }

    // Check if already shown (unless forced)
    if (!forceShow && gameState.events.mmtInsightsShown.includes(insightKey)) {
        return false;
    }

    const insight = mmtInsights[insightKey];
    if (!insight) return false;

    // Mark as shown
    gameState.events.mmtInsightsShown.push(insightKey);

    // Award MMT score and badge
    gameState.mmtScore += 10;
    if (insight.badge && !gameState.mmtBadges.includes(insight.badge)) {
        gameState.mmtBadges.push(insight.badge);
    }

    // Queue the insight instead of showing immediately
    insightQueue.push({
        title: insight.title,
        message: insight.message,
        badge: insight.badge
    });

    // If no modal is currently open, show the first in queue
    if (!isInsightModalOpen) {
        processInsightQueue();
    }

    return true;
}

// Process the insight queue - show next insight if available
function processInsightQueue() {
    if (insightQueue.length === 0) {
        isInsightModalOpen = false;
        return;
    }

    const nextInsight = insightQueue.shift();
    isInsightModalOpen = true;
    showInsightModal(nextInsight.title, nextInsight.message, nextInsight.badge);
}

// Display the insight modal
function showInsightModal(title, message, badge) {
    // Check if modal already exists
    let modal = document.getElementById('mmtInsightModal');

    if (!modal) {
        // Create the modal
        modal = document.createElement('div');
        modal.id = 'mmtInsightModal';
        modal.className = 'mmt-insight-modal';
        modal.innerHTML = `
            <div class="mmt-insight-content">
                <div class="mmt-insight-header">
                    <span class="mmt-insight-icon">💡</span>
                    <h3 class="mmt-insight-title"></h3>
                </div>
                <p class="mmt-insight-message"></p>
                <div class="mmt-insight-badge"></div>
                <button class="mmt-insight-close" onclick="closeMMTInsight()">Got it!</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update content
    modal.querySelector('.mmt-insight-title').textContent = title;
    modal.querySelector('.mmt-insight-message').textContent = message;

    const badgeEl = modal.querySelector('.mmt-insight-badge');
    if (badge) {
        badgeEl.innerHTML = `<span class="badge-earned">🏆 Badge Earned: ${badge}</span>`;
        badgeEl.style.display = 'block';
    } else {
        badgeEl.style.display = 'none';
    }

    // Show modal with animation
    modal.classList.add('active');
}

// Close the insight modal and show next in queue
export function closeMMTInsight() {
    const modal = document.getElementById('mmtInsightModal');
    if (modal) {
        modal.classList.remove('active');
    }

    // Process next insight in queue after a short delay
    setTimeout(() => {
        processInsightQueue();
    }, 300);
}

// Make closeMMTInsight available globally for onclick
if (typeof window !== 'undefined') {
    window.closeMMTInsight = closeMMTInsight;
}

// ============================================
// ACHIEVEMENT NOTIFICATIONS
// ============================================

// Show achievement unlock notification
export function showAchievementUnlock(achievement) {
    // Create achievement notification
    let notification = document.getElementById('achievementNotification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'achievementNotification';
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon"></div>
                <div class="achievement-info">
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-name"></div>
                    <div class="achievement-desc"></div>
                    <div class="achievement-points"></div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
    }

    // Update content
    notification.querySelector('.achievement-icon').textContent = achievement.icon;
    notification.querySelector('.achievement-name').textContent = achievement.name;
    notification.querySelector('.achievement-desc').textContent = achievement.description;
    notification.querySelector('.achievement-points').textContent = `+${achievement.points} points`;

    // Show notification
    notification.classList.add('active');

    // Hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('active');
    }, 4000);
}

// ============================================
// GAME SETUP MODAL
// ============================================

// Show the game setup modal
export function showGameSetupModal() {
    let modal = document.getElementById('gameSetupModal');

    if (!modal) {
        modal = createGameSetupModal();
    }

    // Populate options
    populateGameSetupOptions();

    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Create the game setup modal dynamically
function createGameSetupModal() {
    const modal = document.createElement('div');
    modal.id = 'gameSetupModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content game-setup-modal">
            <h2>New Game Setup</h2>

            <div class="setup-section">
                <h3>Difficulty</h3>
                <div class="difficulty-options" id="difficultyOptions"></div>
            </div>

            <div class="setup-section">
                <h3>Game Mode</h3>
                <div class="mode-options" id="gameModeOptions"></div>
            </div>

            <div class="setup-actions">
                <button class="btn btn-secondary" onclick="closeGameSetupModal()">Cancel</button>
                <button class="btn btn-primary" onclick="startNewGame()">Start Game</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Populate game setup options
function populateGameSetupOptions() {
    const diffContainer = document.getElementById('difficultyOptions');
    const modeContainer = document.getElementById('gameModeOptions');

    if (diffContainer) {
        diffContainer.innerHTML = '';
        Object.entries(DIFFICULTY_SETTINGS).forEach(([key, diff]) => {
            const option = document.createElement('div');
            option.className = `setup-option ${key === 'normal' ? 'selected' : ''}`;
            option.dataset.value = key;
            option.onclick = () => selectDifficulty(key);
            option.innerHTML = `
                <div class="option-name">${diff.name}</div>
                <div class="option-desc">${diff.description}</div>
            `;
            diffContainer.appendChild(option);
        });
    }

    if (modeContainer) {
        modeContainer.innerHTML = '';
        Object.entries(GAME_MODES).forEach(([key, mode]) => {
            const option = document.createElement('div');
            option.className = `setup-option ${key === 'standard' ? 'selected' : ''}`;
            option.dataset.value = key;
            option.onclick = () => selectGameMode(key);
            option.innerHTML = `
                <div class="option-name">${mode.name}</div>
                <div class="option-desc">${mode.description}</div>
            `;
            modeContainer.appendChild(option);
        });
    }
}

// Track selected options
let selectedDifficulty = 'normal';
let selectedGameMode = 'standard';

function selectDifficulty(diff) {
    selectedDifficulty = diff;
    document.querySelectorAll('#difficultyOptions .setup-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === diff);
    });
}

function selectGameMode(mode) {
    selectedGameMode = mode;
    document.querySelectorAll('#gameModeOptions .setup-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === mode);
    });
}

// Close game setup modal
export function closeGameSetupModal() {
    const modal = document.getElementById('gameSetupModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Start a new game with selected options
export function startNewGame() {
    resetState(selectedDifficulty, selectedGameMode);
    closeGameSetupModal();
    updateDisplay();

    // Show mode-specific intro message
    const mode = GAME_MODES[selectedGameMode];
    const diff = DIFFICULTY_SETTINGS[selectedDifficulty];

    showFloatingFeedback(`${mode.name} - ${diff.name}`, 'positive');
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.showGameSetupModal = showGameSetupModal;
    window.closeGameSetupModal = closeGameSetupModal;
    window.startNewGame = startNewGame;
}

// ============================================
// ACHIEVEMENTS PANEL
// ============================================

// Show achievements panel
export function showAchievementsPanel() {
    let modal = document.getElementById('achievementsModal');

    if (!modal) {
        modal = createAchievementsModal();
    }

    populateAchievements();

    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Create achievements modal
function createAchievementsModal() {
    const modal = document.createElement('div');
    modal.id = 'achievementsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content achievements-modal">
            <div class="modal-header">
                <h2>Achievements</h2>
                <button class="modal-close" onclick="closeAchievementsModal()">&times;</button>
            </div>
            <div class="achievements-grid" id="achievementsGrid"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Populate achievements list
function populateAchievements() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.values(ACHIEVEMENTS).forEach(achievement => {
        const unlocked = gameState.achievements?.includes(achievement.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div class="achievement-card-icon">${unlocked ? achievement.icon : '?'}</div>
            <div class="achievement-card-info">
                <div class="achievement-card-name">${achievement.name}</div>
                <div class="achievement-card-desc">${unlocked ? achievement.description : '???'}</div>
                <div class="achievement-card-points">${achievement.points} pts</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Close achievements modal
export function closeAchievementsModal() {
    const modal = document.getElementById('achievementsModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.showAchievementsPanel = showAchievementsPanel;
    window.closeAchievementsModal = closeAchievementsModal;
}

// ============================================
// MMT SCORE TRACKING
// ============================================

// Award points for MMT-aligned decision
export function awardMMTPoints(points, reason, isAligned = true) {
    gameState.mmtScore += points;

    if (isAligned) {
        gameState.mmtDecisions.aligned++;
    } else {
        gameState.mmtDecisions.hawkish++;
    }

    // Show feedback
    showFloatingFeedback(`+${points} MMT`, 'positive');
}

// Penalize for deficit hawk thinking
export function penalizeHawkishThinking(points, reason) {
    // Don't go negative
    gameState.mmtScore = Math.max(0, gameState.mmtScore - points);
    gameState.mmtDecisions.hawkish++;

    showFloatingFeedback(`-${points} MMT`, 'negative');
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

    // MMT metrics (always update for now as they depend on multiple fields)
    if (updateAll || fields.has('publicSpending') || fields.has('taxesDeleted') || fields.has('deficit') ||
        fields.has('currencyIssued') || fields.has('mmtScore') || fields.has('sectorialBalances')) {
        updateMMTMetrics();
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

// Update MMT metrics display
export function updateMMTMetrics() {
    // Deficit display
    const deficitStat = getElement('deficitStat');
    if (deficitStat) {
        const deficit = gameState.deficit || 0;
        deficitStat.textContent = `${deficit >= 0 ? '+' : ''}$${deficit.toFixed(0)}B`;
        deficitStat.className = deficit >= 0 ? 'stat-value mmt-value deficit-positive' : 'stat-value mmt-value deficit-negative';
    }

    // Currency issued
    const currencyIssuedStat = getElement('currencyIssuedStat');
    if (currencyIssuedStat) {
        currencyIssuedStat.textContent = `$${(gameState.currencyIssued || 0).toFixed(0)}B`;
    }

    // Taxes deleted
    const taxesDeletedStat = getElement('taxesDeletedStat');
    if (taxesDeletedStat) {
        taxesDeletedStat.textContent = `$${(gameState.taxesDeleted || 0).toFixed(0)}B`;
    }

    // Sectoral balances
    if (gameState.sectorialBalances) {
        const govBalanceStat = getElement('govBalanceStat');
        if (govBalanceStat) {
            const gov = gameState.sectorialBalances.government || 0;
            govBalanceStat.textContent = `${gov >= 0 ? '+' : ''}$${gov.toFixed(0)}B`;
            govBalanceStat.className = gov < 0 ? 'sectoral-value deficit' : 'sectoral-value surplus';
        }

        const pvtBalanceStat = getElement('pvtBalanceStat');
        if (pvtBalanceStat) {
            const pvt = gameState.sectorialBalances.private || 0;
            pvtBalanceStat.textContent = `${pvt >= 0 ? '+' : ''}$${pvt.toFixed(0)}B`;
            pvtBalanceStat.className = pvt >= 0 ? 'sectoral-value surplus' : 'sectoral-value deficit';
        }

        const extBalanceStat = getElement('extBalanceStat');
        if (extBalanceStat) {
            const ext = gameState.sectorialBalances.external || 0;
            extBalanceStat.textContent = `${ext >= 0 ? '+' : ''}$${ext.toFixed(0)}B`;
        }
    }

    // MMT Score
    const mmtScoreStat = getElement('mmtScoreStat');
    if (mmtScoreStat) {
        mmtScoreStat.textContent = gameState.mmtScore || 0;
    }

    // MMT Badges
    const mmtBadgesDisplay = getElement('mmtBadgesDisplay');
    if (mmtBadgesDisplay && gameState.mmtBadges && gameState.mmtBadges.length > 0) {
        mmtBadgesDisplay.innerHTML = gameState.mmtBadges.map(badge => `<span class="badge-icon" title="${badge}">&#127942;</span>`).join('');
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

    // Economic situation narrative (Day counter is shown in header)
    let intro = '';

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
