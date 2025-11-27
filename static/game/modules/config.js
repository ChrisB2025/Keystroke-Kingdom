/**
 * config.js - Game constants, MMT knowledge, and economic events configuration
 * Keystroke Kingdom v6.0
 */

// MMT Knowledge Base
export const mmtKnowledge = `
1. Currency Issuer vs User: Government issues currency, doesn't need to "get" money before spending
2. Taxes Delete Money: Taxes remove money from circulation, they don't fund government spending
3. Real Resource Constraint: Inflation comes from demand exceeding real productive capacity, not from money creation
4. Job Guarantee: Buffer stock employment at fixed wage provides price anchor and automatic stabilization
5. Functional Finance: Policy goals are full employment and price stability, not balanced budgets
`;

// Game Constants
export const GAME_CONSTANTS = {
    TOTAL_DAYS: 30,
    ACTIONS_PER_TURN: 3,
    INITIAL_EMPLOYMENT: 85,
    INITIAL_INFLATION: 2.0,
    INITIAL_SERVICES: 50,
    INITIAL_CAPACITY: 70,
    INITIAL_PUBLIC_SPENDING: 40,
    INITIAL_PRIVATE_CREDIT: 50,
    INITIAL_NET_EXPORTS: -21,
    INITIAL_TAX_RATE: 20,
    INITIAL_POLICY_RATE: 2.0,
    MIN_EMPLOYMENT: 50,
    MAX_EMPLOYMENT: 100,
    MIN_TAX_RATE: 0,
    MAX_TAX_RATE: 50,
    MIN_POLICY_RATE: 0,
    MAX_POLICY_RATE: 10,
    MIN_CAPACITY: 10,
    MIN_PRIVATE_CREDIT: 20,
    JG_ABSORPTION_RATE: 0.7,
    AUTO_SAVE_DEBOUNCE_MS: 2000
};

