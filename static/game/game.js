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
        }

        function toggleIOR() {
            if (!useAction()) return;

            gameState.iorEnabled = !gameState.iorEnabled;
            updateDisplay();
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

            // Simulate thinking delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Generate response based on game state
            const response = generateAdvisorResponse(message);

            // Remove typing indicator
            typingDiv.remove();

            addAdvisorMessage('assistant', response);
        }

        function askQuickAdvisorQuestion(type) {
            const questions = {
                'situation': "What's happening in my economy right now? Should I be worried?",
                'next': "What should I prioritize in my next actions?",
                'mmt': "Can you explain the key MMT principles in this game?",
                'inflation': "How do I manage inflation risk?"
            };

            const question = questions[type];
            if (question) {
                document.getElementById('advisorInput').value = question;
                askAdvisor();
            }
        }

        function generateAdvisorResponse(question) {
            const totalCapacity = Math.min(
                gameState.capacity.energy,
                gameState.capacity.skills,
                gameState.capacity.logistics
            );
            const aggDemand = gameState.publicSpending + gameState.privateCredit + gameState.netExports;
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
                return `Key MMT insights: (1) As a currency issuer, government doesn't need to "find money" before spending - spending creates money. (2) Taxes delete money and free up real resources; they don't fund spending. (3) The real constraint is productive capacity, not money - inflation occurs when demand exceeds what the economy can produce. (4) Job Guarantee provides a buffer stock of employed workers at a fixed wage, acting as both an automatic stabilizer and a price anchor. Your current challenge is managing these principles to achieve ${100 - unemploymentRate < 95 ? 'full employment' : 'price stability'}.`;
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
        window.askQuickAdvisorQuestion = askQuickAdvisorQuestion;

        init();