/**
 * QPPF Signals API Demo Script
 * Demonstrates how to use the QPPF Signals API programmatically
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

async function demoQPPFAPI() {
    console.log('🚀 QPPF Signals API Demo\n' + '='.repeat(50));

    // 1. Check API health
    console.log('\n1. Checking API health...');
    const health = await apiCall('/health');
    console.log('Health:', health);

    // 2. Get API information
    console.log('\n2. Getting API information...');
    const info = await apiCall('/info');
    console.log('Available endpoints:', Object.keys(info.endpoints || {}));

    // 3. Initialize algorithm
    console.log('\n3. Initializing QPPF Algorithm...');
    const initResult = await apiCall('/initialize', {
        method: 'POST',
        body: JSON.stringify({
            unusualWhalesApiKey: 'demo-key-for-testing',
            symbol: 'SPY'
        })
    });
    console.log('Initialize result:', initResult);

    if (!initResult?.success) {
        console.error('❌ Failed to initialize algorithm');
        return;
    }

    // 4. Generate trading signal
    console.log('\n4. Generating trading signal...');
    const signal = await apiCall('/signal', {
        method: 'POST'
    });
    
    if (signal?.success) {
        console.log('✅ Signal generated successfully!');
        console.log('Direction:', signal.signal.direction);
        console.log('Confidence:', (signal.signal.confidence * 100).toFixed(1) + '%');
        console.log('Strength:', (signal.signal.strength * 100).toFixed(1) + '%');
        console.log('Sentiment:', signal.signal.sentiment);
        console.log('Market Price:', '$' + signal.signal.marketData.price.toFixed(2));
        console.log('Recent UW Alerts:', signal.signal.uwSignals.recentAlerts);
        
        if (signal.signal.reasonsLong.length > 0) {
            console.log('\nLong Reasons:');
            signal.signal.reasonsLong.forEach(reason => console.log('  ✓', reason));
        }
        
        if (signal.signal.reasonsShort.length > 0) {
            console.log('\nShort Reasons:');
            signal.signal.reasonsShort.forEach(reason => console.log('  ✓', reason));
        }
    } else {
        console.error('❌ Failed to generate signal');
        return;
    }

    // 5. Get algorithm status
    console.log('\n5. Getting algorithm status...');
    const status = await apiCall('/status');
    if (status) {
        console.log('Initialized:', status.initialized);
        console.log('Running:', status.running);
        console.log('Trades executed:', status.statistics?.tradesExecuted || 0);
    }

    // 6. Get Unusual Whales options flow
    console.log('\n6. Getting Unusual Whales options flow...');
    const optionsFlow = await apiCall('/options-flow/SPY');
    if (optionsFlow?.success) {
        console.log('Options flow alerts:', optionsFlow.alerts?.length || 0);
        console.log('Sentiment score:', optionsFlow.signals?.sentimentScore?.toFixed(3) || 'N/A');
        console.log('Large trades:', optionsFlow.signals?.largeTradesCount || 0);
    }

    // 7. Simulate trade execution
    console.log('\n7. Simulating trade execution...');
    const executeResult = await apiCall('/execute-trade', {
        method: 'POST'
    });
    
    if (executeResult?.success) {
        console.log('✅ Trade executed successfully!');
        console.log('Direction:', executeResult.signal?.direction);
        console.log('Position size:', executeResult.state?.positionSize);
        console.log('Entry price:', '$' + (executeResult.state?.entryPrice || 0).toFixed(2));
    } else {
        console.log('⚠️ Trade not executed:', executeResult?.message || 'Unknown reason');
    }

    // 8. Final status check
    console.log('\n8. Final algorithm status...');
    const finalStatus = await apiCall('/status');
    if (finalStatus?.statistics) {
        const stats = finalStatus.statistics;
        console.log('📊 Final Statistics:');
        console.log('  Trades executed:', stats.tradesExecuted);
        console.log('  Current position:', stats.currentPosition);
        console.log('  Entry price:', '$' + stats.entryPrice.toFixed(2));
        console.log('  Is active:', stats.isActive ? '✅' : '❌');
        console.log('  Price history length:', stats.priceHistoryLength);
        console.log('  Average price:', '$' + stats.avgPrice.toFixed(2));
    }

    console.log('\n🎉 QPPF API Demo completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  • Visit the web interface:', 'https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev');
    console.log('  • Use real Unusual Whales API key for live data');
    console.log('  • Integrate with real market data feeds');
    console.log('  • Deploy to Cloudflare Pages for production use');
}

// Run the demo
demoQPPFAPI().catch(console.error);