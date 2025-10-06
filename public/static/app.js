/**
 * QPPF Signals Website Frontend JavaScript
 * Handles all user interactions and API communication
 */

class QPPFSignalsApp {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        this.apiBase = '/api';
        
        this.initializeEventListeners();
        this.updateStatus();
        
        // Auto-refresh status every 10 seconds
        setInterval(() => this.updateStatus(), 10000);
    }

    initializeEventListeners() {
        // Configuration
        document.getElementById('initialize-btn').addEventListener('click', () => this.initializeAlgorithm());
        
        // Trading controls - Signal generation
        document.getElementById('signal-btn').addEventListener('click', () => this.generateSignal());
        document.getElementById('start-btn').addEventListener('click', () => this.startAlgorithm());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopAlgorithm());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetAlgorithm());
        
        // Trading controls - Execution
        document.getElementById('execute-btn').addEventListener('click', () => this.executeTrade());
        document.getElementById('execute-alpaca-btn').addEventListener('click', () => this.executeAlpacaTrade());
        document.getElementById('risk-assessment-btn').addEventListener('click', () => this.getRiskAssessment());
        
        // UI controls
        document.getElementById('refresh-btn').addEventListener('click', () => this.updateStatus());
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            this.showError(`API Error: ${error.message}`);
            return null;
        }
    }

    async initializeAlgorithm() {
        const uwApiKey = document.getElementById('uw-api-key').value.trim();
        const symbol = document.getElementById('symbol').value.trim() || 'SPY';
        const alpacaApiKey = document.getElementById('alpaca-api-key').value.trim();
        const alpacaSecretKey = document.getElementById('alpaca-secret-key').value.trim();
        const alpacaPaper = document.getElementById('alpaca-paper').value === 'true';

        if (!uwApiKey) {
            this.showError('Please enter your Unusual Whales API key');
            return;
        }

        // Check if Alpaca credentials are provided
        const hasAlpacaCredentials = alpacaApiKey && alpacaSecretKey;
        
        if (hasAlpacaCredentials) {
            this.showLoading('Initializing algorithm with Alpaca integration...');
        } else {
            this.showLoading('Initializing algorithm (signal-only mode)...');
        }

        const initData = {
            unusualWhalesApiKey: uwApiKey,
            symbol: symbol
        };

        // Add Alpaca credentials if provided
        if (hasAlpacaCredentials) {
            initData.alpacaApiKey = alpacaApiKey;
            initData.alpacaSecretKey = alpacaSecretKey;
            initData.alpacaPaper = alpacaPaper;
        }

        const result = await this.apiCall('/initialize', {
            method: 'POST',
            body: JSON.stringify(initData)
        });

        if (result && result.success) {
            this.isInitialized = true;
            this.alpacaEnabled = result.alpacaEnabled || false;
            
            if (this.alpacaEnabled) {
                this.showSuccess(`Algorithm initialized for ${symbol} with Alpaca ${alpacaPaper ? 'Paper' : 'Live'} Trading`);
                this.showAlpacaAccount();
                this.loadAlpacaAccount();
            } else {
                this.showSuccess(`Algorithm initialized for ${symbol} (Signal-only mode)`);
            }
            
            this.updateControlsState();
            this.updateStatus();
        } else {
            this.showError('Failed to initialize algorithm');
        }
    }

    async generateSignal() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        this.showLoading('Generating signal...');

        const result = await this.apiCall('/signal', {
            method: 'POST'
        });

        if (result && result.success) {
            this.displaySignal(result.signal);
            this.showSuccess('Signal generated successfully');
        } else {
            this.showError('Failed to generate signal');
        }
    }

    async startAlgorithm() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        const result = await this.apiCall('/start', {
            method: 'POST'
        });

        if (result && result.success) {
            this.isRunning = true;
            this.showSuccess('Algorithm started');
            this.updateControlsState();
            
            // Start periodic signal updates
            this.startSignalPolling();
        } else {
            this.showError('Failed to start algorithm');
        }
    }

    async stopAlgorithm() {
        const result = await this.apiCall('/stop', {
            method: 'POST'
        });

        if (result && result.success) {
            this.isRunning = false;
            this.showSuccess('Algorithm stopped');
            this.updateControlsState();
            this.stopSignalPolling();
        } else {
            this.showError('Failed to stop algorithm');
        }
    }

    async resetAlgorithm() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        const result = await this.apiCall('/reset', {
            method: 'POST'
        });

        if (result && result.success) {
            this.showSuccess('Algorithm reset');
            this.clearSignalDisplay();
            this.updateStatus();
        } else {
            this.showError('Failed to reset algorithm');
        }
    }

    async executeTrade() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        this.showLoading('Executing simulated trade...');

        const result = await this.apiCall('/execute-trade', {
            method: 'POST'
        });

        if (result) {
            if (result.success) {
                this.showSuccess('Simulated trade executed successfully');
            } else {
                this.showWarning(result.message || 'Trade not executed');
            }
            this.updateStatus();
        } else {
            this.showError('Failed to execute simulated trade');
        }
    }

    async executeAlpacaTrade() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        if (!this.alpacaEnabled) {
            this.showError('Alpaca trading not enabled. Please initialize with Alpaca credentials.');
            return;
        }

        // Show confirmation dialog for live trades
        const alpacaPaper = document.getElementById('alpaca-paper').value === 'true';
        const confirmMessage = alpacaPaper 
            ? 'Execute paper trade via Alpaca?' 
            : '⚠️ Execute LIVE TRADE via Alpaca? This will use real money!';
        
        if (!confirm(confirmMessage)) {
            return;
        }

        this.showLoading('Executing live trade via Alpaca...');

        const result = await this.apiCall('/execute-alpaca-trade', {
            method: 'POST'
        });

        if (result) {
            if (result.success) {
                this.showSuccess('Live trade executed successfully via Alpaca!');
                this.loadAlpacaAccount(); // Refresh account info
            } else {
                this.showError(result.message || 'Trade execution failed');
            }
        } else {
            this.showError('Failed to execute live trade');
        }
    }

    async getRiskAssessment() {
        if (!this.isInitialized) {
            this.showError('Please initialize the algorithm first');
            return;
        }

        if (!this.alpacaEnabled) {
            this.showError('Risk assessment requires Alpaca integration');
            return;
        }

        this.showLoading('Calculating risk assessment...');

        const result = await this.apiCall('/risk-assessment');

        if (result && result.success) {
            this.displayRiskAssessment(result);
            this.showSuccess('Risk assessment completed');
        } else {
            this.showError('Failed to get risk assessment');
        }
    }

    async loadAlpacaAccount() {
        if (!this.alpacaEnabled) return;

        try {
            // Load account info
            const accountResult = await this.apiCall('/alpaca/account');
            if (accountResult && accountResult.success) {
                this.updateAlpacaAccount(accountResult.account);
            }

            // Load positions
            const positionsResult = await this.apiCall('/alpaca/positions');
            if (positionsResult && positionsResult.success) {
                this.updateAlpacaPositions(positionsResult.positions);
            }

            // Load recent orders
            const ordersResult = await this.apiCall('/alpaca/orders');
            if (ordersResult && ordersResult.success) {
                this.updateAlpacaOrders(ordersResult.orders);
            }

        } catch (error) {
            console.error('Error loading Alpaca account data:', error);
        }
    }

    showAlpacaAccount() {
        document.getElementById('alpaca-account-display').classList.remove('hidden');
    }

    hideAlpacaAccount() {
        document.getElementById('alpaca-account-display').classList.add('hidden');
    }

    updateAlpacaAccount(account) {
        document.getElementById('portfolio-value').textContent = `$${account.portfolioValue.toLocaleString()}`;
        document.getElementById('buying-power').textContent = `$${account.buyingPower.toLocaleString()}`;
        document.getElementById('cash-balance').textContent = `$${account.cash.toLocaleString()}`;
        document.getElementById('day-trades').textContent = account.dayTradeCount.toString();
    }

    updateAlpacaPositions(positions) {
        const container = document.getElementById('positions-list');
        
        if (!positions || positions.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-4">No positions</div>';
            return;
        }

        container.innerHTML = positions.map(pos => `
            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg ${pos.unrealizedPL >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                <div class="flex items-center space-x-3">
                    <span class="font-semibold">${pos.symbol}</span>
                    <span class="text-sm ${pos.side === 'long' ? 'text-green-600' : 'text-red-600'}">${pos.side.toUpperCase()}</span>
                    <span class="text-gray-600">${pos.qty} shares</span>
                </div>
                <div class="text-right">
                    <div class="font-semibold ${pos.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${pos.unrealizedPL >= 0 ? '+' : ''}$${pos.unrealizedPL.toFixed(2)}
                    </div>
                    <div class="text-sm text-gray-500">${pos.unrealizedPLPC >= 0 ? '+' : ''}${(pos.unrealizedPLPC * 100).toFixed(2)}%</div>
                </div>
            </div>
        `).join('');
    }

    updateAlpacaOrders(orders) {
        const container = document.getElementById('orders-list');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-4">No recent orders</div>';
            return;
        }

        container.innerHTML = orders.slice(0, 5).map(order => `
            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div class="flex items-center space-x-3">
                    <span class="font-semibold">${order.symbol}</span>
                    <span class="text-sm ${order.side === 'buy' ? 'text-green-600' : 'text-red-600'}">${order.side.toUpperCase()}</span>
                    <span class="text-gray-600">${order.quantity} shares</span>
                </div>
                <div class="text-right">
                    <div class="font-semibold ${
                        order.status === 'filled' ? 'text-green-600' :
                        order.status === 'canceled' ? 'text-red-600' :
                        'text-yellow-600'
                    }">${order.status.toUpperCase()}</div>
                    <div class="text-sm text-gray-500">${new Date(order.submittedAt).toLocaleTimeString()}</div>
                </div>
            </div>
        `).join('');
    }

    displayRiskAssessment(result) {
        document.getElementById('risk-display').classList.remove('hidden');
        
        const assessment = result.riskAssessment;
        const report = result.riskReport;

        // Update risk metrics
        document.getElementById('risk-score').textContent = `${(assessment.riskScore * 100).toFixed(1)}%`;
        document.getElementById('position-size').textContent = assessment.positionSize.toString();
        document.getElementById('risk-amount').textContent = `$${assessment.riskAmount.toFixed(2)}`;
        
        // Update recommendation
        const recommendationEl = document.getElementById('recommendation');
        recommendationEl.textContent = assessment.recommendation.toUpperCase();
        recommendationEl.className = `text-3xl font-bold mb-2 ${
            assessment.recommendation === 'execute' ? 'text-green-600' :
            assessment.recommendation === 'reduce' ? 'text-yellow-600' :
            'text-red-600'
        }`;

        // Update risk reasons
        this.updateRiskReasons('risk-reasons', assessment.reasons);
    }

    updateRiskReasons(elementId, reasons) {
        const element = document.getElementById(elementId);
        if (reasons && reasons.length > 0) {
            element.innerHTML = reasons.map(reason => 
                `<li class="flex items-start"><i class="fas fa-exclamation-triangle text-yellow-500 mr-2 mt-0.5 text-xs"></i>${reason}</li>`
            ).join('');
        } else {
            element.innerHTML = '<li class="text-gray-400">No risk factors identified</li>';
        }
    }

    async updateStatus() {
        const result = await this.apiCall('/status');

        if (result) {
            this.isInitialized = result.initialized;
            this.isRunning = result.running;
            
            // Update status indicator
            const statusIndicator = document.getElementById('status-indicator').querySelector('.signal-indicator');
            const statusText = document.getElementById('status-text');
            
            if (result.initialized && result.running) {
                statusIndicator.className = 'signal-indicator signal-long pulse-animation';
                statusText.textContent = 'Running';
            } else if (result.initialized) {
                statusIndicator.className = 'signal-indicator signal-short';
                statusText.textContent = 'Initialized';
            } else {
                statusIndicator.className = 'signal-indicator signal-flat';
                statusText.textContent = 'Not Initialized';
            }

            // Update algorithm stats
            if (result.statistics) {
                this.updateAlgorithmStats(result.statistics);
            }

            // Update latest signal if available
            if (result.latestSignal) {
                this.displaySignal(result.latestSignal, true);
            }

            this.updateControlsState();
        }
    }

    displaySignal(signal, isFromStatus = false) {
        // Show signal display panel
        document.getElementById('signal-display').classList.remove('hidden');

        // Update direction
        const directionEl = document.getElementById('direction-indicator');
        directionEl.textContent = signal.direction;
        directionEl.className = `text-3xl font-bold mb-2 ${
            signal.direction === 'LONG' ? 'text-green-600' :
            signal.direction === 'SHORT' ? 'text-red-600' :
            'text-gray-600'
        }`;

        // Update confidence and strength
        document.getElementById('confidence-indicator').textContent = `${(signal.confidence * 100).toFixed(1)}%`;
        document.getElementById('strength-indicator').textContent = `${(signal.strength * 100).toFixed(1)}%`;

        // Update sentiment
        const sentimentEl = document.getElementById('sentiment-indicator');
        sentimentEl.textContent = signal.sentiment.toUpperCase();
        sentimentEl.className = `text-3xl font-bold mb-2 ${
            signal.sentiment === 'bullish' ? 'text-green-600' :
            signal.sentiment === 'bearish' ? 'text-red-600' :
            'text-gray-600'
        }`;

        // Update reasons
        this.updateReasons('long-reasons', signal.reasonsLong);
        this.updateReasons('short-reasons', signal.reasonsShort);

        // Update market data and UW signals if available
        if (!isFromStatus && signal.marketData) {
            this.updateMarketData(signal.marketData);
        }

        if (!isFromStatus && signal.uwSignals) {
            this.updateUnusualWhalesSignals(signal.uwSignals);
            this.displayRecentAlerts(signal.uwSignals.recentAlertsList);
        }
    }

    updateReasons(elementId, reasons) {
        const element = document.getElementById(elementId);
        if (reasons && reasons.length > 0) {
            element.innerHTML = reasons.map(reason => 
                `<li class="flex items-start"><i class="fas fa-check-circle text-green-500 mr-2 mt-0.5 text-xs"></i>${reason}</li>`
            ).join('');
        } else {
            element.innerHTML = '<li class="text-gray-400">No reasons available</li>';
        }
    }

    updateMarketData(marketData) {
        document.getElementById('market-price').textContent = `$${marketData.price.toFixed(2)}`;
        document.getElementById('market-volume').textContent = marketData.volume.toLocaleString();
        document.getElementById('market-bid-ask').textContent = `$${marketData.bid.toFixed(2)} / $${marketData.ask.toFixed(2)}`;
        document.getElementById('market-timestamp').textContent = new Date(marketData.timestamp).toLocaleTimeString();
    }

    updateUnusualWhalesSignals(uwSignals) {
        document.getElementById('uw-alerts').textContent = uwSignals.recentAlerts;
        document.getElementById('uw-sentiment').textContent = uwSignals.sentimentScore.toFixed(2);
        document.getElementById('uw-large-trades').textContent = uwSignals.largeTradesCount;
        document.getElementById('uw-premium').textContent = `$${(uwSignals.avgPremium / 1000).toFixed(1)}k`;
    }

    updateAlgorithmStats(stats) {
        document.getElementById('stats-trades').textContent = stats.tradesExecuted;
        document.getElementById('stats-position').textContent = stats.currentPosition;
        document.getElementById('stats-entry').textContent = `$${stats.entryPrice.toFixed(2)}`;
        document.getElementById('stats-status').textContent = stats.isActive ? 'Active' : 'Inactive';
    }

    displayRecentAlerts(alerts) {
        const container = document.getElementById('recent-alerts');
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-4">No recent alerts available</div>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div class="flex items-center space-x-3">
                    <span class="signal-indicator ${alert.sentiment === 'bullish' ? 'signal-long' : alert.sentiment === 'bearish' ? 'signal-short' : 'signal-flat'}"></span>
                    <div>
                        <span class="font-semibold">${alert.symbol}</span>
                        <span class="text-gray-600 ml-2">${alert.optionType.toUpperCase()} $${alert.strike}</span>
                        <span class="text-gray-500 text-sm ml-2">${alert.expiry}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-semibold">$${(alert.premium / 1000).toFixed(1)}k</div>
                    <div class="text-sm text-gray-500">${alert.volume} vol</div>
                </div>
            </div>
        `).join('');
    }

    clearSignalDisplay() {
        document.getElementById('signal-display').classList.add('hidden');
        document.getElementById('recent-alerts').innerHTML = '<div class="text-gray-500 text-center py-4">No alerts available</div>';
    }

    updateControlsState() {
        const signalBtn = document.getElementById('signal-btn');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const resetBtn = document.getElementById('reset-btn');
        const executeBtn = document.getElementById('execute-btn');
        const executeAlpacaBtn = document.getElementById('execute-alpaca-btn');
        const riskAssessmentBtn = document.getElementById('risk-assessment-btn');

        // Disable/enable based on state
        signalBtn.disabled = !this.isInitialized;
        startBtn.disabled = !this.isInitialized || this.isRunning;
        stopBtn.disabled = !this.isRunning;
        resetBtn.disabled = !this.isInitialized;
        executeBtn.disabled = !this.isInitialized;
        
        // Alpaca-specific controls
        executeAlpacaBtn.disabled = !this.isInitialized || !this.alpacaEnabled;
        riskAssessmentBtn.disabled = !this.isInitialized || !this.alpacaEnabled;
        
        // Update button text to show Alpaca status
        if (this.alpacaEnabled) {
            const alpacaPaper = document.getElementById('alpaca-paper').value === 'true';
            executeAlpacaBtn.innerHTML = `<i class="fas fa-mountain mr-2"></i>Execute ${alpacaPaper ? 'Paper' : 'Live'} Trade`;
        }
    }

    startSignalPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll for new signals every 30 seconds when running
        this.pollingInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.updateStatus();
            }
        }, 30000);
    }

    stopSignalPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    showLoading(message) {
        this.showNotification(message, 'info');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        // Simple notification system (could be enhanced with a proper toast library)
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-600 text-white' :
            type === 'error' ? 'bg-red-600 text-white' :
            type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-triangle' :
                    type === 'warning' ? 'fa-exclamation-circle' :
                    'fa-info-circle'
                }"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);

        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.qppfApp = new QPPFSignalsApp();
});