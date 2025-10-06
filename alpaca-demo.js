/**
 * QPPF Signals with Alpaca Integration Demo Script
 * Demonstrates live trading capabilities with the QPPF algorithm
 */

const API_BASE = 'http://localhost:3000/api';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
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
        return null;
    }
}

async function demoAlpacaIntegration() {
    console.log('🚀 QPPF Signals with Alpaca Integration Demo\n' + '='.repeat(60));

    // 1. Initialize with Alpaca (paper trading mode for demo)
    console.log('\n1. Initializing QPPF Algorithm with Alpaca Paper Trading...');
    const initResult = await apiCall('/initialize', {
        method: 'POST',
        body: JSON.stringify({
            unusualWhalesApiKey: 'demo-key-for-testing',
            symbol: 'SPY',
            alpacaApiKey: 'PKEOWUS5U1Q6M1E4Z3VG', // Demo key
            alpacaSecretKey: 'demo-secret-key',      // Demo secret
            alpacaPaper: true  // Paper trading mode
        })
    });

    if (initResult?.success) {
        console.log('✅ Algorithm initialized successfully!');
        console.log('   Alpaca Enabled:', initResult.alpacaEnabled);
        console.log('   Paper Trading:', initResult.alpacaPaper);
    } else {
        console.log('⚠️ Alpaca connection failed (expected with demo credentials)');
        console.log('   Falling back to signal-only mode...');
        
        // Initialize without Alpaca for demo
        const basicInit = await apiCall('/initialize', {
            method: 'POST',
            body: JSON.stringify({
                unusualWhalesApiKey: 'demo-key-for-testing',
                symbol: 'SPY'
            })
        });
        
        if (!basicInit?.success) {
            console.error('❌ Failed to initialize algorithm');
            return;
        }
        console.log('✅ Basic algorithm initialized (signal-only mode)');
    }

    // 2. Generate trading signal
    console.log('\n2. Generating QPPF trading signal...');
    const signal = await apiCall('/signal', {
        method: 'POST'
    });
    
    if (signal?.success) {
        console.log('✅ Signal generated successfully!');
        console.log('   Direction:', signal.signal.direction);
        console.log('   Confidence:', (signal.signal.confidence * 100).toFixed(1) + '%');
        console.log('   Strength:', (signal.signal.strength * 100).toFixed(1) + '%');
        console.log('   Sentiment:', signal.signal.sentiment);
        console.log('   Market Price:', '$' + signal.signal.marketData.price.toFixed(2));
        
        console.log('\n   Unusual Whales Data:');
        console.log('   - Recent Alerts:', signal.signal.uwSignals.recentAlerts);
        console.log('   - Sentiment Score:', signal.signal.uwSignals.sentimentScore.toFixed(3));
        console.log('   - Large Trades:', signal.signal.uwSignals.largeTradesCount);
    } else {
        console.error('❌ Failed to generate signal');
        return;
    }

    // 3. Demo risk assessment (would work with real Alpaca credentials)
    console.log('\n3. Demonstrating Risk Assessment...');
    console.log('   📊 Risk Management Features:');
    console.log('   • Position sizing based on confidence and portfolio value');
    console.log('   • Maximum risk per trade: 0.5% of portfolio');
    console.log('   • Portfolio risk limit: 2% total exposure');
    console.log('   • Confidence threshold: 70% minimum');
    console.log('   • Maximum positions: 5 simultaneous');

    // 4. Demo trade execution workflow
    console.log('\n4. Trade Execution Workflow:');
    
    // Simulate trade
    console.log('\n   4a. Executing simulated trade...');
    const simulatedTrade = await apiCall('/execute-trade', {
        method: 'POST'
    });
    
    if (simulatedTrade?.success) {
        console.log('   ✅ Simulated trade executed successfully!');
    } else {
        console.log('   ⚠️ Simulated trade not executed:', simulatedTrade?.message || 'Insufficient signal confidence');
    }

    // Show what would happen with real Alpaca credentials
    console.log('\n   4b. Live Trade Execution (requires real Alpaca credentials):');
    console.log('   • GET /api/alpaca/account → Fetch account balance and buying power');
    console.log('   • GET /api/risk-assessment → Calculate position size and risk score');
    console.log('   • POST /api/execute-alpaca-trade → Submit market order to Alpaca');
    console.log('   • GET /api/alpaca/positions → Monitor new position and P&L');

    // 5. Show Alpaca API endpoints
    console.log('\n5. Available Alpaca API Endpoints:');
    console.log('   📈 Account Management:');
    console.log('   • GET /api/alpaca/account - Portfolio value, buying power, cash');
    console.log('   • GET /api/alpaca/positions - Current positions with P&L');
    console.log('   • GET /api/alpaca/orders - Recent order history');
    
    console.log('\n   💼 Trading Operations:');
    console.log('   • POST /api/execute-alpaca-trade - Execute live trades');
    console.log('   • POST /api/alpaca/close-position/:symbol - Close positions');
    console.log('   • GET /api/risk-assessment - Pre-trade risk analysis');

    // 6. Show algorithmic trading features
    console.log('\n6. Advanced Algorithmic Trading Features:');
    console.log('   🤖 Automated Signal Generation:');
    console.log('   • POST /api/start → Begin continuous signal generation');
    console.log('   • Monitors unusual whales flow every 30 seconds');
    console.log('   • Generates new signals when conditions change');
    console.log('   • Can auto-execute trades when configured');

    console.log('\n   🛡️ Risk Management System:');
    console.log('   • Dynamic position sizing based on signal confidence');
    console.log('   • Portfolio-level risk monitoring and limits');
    console.log('   • Multi-factor risk scoring algorithm');
    console.log('   • Automatic position size reduction for high-risk scenarios');

    // 7. Show integration power
    console.log('\n7. QPPF + Unusual Whales + Alpaca Integration:');
    console.log('   📊 Data Flow:');
    console.log('   1. Unusual Whales API → Options flow alerts and sentiment');
    console.log('   2. QPPF Algorithm → Signal processing with confidence scoring');
    console.log('   3. Risk Manager → Position sizing and risk assessment');
    console.log('   4. Alpaca API → Live trade execution and portfolio management');
    console.log('   5. Frontend Dashboard → Real-time monitoring and control');

    // 8. Final status
    console.log('\n8. System Status:');
    const status = await apiCall('/status');
    if (status) {
        console.log('   ✅ Algorithm Status: ' + (status.initialized ? 'Initialized' : 'Not Initialized'));
        console.log('   📊 Statistics:');
        if (status.statistics) {
            console.log('     • Trades executed:', status.statistics.tradesExecuted);
            console.log('     • Current position:', status.statistics.currentPosition);
            console.log('     • Algorithm active:', status.statistics.isActive ? '✅' : '❌');
            console.log('     • Price history length:', status.statistics.priceHistoryLength);
        }
    }

    console.log('\n🎉 Alpaca Integration Demo Completed!');
    console.log('\n📝 Next Steps for Live Trading:');
    console.log('1. 🔑 Get real Alpaca API credentials from alpaca.markets');
    console.log('2. 📊 Start with paper trading mode for testing');
    console.log('3. 🧪 Test with small position sizes');
    console.log('4. 📈 Monitor risk assessments before each trade');
    console.log('5. 🚀 Scale up gradually as you gain confidence');
    console.log('\n⚠️  IMPORTANT: Always use proper risk management and never risk more than you can afford to lose!');
}

// Run the demo
demoAlpacaIntegration().catch(console.error);