// Economic Events System
export const economicEvents = {
    // SUPPLY SHOCKS
    energyCrisis: {
        id: 'energyCrisis',
        name: 'Energy Crisis',
        probability: 0.35,
        dayRange: [8, 22],
        condition: (state) => true,
        description: '<strong>Global Energy Crisis!</strong><br><br>A major oil supply disruption has caused energy prices to spike globally. Your energy capacity has dropped by 25%. This is a classic supply-side constraint.',
        effects: {
            capacity: { energy: -25 }
        },
        choices: [
            {
                text: 'Emergency Energy Investment ($30B)',
                mmtFraming: 'Use fiscal space to expand supply',
                effect: (state) => {
                    state.publicSpending += 30;
                    state.currencyIssued += 30;
                    state.capacity.energy += 15;
                    return 'You invested heavily in alternative energy and efficiency. Energy capacity partially restored. Public spending increased significantly.';
                },
                cost: 2
            },
            {
                text: 'Reduce Demand (Cut Spending $20B)',
                mmtFraming: 'Contract demand to match lower supply',
                effect: (state) => {
                    state.publicSpending -= 20;
                    return 'You cut public spending to reduce energy demand. This may hurt employment and services.';
                },
                cost: 1
            },
            {
                text: 'Import Energy (Increase Imports)',
                mmtFraming: 'Use external sector to supplement capacity',
                effect: (state) => {
                    state.netExports -= 15;
                    state.capacity.energy += 8;
                    return 'You increased energy imports. Trade deficit widened, but domestic capacity supplemented.';
                },
                cost: 1
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> This demonstrates the <em>real resource constraint</em>. No amount of currency creation can produce more oil if it doesn\'t exist. Your options are to (1) expand supply through investment, (2) reduce demand, or (3) import. Notice that "money" isn\'t the constraint - real energy is.'
    },

    skillsShortage: {
        id: 'skillsShortage',
        name: 'Skills Shortage',
        probability: 0.30,
        dayRange: [10, 20],
        condition: (state) => state.capacity.skills < 80,
        description: '<strong>Critical Skills Shortage!</strong><br><br>Major industries report they can\'t find workers with the right skills. Your skills capacity has dropped 20%. This is constraining your economy\'s productive potential.',
        effects: {
            capacity: { skills: -20 }
        },
        choices: [
            {
                text: 'Major Training Program ($25B)',
                mmtFraming: 'Invest in human capital',
                effect: (state) => {
                    state.publicSpending += 25;
                    state.currencyIssued += 25;
                    state.capacity.skills += 25;
                    state.servicesScore += 3;
                    return 'You launched a comprehensive training and education program. Skills capacity will grow over time.';
                },
                cost: 2
            },
            {
                text: 'Job Guarantee Training Track',
                mmtFraming: 'Use JG as skills development program',
                effect: (state) => {
                    if (!state.jgEnabled) {
                        state.jgEnabled = true;
                    }
                    state.capacity.skills += 15;
                    state.servicesScore += 2;
                    return 'You integrated skills training into the Job Guarantee program. This provides both employment and capacity building.';
                },
                cost: 1
            },
            {
                text: 'Wait - Market Will Adjust',
                mmtFraming: 'Rely on private sector response',
                effect: (state) => {
                    return 'You decided to let market forces address the shortage. Recovery will be slower.';
                },
                cost: 0
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> Skills are a real resource constraint. The Job Guarantee can serve dual purposes: providing employment AND developing human capital. This is "functional finance" - using fiscal policy to achieve real economic goals.'
    },

    // FINANCIAL INSTABILITY
    creditBoom: {
        id: 'creditBoom',
        name: 'Private Credit Boom',
        probability: 0.40,
        dayRange: [6, 18],
        condition: (state) => state.privateCredit > 45 && !state.events.triggeredEvents.includes('creditBoom'),
        description: '<strong>Private Credit Boom!</strong><br><br>Banks are lending aggressively! Private credit has surged by $35B. While this boosts demand, it risks creating asset bubbles and unstable private debt levels.',
        effects: {
            privateCredit: 35,
            inflation: 1.5
        },
        choices: [
            {
                text: 'Macroprudential Regulation',
                mmtFraming: 'Control private money creation',
                effect: (state) => {
                    state.creditRegulation = -1;
                    state.privateCredit -= 15;
                    return 'You tightened lending standards. Private credit growth will slow, reducing bubble risk.';
                },
                cost: 1
            },
            {
                text: 'Raise Policy Rate (+2%)',
                mmtFraming: 'Use interest rates to discourage borrowing',
                effect: (state) => {
                    state.policyRate += 2.0;
                    state.policyRate = Math.min(10, state.policyRate);
                    return 'You raised rates sharply. This will reduce private credit but may hurt productive investment too.';
                },
                cost: 1
            },
            {
                text: 'Countercyclical Fiscal Policy',
                mmtFraming: 'Use taxes to cool private demand',
                effect: (state) => {
                    state.taxRate += 10;
                    state.taxRate = Math.min(50, state.taxRate);
                    state.privateCredit -= 10;
                    return 'You raised taxes to cool private sector demand. This withdraws spending power and reduces inflation pressure.';
                },
                cost: 1
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> Private banks create money through lending - this can be destabilizing! Government can use macroprudential regulation, interest rates, or taxes to control private credit. Notice: taxes are a tool for managing demand, not for "funding" government.'
    },

    deleveraging: {
        id: 'deleveraging',
        name: 'Private Sector Deleveraging',
        probability: 0.35,
        dayRange: [12, 25],
        condition: (state) => state.privateCredit > 30,
        description: '<strong>Private Sector Deleveraging Shock!</strong><br><br>Households and businesses are suddenly cutting spending to pay down debt. Private credit has crashed by $30B. This is a classic recession trigger - the "paradox of thrift."',
        effects: {
            privateCredit: -30,
            employment: -12
        },
        choices: [
            {
                text: 'Emergency Fiscal Stimulus ($40B)',
                mmtFraming: 'Government deficit offsets private surplus',
                effect: (state) => {
                    state.publicSpending += 40;
                    state.currencyIssued += 40;
                    state.servicesScore += 2;
                    return 'You enacted massive fiscal stimulus. Government deficits are offsetting private sector surpluses (sectoral balances!).';
                },
                cost: 2
            },
            {
                text: 'Activate Job Guarantee',
                mmtFraming: 'Automatic stabilizer absorbs unemployment',
                effect: (state) => {
                    state.jgEnabled = true;
                    return 'The Job Guarantee automatically absorbed workers losing private sector jobs. This is the buffer stock in action!';
                },
                cost: 1
            },
            {
                text: 'Tax Cuts (-15% Rate)',
                mmtFraming: 'Leave more money in private sector',
                effect: (state) => {
                    state.taxRate -= 15;
                    state.taxRate = Math.max(0, state.taxRate);
                    state.privateCredit += 5;
                    return 'You cut taxes to leave more spending power in the private sector. This may help stabilize demand.';
                },
                cost: 1
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> This perfectly illustrates <em>sectoral balances</em>. When the private sector runs a surplus (saves/deleverages), the government must run a deficit to maintain full employment. The Job Guarantee acts as an automatic stabilizer - no discretionary action needed!'
    },

    // POLITICAL PRESSURE
    deficitHawks: {
        id: 'deficitHawks',
        name: 'Deficit Hawk Backlash',
        probability: 0.30,
        dayRange: [15, 28],
        condition: (state) => state.publicSpending > 60,
        description: '<strong>Media Panic Over Government Deficit!</strong><br><br>"Government is going bankrupt!" cry the headlines. Deficit hawks are demanding immediate spending cuts. The media doesn\'t understand MMT principles about currency sovereignty.',
        effects: {},
        choices: [
            {
                text: 'Cave to Pressure (Cut $25B)',
                mmtFraming: 'Unnecessary austerity - wrong policy',
                effect: (state) => {
                    state.publicSpending -= 25;
                    state.servicesScore -= 3;
                    return 'You cut spending to appease critics. This was economically unnecessary and will hurt employment and services.';
                },
                cost: 1
            },
            {
                text: 'Public Education Campaign',
                mmtFraming: 'Explain currency sovereignty',
                effect: (state) => {
                    state.servicesScore += 2;
                    return 'You launched a campaign explaining that currency issuers can\'t "run out of money." The real constraint is inflation, not deficits!';
                },
                cost: 1
            },
            {
                text: 'Ignore Critics - Hold Course',
                mmtFraming: 'Focus on real economy, not accounting',
                effect: (state) => {
                    return 'You ignored the deficit hawks and focused on employment and inflation. MMT vindicated - the economy is what matters!';
                },
                cost: 0
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> As a currency issuer, your government cannot "run out of money" or "go bankrupt" in its own currency. The constraint is INFLATION (real resources), not deficits (accounting). Deficit hawks misunderstand modern monetary systems.'
    },

    // EXTERNAL SECTOR
    currencyAttack: {
        id: 'currencyAttack',
        name: 'Currency Speculation',
        probability: 0.25,
        dayRange: [18, 28],
        condition: (state) => state.netExports < -25 && state.publicSpending > 55,
        description: '<strong>Currency Under Pressure!</strong><br><br>Foreign investors are dumping your currency, claiming your fiscal policy is "unsustainable." The exchange rate has weakened, making imports more expensive.',
        effects: {
            inflation: 1.8,
            netExports: -12
        },
        choices: [
            {
                text: 'Hold Course - Floating FX',
                mmtFraming: 'Let exchange rate adjust',
                effect: (state) => {
                    state.netExports -= 8;
                    return 'You let the currency float. Exports become more competitive but imports cost more. This is the automatic adjustment mechanism.';
                },
                cost: 0
            },
            {
                text: 'Raise Rates to Defend Currency',
                mmtFraming: 'Attract foreign capital (but hurts economy)',
                effect: (state) => {
                    state.policyRate += 3.0;
                    state.policyRate = Math.min(10, state.policyRate);
                    state.netExports += 5;
                    state.employment -= 5;
                    return 'You raised rates to attract capital. Currency stabilized but high rates hurt domestic economy.';
                },
                cost: 1
            },
            {
                text: 'Boost Domestic Production',
                mmtFraming: 'Reduce import dependence',
                effect: (state) => {
                    state.publicSpending += 20;
                    state.currencyIssued += 20;
                    state.capacity.energy += 5;
                    state.capacity.logistics += 5;
                    return 'You invested in domestic productive capacity to reduce reliance on imports. A long-term solution!';
                },
                cost: 2
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> With a floating exchange rate, currency "attacks" are less threatening. The exchange rate acts as a shock absorber. However, import dependency can create inflation constraints. The real solution is building domestic productive capacity.'
    },

    // OPPORTUNITY EVENTS
    techBreakthrough: {
        id: 'techBreakthrough',
        name: 'Technological Breakthrough',
        probability: 0.35,
        dayRange: [10, 22],
        condition: (state) => state.capacity.energy < 90 || state.capacity.skills < 90,
        description: '<strong>Major Technological Breakthrough!</strong><br><br>Your scientists have achieved a breakthrough in productivity technology! With proper investment, this could dramatically expand your economy\'s productive capacity.',
        effects: {},
        choices: [
            {
                text: 'Major Investment ($50B)',
                mmtFraming: 'Expand productive frontier',
                effect: (state) => {
                    state.publicSpending += 50;
                    state.currencyIssued += 50;
                    state.capacity.energy += 30;
                    state.capacity.skills += 25;
                    state.capacity.logistics += 20;
                    state.servicesScore += 5;
                    return 'You seized the opportunity! Massive capacity expansion across all sectors. This is real wealth creation!';
                },
                cost: 3
            },
            {
                text: 'Moderate Investment ($25B)',
                mmtFraming: 'Balanced approach',
                effect: (state) => {
                    state.publicSpending += 25;
                    state.currencyIssued += 25;
                    state.capacity.energy += 15;
                    state.capacity.skills += 12;
                    state.servicesScore += 2;
                    return 'You made a solid investment in the new technology. Decent capacity gains achieved.';
                },
                cost: 2
            },
            {
                text: 'Pass - Too Expensive',
                mmtFraming: 'Missed opportunity',
                effect: (state) => {
                    return 'You passed on the investment opportunity. The technological potential remains untapped.';
                },
                cost: 0
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> This is what real economic growth looks like - expanding productive capacity! Currency creation to fund this investment doesn\'t cause inflation because you\'re increasing the economy\'s ability to produce. This is the difference between productive and unproductive spending.'
    },

    greenTransition: {
        id: 'greenTransition',
        name: 'Climate Action Opportunity',
        probability: 0.30,
        dayRange: [8, 25],
        condition: (state) => !state.events.triggeredEvents.includes('greenTransition'),
        description: '<strong>Green Transition Opportunity!</strong><br><br>There\'s growing pressure to transition to a green economy. This requires major investment but could create jobs, reduce energy vulnerability, and expand sustainable capacity.',
        effects: {},
        choices: [
            {
                text: 'Green New Deal ($60B)',
                mmtFraming: 'Massive green infrastructure program',
                effect: (state) => {
                    state.publicSpending += 60;
                    state.currencyIssued += 60;
                    state.capacity.energy += 35;
                    state.capacity.logistics += 15;
                    state.servicesScore += 8;
                    if (!state.jgEnabled) {
                        state.jgEnabled = true;
                    }
                    return 'You launched a Green New Deal! Massive employment, capacity expansion, and sustainability gains. JG activated for green jobs.';
                },
                cost: 3
            },
            {
                text: 'Targeted Green Investment ($30B)',
                mmtFraming: 'Focused transition program',
                effect: (state) => {
                    state.publicSpending += 30;
                    state.currencyIssued += 30;
                    state.capacity.energy += 20;
                    state.servicesScore += 4;
                    return 'You invested strategically in green energy and efficiency. Solid progress toward sustainability.';
                },
                cost: 2
            },
            {
                text: 'Delay - Not Ready Yet',
                mmtFraming: 'Postpone transition',
                effect: (state) => {
                    return 'You delayed the green transition. The climate challenge remains unaddressed.';
                },
                cost: 0
            }
        ],
        mmtLesson: '<strong>MMT Insight:</strong> The question isn\'t "how will we pay for it?" but "do we have the real resources?" A currency-issuing government can always afford green investment. The constraint is productive capacity, skilled labor, and materials - not money. This is functional finance for climate action!'
    }
};
