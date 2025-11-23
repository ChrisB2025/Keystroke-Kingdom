// ========================================
// Django Integration Layer
// ========================================

// Get CSRF token from cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get CSRF token (from cookie or Django context)
function getCSRFToken() {
    return window.DJANGO_CONFIG?.csrfToken || getCookie('csrftoken');
}

// Check if user is authenticated
function isUserAuthenticated() {
    return window.DJANGO_CONFIG?.isAuthenticated || false;
}

// Save game to server
async function saveGameToServer() {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping server save');
        return;
    }

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                game_state: gameState,
                day: gameState.currentDay,
                employment: gameState.employment,
                inflation: gameState.inflation,
                services_score: gameState.servicesScore
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Game saved to server');
        } else {
            console.error('Failed to save game:', data.error);
        }
    } catch (error) {
        console.error('Error saving game:', error);
    }
}

// Load game from server
async function loadGameFromServer() {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping server load');
        return null;
    }

    try {
        const response = await fetch('/api/load', {
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        const data = await response.json();
        if (data.success && data.data) {
            console.log('Game loaded from server');
            return data.data.game_state;
        } else {
            console.log('No saved game found on server');
            return null;
        }
    } catch (error) {
        console.error('Error loading game:', error);
        return null;
    }
}

// Submit high score to server
async function submitHighScoreToServer(finalScore) {
    if (!isUserAuthenticated()) {
        console.log('Not authenticated, skipping score submission');
        return;
    }

    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                score: finalScore,
                final_day: gameState.currentDay,
                employment: gameState.employment,
                inflation: gameState.inflation,
                services: gameState.servicesScore
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('High score submitted successfully');
        } else {
            console.error('Failed to submit score:', data.error);
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Load leaderboard from server
async function loadLeaderboardFromServer(limit = 50) {
    try {
        const response = await fetch(`/api/leaderboard?limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            console.error('Failed to load leaderboard:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
    }
}

// Call Claude API through Django proxy
async function callClaudeAPIProxy(messages) {
    if (!isUserAuthenticated()) {
        return {
            success: false,
            error: 'Please log in to use the Economic Advisor'
        };
    }

    try {
        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                messages: messages
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling Claude API:', error);
        return {
            success: false,
            error: 'Failed to connect to Economic Advisor'
        };
    }
}

// ========================================
// End Django Integration Layer
// ========================================

// Keystroke Kingdom v6.0
        // Version history:
        // v6.0 - Rebranded from "Keystroke City" to "Keystroke Kingdom"
        // v5.95 - Previous stable version
        // Version history:
        // v5.95 - Fixed navigation button layout (restored side navigation from v5.93, reverted oversized top navigation from v5.94)
        // v5.94 - Fixed Central Bank buttons (ensure single action cost), game end at day 30 with screen darkening, Job Guarantee button fix
        // v5.93 - Previous version

        const mmtKnowledge = `
1. Currency Issuer vs User: Government issues currency, doesn't need to "get" money before spending
2. Taxes Delete Money: Taxes remove money from circulation, they don't fund government spending
3. Real Resource Constraint: Inflation comes from demand exceeding real productive capacity, not from money creation
4. Job Guarantee: Buffer stock employment at fixed wage provides price anchor and automatic stabilization
5. Functional Finance: Policy goals are full employment and price stability, not balanced budgets
`;

        let gameState = {
            currentDay: 1,
            totalDays: 30,
            actionsRemaining: 3,
            
            employment: 85,
            inflation: 2.0,
            servicesScore: 50,
            
            capacity: {
                energy: 70,
                skills: 70,
                logistics: 70
            },
            capacityUsed: 85,
            
            publicSpending: 40,
            privateCredit: 50,
            netExports: -21,
            
            taxRate: 20,
            policyRate: 2.0,
            
            jgEnabled: false,
            jgWage: 15,
            jgPoolSize: 0,
            
            creditRegulation: 0,
            yieldControl: false,
            iorEnabled: false,
            
            currencyIssued: 0,
            taxesDeleted: 0,
            
            finalScore: 0,
            gameOver: false
        };

        let chatState = {
            active: false,
            messages: [],
            conversationHistory: []
        };

        function init() {
            updateDisplay();
            selectLocation('treasury');
            loadHighScores();
            
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keypress', handleChatKeyPress);
            }
        }

        function updateDisplay() {
            document.getElementById('dayCounter').textContent = `Day ${gameState.currentDay} / ${gameState.totalDays}`;
            document.getElementById('actionsDisplay').textContent = `${gameState.actionsRemaining} actions left`;
            
            document.getElementById('employmentStat').textContent = `${gameState.employment.toFixed(0)}%`;
            document.getElementById('inflationStat').textContent = `${gameState.inflation.toFixed(1)}%`;
            document.getElementById('capacityStat').textContent = `${gameState.capacityUsed.toFixed(0)}%`;
            document.getElementById('servicesStat').textContent = gameState.servicesScore.toFixed(0);
            document.getElementById('taxRateStat').textContent = `${gameState.taxRate}%`;
            document.getElementById('policyRateStat').textContent = `${gameState.policyRate.toFixed(1)}%`;
            
            document.getElementById('pubSpend').textContent = `$${gameState.publicSpending.toFixed(0)}B`;
            document.getElementById('pvtCredit').textContent = `$${gameState.privateCredit.toFixed(0)}B`;
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
            document.getElementById('aggDemand').textContent = `$${aggDemand.toFixed(0)}B`;
            
            const employmentEl = document.getElementById('employmentStat');
            if (gameState.employment >= 95) {
                employmentEl.className = 'stat-value good';
            } else if (gameState.employment >= 85) {
                employmentEl.className = 'stat-value warning';
            } else {
                employmentEl.className = 'stat-value bad';
            }
            
            const inflationEl = document.getElementById('inflationStat');
            if (gameState.inflation >= 2 && gameState.inflation <= 3) {
                inflationEl.className = 'stat-value good';
            } else if (gameState.inflation >= 1 && gameState.inflation <= 4) {
                inflationEl.className = 'stat-value warning';
            } else {
                inflationEl.className = 'stat-value bad';
            }
            
            updateCapacityBars();
            updatePolicyIndicators();
        }

        function updateCapacityBars() {
            const bars = [
                { id: 'energyBar', value: gameState.capacity.energy },
                { id: 'skillsBar', value: gameState.capacity.skills },
                { id: 'logisticsBar', value: gameState.capacity.logistics }
            ];
            
            bars.forEach(bar => {
                const element = document.getElementById(bar.id);
                const percentage = Math.min(100, bar.value);
                element.style.width = `${percentage}%`;
                element.textContent = bar.value.toFixed(0);
            });
        }

        function updatePolicyIndicators() {
            const jgIndicator = document.getElementById('jgIndicator');
            jgIndicator.textContent = gameState.jgEnabled ? 'Job Guarantee: ON' : 'Job Guarantee: OFF';
            jgIndicator.className = gameState.jgEnabled ? 'indicator-btn active' : 'indicator-btn';
            
            const yieldIndicator = document.getElementById('yieldControlIndicator');
            yieldIndicator.textContent = gameState.yieldControl ? 'Yield Control: ON' : 'Yield Control: OFF';
            yieldIndicator.className = gameState.yieldControl ? 'indicator-btn active' : 'indicator-btn';
            
            const iorIndicator = document.getElementById('iorIndicator');
            iorIndicator.textContent = gameState.iorEnabled ? 'IOR: ON' : 'IOR: OFF';
            iorIndicator.className = gameState.iorEnabled ? 'indicator-btn active' : 'indicator-btn';
        }

        function useAction() {
            if (gameState.actionsRemaining > 0) {
                gameState.actionsRemaining--;
                updateDisplay();
                return true;
            }
            return false;
        }

        function nextTurn() {
            if (gameState.gameOver) return;
            
            gameState.currentDay++;
            gameState.actionsRemaining = 3;
            
            evolveEconomy();
            calculateInflation();
            updateEmployment();
            
            // Check if game should end at day 30
            if (gameState.currentDay > gameState.totalDays) {
                endGame();
            } else {
                updateDisplay();
            }
        }

        function evolveEconomy() {
            const privCreditGrowth = 0.5 - (gameState.policyRate / 20) + (gameState.creditRegulation * 0.3);
            gameState.privateCredit += privCreditGrowth;
            gameState.privateCredit = Math.max(20, gameState.privateCredit);
            
            const taxMultiplier = 1 - (gameState.taxRate / 100) * 0.7;
            gameState.privateCredit *= (0.98 + taxMultiplier * 0.02);
            
            if (gameState.jgEnabled) {
                const unemploymentRate = 100 - gameState.employment;
                gameState.jgPoolSize = unemploymentRate * 0.7;
                const jgSpending = gameState.jgPoolSize * gameState.jgWage * 0.01;
                gameState.publicSpending += jgSpending * 0.1;
            }
            
            gameState.capacity.energy += Math.random() * 0.3 - 0.1;
            gameState.capacity.skills += Math.random() * 0.3 - 0.1;
            gameState.capacity.logistics += Math.random() * 0.3 - 0.1;
        }

        function calculateInflation() {
            const totalCapacity = Math.min(
                gameState.capacity.energy,
                gameState.capacity.skills,
                gameState.capacity.logistics
            );
            
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
            gameState.capacityUsed = Math.min(100, (aggDemand / totalCapacity) * 100);
            
            const demandGap = aggDemand - totalCapacity;
            
            if (demandGap > 0) {
                const baseInflation = Math.pow(demandGap / totalCapacity, 1.5) * 10;
                gameState.inflation = 2.0 + baseInflation;
            } else {
                const deflationPressure = Math.abs(demandGap) / totalCapacity;
                gameState.inflation = Math.max(0, 2.0 - deflationPressure * 3);
            }
            
            if (gameState.jgEnabled) {
                gameState.inflation *= 0.9;
            }
        }

        function updateEmployment() {
            const totalCapacity = Math.min(
                gameState.capacity.energy,
                gameState.capacity.skills,
                gameState.capacity.logistics
            );
            
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
            
            const baseEmployment = 60 + (aggDemand / totalCapacity) * 35;
            gameState.employment = Math.min(100, Math.max(50, baseEmployment));
            
            if (gameState.jgEnabled) {
                const unemploymentRate = 100 - gameState.employment;
                const jgAbsorption = unemploymentRate * 0.7;
                gameState.employment += jgAbsorption;
                gameState.employment = Math.min(100, gameState.employment);
            }
        }

        function publicSpending(sector, amount) {
            if (!useAction()) return;

            gameState.publicSpending += amount;
            gameState.currencyIssued += amount;

            if (sector === 'healthcare') gameState.servicesScore += 2;
            if (sector === 'education') gameState.servicesScore += 2;
            if (sector === 'infrastructure') gameState.servicesScore += 1.5;
            if (sector === 'consumption') gameState.servicesScore += 1;
            if (sector === 'stimulus') gameState.servicesScore += 1.5;
            if (sector === 'training') gameState.servicesScore += 1.5;
            if (sector === 'wages') gameState.servicesScore += 1;
            if (sector === 'green') gameState.servicesScore += 2;

            updateDisplay();
        }

        function investInCapacity(type) {
            if (!useAction()) return;
            
            const investAmount = 10;
            if (type === 'energy') gameState.capacity.energy += investAmount;
            if (type === 'skills') gameState.capacity.skills += investAmount;
            if (type === 'logistics') gameState.capacity.logistics += investAmount;
            
            gameState.publicSpending += 3;
            gameState.currencyIssued += 3;
            
            updateDisplay();
        }

        function importGoods() {
            if (!useAction()) return;
            
            gameState.netExports -= 5;
            gameState.capacity.energy += 2;
            gameState.capacity.skills += 2;
            gameState.capacity.logistics += 2;
            
            updateDisplay();
        }

        function toggleJobGuarantee() {
            if (!useAction()) return;
            
            gameState.jgEnabled = !gameState.jgEnabled;
            updateDisplay();
            selectLocation('employment');
        }

        function adjustTax(amount) {
            if (!useAction()) return;

            gameState.taxRate = Math.max(0, Math.min(50, gameState.taxRate + amount));

            const totalTaxes = gameState.publicSpending * (gameState.taxRate / 100);
            gameState.taxesDeleted = totalTaxes;

            updateDisplay();
        }

        function adjustPolicyRate(amount) {
            if (!useAction()) return;

            gameState.policyRate = Math.max(0, Math.min(10, gameState.policyRate + amount));
            updateDisplay();
        }

        function setJGWage(value) {
            if (!useAction()) {
                document.getElementById('jgWageInput').value = gameState.jgWage;
                document.getElementById('jgWageDisplay').textContent = gameState.jgWage;
                return;
            }
            gameState.jgWage = parseInt(value);
            updateDisplay();
        }

        function applyMacroprudential(type) {
            if (type === 'tighten') {
                gameState.creditRegulation = -1;
            } else if (type === 'loosen') {
                gameState.creditRegulation = 1;
            } else {
                gameState.creditRegulation = 0;
            }
            
            updateDisplay();
            selectLocation('central-bank');
        }

        function fundProject(project) {
            if (!useAction()) return;
            
            gameState.publicSpending += 3;
            gameState.currencyIssued += 3;
            gameState.servicesScore += 1.5;
            
            updateDisplay();
        }

        function toggleYieldControl() {
            if (!useAction()) return;
            
            gameState.yieldControl = !gameState.yieldControl;
            updateDisplay();
            selectLocation('central-bank');
        }

        function toggleIOR() {
            if (!useAction()) return;
            
            gameState.iorEnabled = !gameState.iorEnabled;
            updateDisplay();
            selectLocation('central-bank');
        }

        function regulatePrivateCredit(type) {
            if (!useAction()) return;
            applyMacroprudential(type);
        }

        function selectLocation(location, event) {
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

        function endGame() {
            gameState.gameOver = true;
            
            // Darken and disable the game container
            document.getElementById('gameContainer').classList.add('game-over');
            
            const employmentScore = gameState.employment * 2;
            const inflationPenalty = Math.abs(gameState.inflation - 2.5) * 10;
            const servicesBonus = gameState.servicesScore * 1.5;
            
            gameState.finalScore = Math.max(0, employmentScore + servicesBonus - inflationPenalty);
            
            // Submit high score to server (if authenticated)
            submitHighScoreToServer(gameState.finalScore);
            
            promptForName();
        }

        function promptForName() {
            document.getElementById('finalScoreDisplay').textContent = gameState.finalScore.toFixed(0);
            document.getElementById('highScoreInputSection').style.display = 'block';
            document.getElementById('playerNameInput').value = '';
            showHighScores();
            setTimeout(() => {
                document.getElementById('playerNameInput').focus();
            }, 100);
        }

        function submitHighScore() {
            const nameInput = document.getElementById('playerNameInput');
            const name = nameInput.value.trim() || 'Player';
            addHighScore(name, gameState.finalScore);
            document.getElementById('highScoreInputSection').style.display = 'none';
            showHighScores();
        }

        async function showHighScores() {
            const modal = document.getElementById('highScoresModal');
            modal.classList.add('active');
            modal.style.display = 'flex';

            // Load from server API
            const highscores = await loadLeaderboardFromServer(50);
            const list = document.getElementById('highScoresList');

            if (highscores && highscores.length > 0) {
                list.innerHTML = `<table class="highscore-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Score</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${highscores.map((score, index) => `
                            <tr>
                                <td class="highscore-rank">${index + 1}</td>
                                <td>${score.username}</td>
                                <td class="highscore-score">${score.score}</td>
                                <td class="highscore-date">${new Date(score.achieved_at).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
            } else {
                list.innerHTML = '<p style="text-align:center; padding: 20px; color: #64748b;">No high scores yet. Be the first to play!</p>';
            }
        }

        function closeHighScores() {
            const modal = document.getElementById('highScoresModal');
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        function addHighScore(name, score) {
            const highscores = JSON.parse(localStorage.getItem('keystrokeCityHighScores') || '[]');
            const date = new Date().toLocaleDateString();
            
            highscores.push({ name, score: Math.round(score), date });
            highscores.sort((a, b) => b.score - a.score);
            
            if (highscores.length > 10) {
                highscores.length = 10;
            }
            
            localStorage.setItem('keystrokeCityHighScores', JSON.stringify(highscores));
        }

        function loadHighScores() {
            if (!localStorage.getItem('keystrokeCityHighScores')) {
                localStorage.setItem('keystrokeCityHighScores', JSON.stringify([]));
            }
        }

        // Chat Functions
        function toggleChat() {
            chatState.active = !chatState.active;
            const chatPanel = document.getElementById('chatPanel');
            
            if (chatState.active) {
                chatPanel.classList.add('active');
                updateChatContext();
            } else {
                chatPanel.classList.remove('active');
            }
        }

        function updateChatContext() {
            const context = document.getElementById('chatContext');
            context.innerHTML = `
                <span class="context-item"><span class="context-label">Day:</span> ${gameState.currentDay}</span>
                <span class="context-item"><span class="context-label">Employment:</span> ${gameState.employment.toFixed(0)}%</span>
                <span class="context-item"><span class="context-label">Inflation:</span> ${gameState.inflation.toFixed(1)}%</span>
                <span class="context-item"><span class="context-label">Capacity:</span> ${gameState.capacityUsed.toFixed(0)}%</span>
            `;
        }

        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            addChatMessage('user', message);
            input.value = '';
            
            showTypingIndicator();
            
            try {
                const response = await getAdvisorResponse(message);
                hideTypingIndicator();
                addChatMessage('assistant', response);
            } catch (error) {
                hideTypingIndicator();
                addChatMessage('assistant', "I'm having trouble responding right now. Try asking something else!");
            }
        }

        function addChatMessage(type, content) {
            const messagesDiv = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${type}`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            chatState.messages.push({ type, content });
        }

        function showTypingIndicator() {
            document.getElementById('typingIndicator').classList.add('active');
            document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
        }

        function hideTypingIndicator() {
            document.getElementById('typingIndicator').classList.remove('active');
        }

        async function getAdvisorResponse(userMessage) {
            const totalCapacity = Math.min(
                gameState.capacity.energy,
                gameState.capacity.skills,
                gameState.capacity.logistics
            );
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
            
            const gameContext = `
Current Game State (Day ${gameState.currentDay}/${gameState.totalDays}):

ECONOMIC INDICATORS:
- Employment: ${gameState.employment.toFixed(1)}% (Target: >95%)
- Inflation: ${gameState.inflation.toFixed(1)}% (Target: 2-3%)
- Capacity Utilization: ${gameState.capacityUsed.toFixed(1)}%

CAPACITY CONSTRAINTS (Bottleneck Model):
- Energy: ${gameState.capacity.energy.toFixed(0)} units
- Skills: ${gameState.capacity.skills.toFixed(0)} units
- Logistics: ${gameState.capacity.logistics.toFixed(0)} units
- Total Capacity (min): ${totalCapacity.toFixed(0)} units
Note: Capacity = min(energy, skills, logistics). Inflation occurs when demand exceeds this bottleneck.

AGGREGATE DEMAND:
- Public Spending: ${gameState.publicSpending.toFixed(0)} units
- Private Credit: ${gameState.privateCredit.toFixed(0)} units
- Net Exports: ${gameState.netExports.toFixed(0)} units
- Total Demand: ${aggDemand.toFixed(0)} units
- Demand Gap: ${(aggDemand - totalCapacity).toFixed(0)} units

POLICY SETTINGS:
- Tax Rate: ${gameState.taxRate}% (affects private spending via multiplier)
- Policy Rate: ${gameState.policyRate.toFixed(1)}% (affects private credit growth)
- Credit Regulation: ${gameState.creditRegulation === -1 ? 'Tight' : gameState.creditRegulation === 1 ? 'Loose' : 'Neutral'}
- Job Guarantee: ${gameState.jgEnabled ? 'ENABLED' : 'DISABLED'}
${gameState.jgEnabled ? `- JG Pool: ${gameState.jgPoolSize.toFixed(1)}% of workforce\
- JG Wage: $${gameState.jgWage}/hour (anchors price level)` : ''}
- Yield Control: ${gameState.yieldControl ? 'ON' : 'OFF'}
- Interest on Reserves: ${gameState.iorEnabled ? 'ON' : 'OFF'}

MMT ACCOUNTING:
- Currency Issued: $${gameState.currencyIssued.toFixed(0)}B
- Taxes Deleted: $${gameState.taxesDeleted.toFixed(0)}B
- Services Score: ${gameState.servicesScore.toFixed(0)}

ACTIONS REMAINING: ${gameState.actionsRemaining}

GAME MECHANICS:
1. Inflation = f(Demand - Capacity). When demand exceeds minimum capacity, inflation rises.
2. JG acts as buffer stock, absorbs 70% of unemployed, provides price anchor via fixed wage.
3. Taxes reduce private spending (70% multiplier effect), don't fund government.
4. Private credit growth affected by policy rate and credit regulation.
5. Investment builds capacity over time. All policy changes consume actions.
`;

            const messages = [
                { 
                    role: "user", 
                    content: `You are the Economic Advisor for Keystroke Kingdom, an MMT-based economic simulator. Your role is to explain Modern Monetary Theory principles, help with strategy, and guide policy decisions based on the current game state.

Key MMT Principles:
${mmtKnowledge}

Current Game Context:
${gameContext}

Guidelines:
- Be concise (2-3 sentences max)
- Reference specific game data in your response
- Connect advice to MMT principles
- Don't give away optimal strategies - guide thinking instead
- Focus on understanding constraints: real resources (capacity) matter, not money

User Question: ${userMessage}`
                }
            ];

            chatState.conversationHistory.slice(-4).forEach(msg => messages.push(msg));
            messages.push({ role: "user", content: userMessage });

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 300,
                    messages: messages
                })
            });

            const data = await response.json();
            const advisorResponse = data.content[0].text;

            chatState.conversationHistory.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: advisorResponse }
            );

            if (chatState.conversationHistory.length > 8) {
                chatState.conversationHistory = chatState.conversationHistory.slice(-8);
            }

            return advisorResponse;
        }

        function handleChatKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        async function askQuickQuestion(questionType) {
            const questions = {
                'explain-current-situation': "What's happening in my economy right now? Should I be worried?",
                'next-move': "What should I prioritize in my next actions?",
                'explain-mmt': "Can you explain the key MMT principles that apply to this game?",
                'inflation-risk': "How do I manage inflation risk in this game?"
            };

            const question = questions[questionType];
            if (question) {
                document.getElementById('chatInput').value = question;
                sendMessage();
            }
        }

        function handleEventChoice(choice) {
            document.getElementById('eventModal').classList.remove('active');
        }

        // Economic Advisor Functions
        function openAdvisor() {
            const modal = document.getElementById('advisorModal');
            modal.classList.add('active');
            modal.style.display = 'flex';

            // Focus on input
            setTimeout(() => {
                document.getElementById('advisorInput').focus();
            }, 100);
        }

        function closeAdvisor() {
            const modal = document.getElementById('advisorModal');
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        async function askAdvisor() {
            const input = document.getElementById('advisorInput');
            const message = input.value.trim();

            if (!message) return;

            // Add user message to conversation
            addAdvisorMessage('user', message);
            input.value = '';

            // Show typing indicator
            const conversationHistory = document.getElementById('conversationHistory');
            const typingDiv = document.createElement('div');
            typingDiv.className = 'advisor-message assistant typing';
            typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            conversationHistory.appendChild(typingDiv);
            conversationHistory.scrollTop = conversationHistory.scrollHeight;

            try {
                // Build context about current game state
                const gameContext = buildGameContext();

                // Call Claude API through Django proxy
                const messages = [
                    {
                        role: "user",
                        content: `You are an Economic Advisor for Keystroke Kingdom, an MMT-based economic strategy game. Help the player understand their current situation and make informed decisions based on Modern Monetary Theory principles.

Current Game State:
${gameContext}

MMT Principles:
${mmtKnowledge}

Be concise (2-3 sentences), reference specific game data, and connect advice to MMT principles. Guide thinking rather than giving away optimal strategies.

Player Question: ${message}`
                    }
                ];

                const response = await callClaudeAPIProxy(messages);

                // Remove typing indicator
                typingDiv.remove();

                if (response.success && response.message) {
                    addAdvisorMessage('assistant', response.message);
                } else {
                    addAdvisorMessage('assistant', response.error || 'Sorry, I had trouble processing that. Please try again.');
                }
            } catch (error) {
                // Remove typing indicator
                typingDiv.remove();
                addAdvisorMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }
        }

        function addAdvisorMessage(role, content) {
            const conversationHistory = document.getElementById('conversationHistory');
            const messageDiv = document.createElement('div');
            messageDiv.className = `advisor-message ${role}`;
            messageDiv.textContent = content;
            conversationHistory.appendChild(messageDiv);
            conversationHistory.scrollTop = conversationHistory.scrollHeight;
        }

        function buildGameContext() {
            const totalCapacity = Math.min(
                gameState.capacity.energy,
                gameState.capacity.skills,
                gameState.capacity.logistics
            );
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;

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

        // Handle Enter key in advisor input
        document.addEventListener('DOMContentLoaded', function() {
            const advisorInput = document.getElementById('advisorInput');
            if (advisorInput) {
                advisorInput.addEventListener('keypress', function(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        askAdvisor();
                    }
                });
            }
        });

        // Export functions to window
        window.publicSpending = publicSpending;
        window.investInCapacity = investInCapacity;
        window.importGoods = importGoods;
        window.toggleJobGuarantee = toggleJobGuarantee;
        window.adjustTax = adjustTax;
        window.adjustPolicyRate = adjustPolicyRate;
        window.setJGWage = setJGWage;
        window.handleEventChoice = handleEventChoice;
        window.selectLocation = selectLocation;
        window.showHighScores = showHighScores;
        window.closeHighScores = closeHighScores;
        window.promptForName = promptForName;
        window.addHighScore = addHighScore;
        window.applyMacroprudential = applyMacroprudential;
        window.fundProject = fundProject;
        window.toggleYieldControl = toggleYieldControl;
        window.toggleIOR = toggleIOR;
        window.toggleChat = toggleChat;
        window.sendMessage = sendMessage;
        window.askQuickQuestion = askQuickQuestion;
        window.regulatePrivateCredit = regulatePrivateCredit;
        window.submitHighScore = submitHighScore;
        window.nextTurn = nextTurn;
        window.openAdvisor = openAdvisor;
        window.closeAdvisor = closeAdvisor;
        window.askAdvisor = askAdvisor;

        init();