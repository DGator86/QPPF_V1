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
        <title>QPPF Signals - Quantum Trading Algorithm</title>
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
                            QPPF Signals
                        </h1>
                        <p class="text-blue-100 mt-1">Quantum Potential Price Flow Algorithm with Unusual Whales Integration</p>
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
            <!-- Configuration Panel -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-cogs mr-2"></i>Configuration
                </h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Unusual Whales API Key</label>
                        <input type="password" id="uw-api-key" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Enter API key">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                        <input type="text" id="symbol" value="SPY" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="SPY">
                    </div>
                    <div class="flex items-end">
                        <button id="initialize-btn" class="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition duration-200">
                            <i class="fas fa-play mr-2"></i>Initialize
                        </button>
                    </div>
                </div>
            </div>

            <!-- Trading Controls -->
            <div class="grid md:grid-cols-4 gap-4 mb-8">
                <button id="signal-btn" class="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200 disabled:opacity-50">
                    <i class="fas fa-bolt mr-2"></i>Generate Signal
                </button>
                <button id="start-btn" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50">
                    <i class="fas fa-play mr-2"></i>Start Auto
                </button>
                <button id="stop-btn" class="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition duration-200 disabled:opacity-50">
                    <i class="fas fa-stop mr-2"></i>Stop
                </button>
                <button id="reset-btn" class="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition duration-200 disabled:opacity-50">
                    <i class="fas fa-undo mr-2"></i>Reset
                </button>
            </div>

            <!-- Current Signal Display -->
            <div id="signal-display" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
                <h2 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-signal mr-2"></i>Current Signal
                </h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div id="direction-indicator" class="text-3xl font-bold mb-2">-</div>
                        <div class="text-sm text-gray-600">Direction</div>
                    </div>
                    <div class="text-center">
                        <div id="confidence-indicator" class="text-3xl font-bold text-blue-600 mb-2">0%</div>
                        <div class="text-sm text-gray-600">Confidence</div>
                    </div>
                    <div class="text-center">
                        <div id="strength-indicator" class="text-3xl font-bold text-purple-600 mb-2">0%</div>
                        <div class="text-sm text-gray-600">Strength</div>
                    </div>
                    <div class="text-center">
                        <div id="sentiment-indicator" class="text-3xl font-bold text-gray-600 mb-2">-</div>
                        <div class="text-sm text-gray-600">Sentiment</div>
                    </div>
                </div>
                
                <div class="mt-6 grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold text-green-700 mb-2">Long Reasons</h4>
                        <ul id="long-reasons" class="text-sm text-gray-700 space-y-1">
                            <li>No data available</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-semibold text-red-700 mb-2">Short Reasons</h4>
                        <ul id="short-reasons" class="text-sm text-gray-700 space-y-1">
                            <li>No data available</li>
                        </ul>
                    </div>
                </div>

                <div class="mt-6">
                    <button id="execute-btn" class="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition duration-200 disabled:opacity-50">
                        <i class="fas fa-play-circle mr-2"></i>Simulate Trade
                    </button>
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
