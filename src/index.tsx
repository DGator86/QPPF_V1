import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { api } from './routes/api';

const app = new Hono();

// Enable CORS for frontend-backend communication
app.use('/api/*', cors());

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

// API routes
app.route('/api', api);

// Main application page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Market Analysis & Option Trading Signals</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          }
          .pulse-animation {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .signal-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
          }
          .signal-long { background-color: #10b981; }
          .signal-short { background-color: #ef4444; }
          .signal-flat { background-color: #6b7280; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="gradient-bg text-white shadow-lg">
            <div class="container mx-auto px-4 py-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold flex items-center">
                            <i class="fas fa-chart-line mr-3"></i>
                            Market Analysis & Options
                        </h1>
                        <p class="text-blue-100 mt-1">Real-time Market Conditions & Option Trading Recommendations</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div id="status-indicator" class="flex items-center">
                            <div class="signal-indicator signal-flat"></div>
                            <span id="status-text" class="text-sm">Not Initialized</span>
                        </div>
                        <button id="refresh-btn" class="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition duration-200">
                            <i class="fas fa-sync-alt mr-2"></i>Refresh
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="container mx-auto px-4 py-8">
            <!-- Market Overview -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-chart-area mr-2 text-blue-600"></i>Market Overview
                </h2>
                
                <!-- Market Metrics Grid -->
                <div class="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-6">
                    <div class="text-center">
                        <div id="spy-price" class="text-3xl font-bold text-blue-600 mb-2">$---.--</div>
                        <div class="text-sm text-gray-600">SPY Current Price</div>
                        <div id="spy-change" class="text-sm mt-1">---.-- (---.-%)</div>
                    </div>
                    <div class="text-center">
                        <div id="gex-level" class="text-3xl font-bold text-purple-600 mb-2">--.--B</div>
                        <div class="text-sm text-gray-600">Total GEX</div>
                        <div class="text-xs text-gray-500 mt-1">Gamma Exposure</div>
                    </div>
                    <div class="text-center">
                        <div id="zgl-level" class="text-3xl font-bold text-orange-600 mb-2">$---.--</div>
                        <div class="text-sm text-gray-600">Zero Gamma Level</div>
                        <div class="text-xs text-gray-500 mt-1">Support/Resistance</div>
                    </div>
                    <div class="text-center">
                        <div id="options-flow" class="text-3xl font-bold text-green-600 mb-2">--</div>
                        <div class="text-sm text-gray-600">Options Flow</div>
                        <div class="text-xs text-gray-500 mt-1">Bullish/Bearish Ratio</div>
                    </div>
                </div>

                <!-- Market Status -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <span class="font-medium text-gray-700">Market Status:</span>
                        <div id="market-status" class="flex items-center">
                            <div class="signal-indicator signal-flat"></div>
                            <span class="text-sm text-gray-600">Analyzing...</span>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="font-medium text-gray-700">Last Updated:</span>
                        <span id="last-update" class="text-sm text-gray-600 ml-2">Never</span>
                    </div>
                </div>
            </div>

            <!-- Option Trading Recommendations -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-lightbulb mr-2 text-yellow-600"></i>Option Trading Recommendations
                </h2>
                
                <!-- Current Recommendation -->
                <div class="mb-6">
                    <div id="current-recommendation" class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold text-blue-800">Primary Recommendation</h3>
                            <div id="rec-confidence" class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">--% Confidence</div>
                        </div>
                        <div id="rec-content" class="text-gray-700">
                            <p class="text-center text-gray-500 py-4">Click "Refresh Analysis" to get current recommendations</p>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="grid md:grid-cols-3 gap-4">
                    <button id="refresh-analysis-btn" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh Analysis
                    </button>
                    <button id="detailed-analysis-btn" class="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200">
                        <i class="fas fa-chart-bar mr-2"></i>Detailed Analysis
                    </button>
                    <button id="export-signals-btn" class="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200">
                        <i class="fas fa-download mr-2"></i>Export Signals
                    </button>
                </div>
            </div>

            <!-- Option Strategy Analysis -->
            <div id="strategy-display" class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-chess mr-2 text-blue-600"></i>Recommended Option Strategies
                </h2>
                
                <div class="grid lg:grid-cols-3 gap-6">
                    <!-- Call Strategy -->
                    <div class="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h3 class="font-semibold text-green-800 mb-3 flex items-center">
                            <i class="fas fa-arrow-up mr-2"></i>Call Strategy
                        </h3>
                        <div id="call-strategy" class="space-y-2 text-sm">
                            <div><strong>Strike:</strong> <span id="call-strike">$---</span></div>
                            <div><strong>Expiry:</strong> <span id="call-expiry">---</span></div>
                            <div><strong>Premium:</strong> <span id="call-premium">$---.--</span></div>
                            <div><strong>IV:</strong> <span id="call-iv">--.-%</span></div>
                            <div class="text-xs text-green-700 mt-2">
                                <span id="call-reasoning">Market analysis in progress...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Put Strategy -->
                    <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                        <h3 class="font-semibold text-red-800 mb-3 flex items-center">
                            <i class="fas fa-arrow-down mr-2"></i>Put Strategy
                        </h3>
                        <div id="put-strategy" class="space-y-2 text-sm">
                            <div><strong>Strike:</strong> <span id="put-strike">$---</span></div>
                            <div><strong>Expiry:</strong> <span id="put-expiry">---</span></div>
                            <div><strong>Premium:</strong> <span id="put-premium">$---.--</span></div>
                            <div><strong>IV:</strong> <span id="put-iv">--.-%</span></div>
                            <div class="text-xs text-red-700 mt-2">
                                <span id="put-reasoning">Market analysis in progress...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Spread Strategy -->
                    <div class="border border-purple-200 rounded-lg p-4 bg-purple-50">
                        <h3 class="font-semibold text-purple-800 mb-3 flex items-center">
                            <i class="fas fa-expand-arrows-alt mr-2"></i>Spread Strategy
                        </h3>
                        <div id="spread-strategy" class="space-y-2 text-sm">
                            <div><strong>Type:</strong> <span id="spread-type">---</span></div>
                            <div><strong>Strikes:</strong> <span id="spread-strikes">$--- / $---</span></div>
                            <div><strong>Net Credit/Debit:</strong> <span id="spread-cost">$---.--</span></div>
                            <div><strong>Max Profit:</strong> <span id="spread-profit">$---.--</span></div>
                            <div class="text-xs text-purple-700 mt-2">
                                <span id="spread-reasoning">Market analysis in progress...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Alpaca Account Info (Hidden by default) -->
            <div id="alpaca-account-display" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-mountain mr-2 text-green-600"></i>Alpaca Account
                </h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div id="portfolio-value" class="text-3xl font-bold text-green-600 mb-2">$0</div>
                        <div class="text-sm text-gray-600">Portfolio Value</div>
                    </div>
                    <div class="text-center">
                        <div id="buying-power" class="text-3xl font-bold text-blue-600 mb-2">$0</div>
                        <div class="text-sm text-gray-600">Buying Power</div>
                    </div>
                    <div class="text-center">
                        <div id="cash-balance" class="text-3xl font-bold text-purple-600 mb-2">$0</div>
                        <div class="text-sm text-gray-600">Cash</div>
                    </div>
                    <div class="text-center">
                        <div id="day-trades" class="text-3xl font-bold text-gray-600 mb-2">0</div>
                        <div class="text-sm text-gray-600">Day Trades</div>
                    </div>
                </div>

                <!-- Current Positions -->
                <div class="mt-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">Current Positions</h3>
                    <div id="positions-list" class="space-y-2">
                        <div class="text-gray-500 text-center py-4">No positions</div>
                    </div>
                </div>

                <!-- Recent Orders -->
                <div class="mt-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">Recent Orders</h3>
                    <div id="orders-list" class="space-y-2">
                        <div class="text-gray-500 text-center py-4">No recent orders</div>
                    </div>
                </div>
            </div>

            <!-- Risk Assessment Display (Hidden by default) -->
            <div id="risk-display" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-shield-alt mr-2 text-purple-600"></i>Risk Assessment
                </h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div id="risk-score" class="text-3xl font-bold text-red-600 mb-2">0%</div>
                        <div class="text-sm text-gray-600">Risk Score</div>
                    </div>
                    <div class="text-center">
                        <div id="position-size" class="text-3xl font-bold text-blue-600 mb-2">0</div>
                        <div class="text-sm text-gray-600">Position Size</div>
                    </div>
                    <div class="text-center">
                        <div id="risk-amount" class="text-3xl font-bold text-purple-600 mb-2">$0</div>
                        <div class="text-sm text-gray-600">Risk Amount</div>
                    </div>
                    <div class="text-center">
                        <div id="recommendation" class="text-3xl font-bold text-gray-600 mb-2">-</div>
                        <div class="text-sm text-gray-600">Recommendation</div>
                    </div>
                </div>

                <div class="mt-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Risk Factors</h4>
                    <ul id="risk-reasons" class="text-sm text-gray-700 space-y-1">
                        <li>No assessment available</li>
                    </ul>
                </div>
            </div>

            <!-- Data Grid -->
            <div class="grid lg:grid-cols-3 gap-6">
                <!-- Unusual Whales Signals -->
                <div class="bg-white rounded-lg shadow-md p-6 card-hover transition-all duration-300">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-whale mr-2 text-blue-600"></i>Unusual Whales Signals
                    </h3>
                    <div id="uw-signals" class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Recent Alerts:</span>
                            <span id="uw-alerts" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Sentiment Score:</span>
                            <span id="uw-sentiment" class="font-semibold">0.00</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Large Trades:</span>
                            <span id="uw-large-trades" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Avg Premium:</span>
                            <span id="uw-premium" class="font-semibold">$0</span>
                        </div>
                    </div>
                </div>

                <!-- Market Data -->
                <div class="bg-white rounded-lg shadow-md p-6 card-hover transition-all duration-300">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-chart-area mr-2 text-green-600"></i>Market Data
                    </h3>
                    <div id="market-data" class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Price:</span>
                            <span id="market-price" class="font-semibold">$0.00</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Volume:</span>
                            <span id="market-volume" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Bid/Ask:</span>
                            <span id="market-bid-ask" class="font-semibold">$0.00 / $0.00</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Last Update:</span>
                            <span id="market-timestamp" class="font-semibold text-sm">Never</span>
                        </div>
                    </div>
                </div>

                <!-- Algorithm Stats -->
                <div class="bg-white rounded-lg shadow-md p-6 card-hover transition-all duration-300">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">
                        <i class="fas fa-robot mr-2 text-purple-600"></i>Algorithm Stats
                    </h3>
                    <div id="algorithm-stats" class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Trades Executed:</span>
                            <span id="stats-trades" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Current Position:</span>
                            <span id="stats-position" class="font-semibold">0</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Entry Price:</span>
                            <span id="stats-entry" class="font-semibold">$0.00</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Status:</span>
                            <span id="stats-status" class="font-semibold">Inactive</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Alerts -->
            <div class="mt-8 bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">
                    <i class="fas fa-list mr-2 text-indigo-600"></i>Recent Options Flow Alerts
                </h3>
                <div id="recent-alerts" class="space-y-2">
                    <div class="text-gray-500 text-center py-4">No alerts available. Generate a signal to see data.</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-8 mt-12">
            <div class="container mx-auto px-4 text-center">
                <p>&copy; 2025 QPPF Signals. Quantum Potential Price Flow Algorithm with Unusual Whales Integration.</p>
                <p class="text-gray-400 mt-2">For educational and demonstration purposes only. Not financial advice.</p>
            </div>
        </footer>

        <!-- Hidden API Keys for Auto-initialization -->
        <input type="hidden" id="uw-api-key" value="0133e53a-fcb3-4c8c-8c6f-d2a1ec4e0692">
        <input type="hidden" id="alpaca-api-key" value="PKTWWCUSF6UXR0AB9VW3">
        <input type="hidden" id="alpaca-secret-key" value="YjJ7vVldwxfJLRzUgZ44YcYVK6qodnFOZchrfBCY">

        <script>
        // Auto-initialize system on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Initializing market analysis system...');
            initializeSystem();
            setInterval(refreshMarketData, 30000); // Refresh every 30 seconds
        });

        async function initializeSystem() {
            try {
                const response = await fetch('/api/initialize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unusualWhalesApiKey: document.getElementById('uw-api-key').value,
                        symbol: 'SPY',
                        alpacaApiKey: document.getElementById('alpaca-api-key').value,
                        alpacaSecretKey: document.getElementById('alpaca-secret-key').value,
                        alpacaPaper: true
                    })
                });
                
                if (response.ok) {
                    document.getElementById('status-text').textContent = 'System Active';
                    document.querySelector('#status-indicator .signal-indicator').className = 'signal-indicator signal-long';
                    refreshMarketData();
                }
            } catch (error) {
                console.error('Initialization failed:', error);
            }
        }

        async function refreshMarketData() {
            try {
                // Generate new signal/analysis
                const signalResponse = await fetch('/api/signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: 'SPY' })
                });
                
                if (signalResponse.ok) {
                    const data = await signalResponse.json();
                    updateMarketDisplay(data.signal);
                }
            } catch (error) {
                console.error('Market data refresh failed:', error);
            }
        }

        function updateMarketDisplay(signal) {
            // Update market overview
            document.getElementById('spy-price').textContent = '$' + signal.marketData.price.toFixed(2);
            document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
            
            if (signal.gexData) {
                document.getElementById('gex-level').textContent = signal.gexData.totalGEX.toFixed(2) + 'B';
                if (signal.gexData.zeroGammaLevel) {
                    document.getElementById('zgl-level').textContent = '$' + signal.gexData.zeroGammaLevel.toFixed(2);
                }
            }
            
            // Update options flow ratio
            const bullish = signal.uwSignals.bullishCount || 0;
            const bearish = signal.uwSignals.bearishCount || 0;
            document.getElementById('options-flow').textContent = bullish + '/' + bearish;
            
            // Update market status
            const statusElement = document.querySelector('#market-status span');
            const statusIndicator = document.querySelector('#market-status .signal-indicator');
            
            if (signal.direction === 'LONG') {
                statusElement.textContent = 'Bullish (' + (signal.confidence * 100).toFixed(0) + '%)';
                statusIndicator.className = 'signal-indicator signal-long';
            } else if (signal.direction === 'SHORT') {
                statusElement.textContent = 'Bearish (' + (signal.confidence * 100).toFixed(0) + '%)';
                statusIndicator.className = 'signal-indicator signal-short';
            } else {
                statusElement.textContent = 'Neutral (' + (signal.confidence * 100).toFixed(0) + '%)';
                statusIndicator.className = 'signal-indicator signal-flat';
            }

            // Generate option recommendations
            generateOptionRecommendations(signal);
        }

        function generateOptionRecommendations(signal) {
            const currentPrice = signal.marketData.price;
            const isNearExpiry = true; // For now, assume weekly options
            
            // Call strategy recommendation
            const callStrike = Math.ceil(currentPrice / 5) * 5; // Next $5 strike above
            document.getElementById('call-strike').textContent = '$' + callStrike;
            document.getElementById('call-expiry').textContent = getNextFridayExpiry();
            document.getElementById('call-premium').textContent = '$' + (currentPrice * 0.02).toFixed(2); // Estimated 2% premium
            document.getElementById('call-iv').textContent = '35%'; // Estimated IV
            
            let callReasoning = '';
            if (signal.direction === 'LONG') {
                callReasoning = 'Strong bullish signals detected. Consider ATM or slightly OTM calls.';
            } else if (signal.direction === 'FLAT') {
                callReasoning = 'Neutral market. Consider covered calls or cash-secured puts.';
            } else {
                callReasoning = 'Bearish signals present. Avoid long calls, consider puts instead.';
            }
            document.getElementById('call-reasoning').textContent = callReasoning;

            // Put strategy recommendation  
            const putStrike = Math.floor(currentPrice / 5) * 5; // Next $5 strike below
            document.getElementById('put-strike').textContent = '$' + putStrike;
            document.getElementById('put-expiry').textContent = getNextFridayExpiry();
            document.getElementById('put-premium').textContent = '$' + (currentPrice * 0.018).toFixed(2); // Estimated premium
            document.getElementById('put-iv').textContent = '38%'; // Puts typically higher IV

            let putReasoning = '';
            if (signal.direction === 'SHORT') {
                putReasoning = 'Bearish signals detected. Consider ATM or slightly OTM puts for protection/profit.';
            } else if (signal.direction === 'FLAT') {
                putReasoning = 'Sideways market. Consider cash-secured puts for income generation.';
            } else {
                putReasoning = 'Bullish signals present. Puts may be expensive, consider selling puts.';
            }
            document.getElementById('put-reasoning').textContent = putReasoning;

            // Spread strategy
            const spreadType = signal.direction === 'LONG' ? 'Bull Call Spread' : signal.direction === 'SHORT' ? 'Bear Put Spread' : 'Iron Condor';
            document.getElementById('spread-type').textContent = spreadType;
            document.getElementById('spread-strikes').textContent = '$' + putStrike + ' / $' + callStrike;
            document.getElementById('spread-cost').textContent = '$' + (currentPrice * 0.01).toFixed(2);
            document.getElementById('spread-profit').textContent = '$' + (currentPrice * 0.025).toFixed(2);
            
            let spreadReasoning = '';
            if (spreadType === 'Bull Call Spread') {
                spreadReasoning = 'Limited risk bullish strategy. Lower cost than buying calls outright.';
            } else if (spreadType === 'Bear Put Spread') {
                spreadReasoning = 'Limited risk bearish strategy. Profit from moderate downward moves.';
            } else {
                spreadReasoning = 'Market neutral strategy. Profit from low volatility and time decay.';
            }
            document.getElementById('spread-reasoning').textContent = spreadReasoning;

            // Update main recommendation
            const recElement = document.getElementById('rec-content');
            const confElement = document.getElementById('rec-confidence');
            confElement.textContent = (signal.confidence * 100).toFixed(0) + '% Confidence';
            
            let mainRec = '';
            if (signal.confidence > 0.7) {
                if (signal.direction === 'LONG') {
                    mainRec = '<strong>Bullish Outlook:</strong> Consider buying calls at $' + callStrike + ' strike expiring ' + getNextFridayExpiry() + '. Strong upward momentum detected with ' + signal.reasonsLong.length + ' supporting factors.';
                } else if (signal.direction === 'SHORT') {
                    mainRec = '<strong>Bearish Outlook:</strong> Consider buying puts at $' + putStrike + ' strike expiring ' + getNextFridayExpiry() + '. Downward pressure detected with ' + signal.reasonsShort.length + ' risk factors.';
                } else {
                    mainRec = '<strong>Neutral Outlook:</strong> Consider income strategies like selling covered calls or cash-secured puts. Market showing consolidation patterns.';
                }
            } else {
                mainRec = '<strong>Low Confidence Signal:</strong> Consider waiting for clearer market direction or using spread strategies to limit risk. Current confidence: ' + (signal.confidence * 100).toFixed(0) + '%';
            }
            
            recElement.innerHTML = '<p>' + mainRec + '</p>';
        }

        function getNextFridayExpiry() {
            const today = new Date();
            const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
            const nextFriday = new Date(today.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
            return nextFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Manual refresh button
        document.getElementById('refresh-btn').addEventListener('click', refreshMarketData);
        document.getElementById('refresh-analysis-btn').addEventListener('click', refreshMarketData);
        </script>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    service: 'QPPF Signals Website',
    timestamp: new Date().toISOString() 
  });
});

export default app;
