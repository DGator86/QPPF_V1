/**
 * API Routes for QPPF Signals Website
 * Handles all backend functionality for the trading algorithm
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { QPPFAlgorithm, QPPFSignal, QPPFState } from '../services/qppf-algorithm';
import { UnusualWhalesClient } from '../services/unusual-whales-client';

// Global algorithm instance (in production, use proper state management)
let qppfAlgorithm: QPPFAlgorithm | null = null;
let isRunning = false;
let latestSignal: QPPFSignal | null = null;

// API configuration interface
interface APIConfig {
  unusualWhalesApiKey?: string;
  symbol?: string;
}

const api = new Hono();

// Enable CORS for all API routes
api.use('*', cors());

/**
 * Initialize the QPPF algorithm with API keys
 */
api.post('/initialize', async (c) => {
  try {
    const config: APIConfig = await c.req.json();
    
    if (!config.unusualWhalesApiKey) {
      return c.json({ 
        error: 'Unusual Whales API key is required',
        success: false 
      }, 400);
    }

    const symbol = config.symbol || 'SPY';
    
    // Initialize the algorithm
    qppfAlgorithm = new QPPFAlgorithm(config.unusualWhalesApiKey, symbol);
    
    console.log(`QPPF Algorithm initialized for ${symbol}`);
    
    return c.json({
      success: true,
      message: `QPPF Algorithm initialized for ${symbol}`,
      symbol: symbol,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error initializing QPPF:', error);
    return c.json({ 
      error: 'Failed to initialize QPPF algorithm',
      success: false 
    }, 500);
  }
});

/**
 * Get current algorithm status
 */
api.get('/status', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({
      initialized: false,
      running: false,
      message: 'QPPF Algorithm not initialized. Call /api/initialize first.',
    });
  }

  const state = qppfAlgorithm.getState();
  const statistics = qppfAlgorithm.getStatistics();

  return c.json({
    initialized: true,
    running: isRunning,
    state: state,
    statistics: statistics,
    latestSignal: latestSignal ? {
      direction: latestSignal.direction,
      confidence: latestSignal.confidence,
      strength: latestSignal.strength,
      sentiment: latestSignal.sentiment,
      timestamp: latestSignal.timestamp,
    } : null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Generate a single trading signal
 */
api.post('/signal', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  try {
    console.log('Generating new trading signal...');
    const signal = await qppfAlgorithm.generateSignal();
    latestSignal = signal;

    return c.json({
      success: true,
      signal: signal,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating signal:', error);
    return c.json({ 
      error: 'Failed to generate trading signal',
      success: false 
    }, 500);
  }
});

/**
 * Get Unusual Whales options flow data
 */
api.get('/options-flow/:symbol?', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  try {
    const symbol = c.req.param('symbol') || 'SPY';
    const uwClient = new UnusualWhalesClient(process.env.UW_API_KEY || 'demo-key');
    
    const alerts = await uwClient.getOptionsFlow(symbol);
    const signals = uwClient.processOptionsFlowSignals(alerts);

    return c.json({
      success: true,
      symbol: symbol,
      alerts: alerts,
      signals: signals,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching options flow:', error);
    return c.json({ 
      error: 'Failed to fetch options flow data',
      success: false 
    }, 500);
  }
});

/**
 * Get GEX (Gamma Exposure) data
 */
api.get('/gex/:symbol?', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  try {
    const symbol = c.req.param('symbol') || 'SPY';
    const uwClient = new UnusualWhalesClient(process.env.UW_API_KEY || 'demo-key');
    
    const gexData = await uwClient.getGEXData(symbol);

    return c.json({
      success: true,
      symbol: symbol,
      gexData: gexData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching GEX data:', error);
    return c.json({ 
      error: 'Failed to fetch GEX data',
      success: false 
    }, 500);
  }
});

/**
 * Get Dark Pool data
 */
api.get('/dark-pool/:symbol?', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  try {
    const symbol = c.req.param('symbol') || 'SPY';
    const uwClient = new UnusualWhalesClient(process.env.UW_API_KEY || 'demo-key');
    
    const darkPoolData = await uwClient.getDarkPoolData(symbol);

    return c.json({
      success: true,
      symbol: symbol,
      darkPoolData: darkPoolData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching dark pool data:', error);
    return c.json({ 
      error: 'Failed to fetch dark pool data',
      success: false 
    }, 500);
  }
});

/**
 * Simulate trade execution
 */
api.post('/execute-trade', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  if (!latestSignal) {
    return c.json({ 
      error: 'No signal available. Generate a signal first.',
      success: false 
    }, 400);
  }

  try {
    const executed = qppfAlgorithm.simulateTradeExecution(latestSignal);
    
    if (executed) {
      return c.json({
        success: true,
        message: 'Trade executed successfully',
        signal: {
          direction: latestSignal.direction,
          confidence: latestSignal.confidence,
          strength: latestSignal.strength,
        },
        state: qppfAlgorithm.getState(),
        timestamp: new Date().toISOString(),
      });
    } else {
      return c.json({
        success: false,
        message: 'Trade not executed - insufficient confidence or flat signal',
        signal: {
          direction: latestSignal.direction,
          confidence: latestSignal.confidence,
          strength: latestSignal.strength,
        },
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Error executing trade:', error);
    return c.json({ 
      error: 'Failed to execute trade',
      success: false 
    }, 500);
  }
});

/**
 * Reset algorithm state
 */
api.post('/reset', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  try {
    qppfAlgorithm.reset();
    latestSignal = null;
    isRunning = false;

    return c.json({
      success: true,
      message: 'QPPF Algorithm state reset',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error resetting algorithm:', error);
    return c.json({ 
      error: 'Failed to reset algorithm',
      success: false 
    }, 500);
  }
});

/**
 * Start continuous signal generation (demo mode)
 */
api.post('/start', async (c) => {
  if (!qppfAlgorithm) {
    return c.json({ 
      error: 'QPPF Algorithm not initialized',
      success: false 
    }, 400);
  }

  if (isRunning) {
    return c.json({ 
      success: false,
      message: 'Algorithm is already running',
    });
  }

  isRunning = true;

  // Start background signal generation (simplified for demo)
  // In production, this would use proper job queuing or WebSocket connections
  const generateSignals = async () => {
    while (isRunning && qppfAlgorithm) {
      try {
        latestSignal = await qppfAlgorithm.generateSignal();
        console.log(`New signal: ${latestSignal.direction} (${(latestSignal.confidence * 100).toFixed(1)}%)`);
        
        // Wait 30 seconds before next signal
        await new Promise(resolve => setTimeout(resolve, 30000));
      } catch (error) {
        console.error('Error in signal generation loop:', error);
        // Wait 10 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  };

  // Start the signal generation loop (non-blocking)
  generateSignals().catch(console.error);

  return c.json({
    success: true,
    message: 'QPPF Algorithm started',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Stop continuous signal generation
 */
api.post('/stop', async (c) => {
  isRunning = false;

  return c.json({
    success: true,
    message: 'QPPF Algorithm stopped',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get algorithm configuration and endpoints info
 */
api.get('/info', async (c) => {
  return c.json({
    name: 'QPPF Signals API',
    version: '1.0.0',
    description: 'Quantum Potential Price Flow Algorithm with Unusual Whales Integration',
    endpoints: {
      initialize: 'POST /api/initialize - Initialize algorithm with API keys',
      status: 'GET /api/status - Get current algorithm status',
      signal: 'POST /api/signal - Generate a single trading signal',
      'options-flow': 'GET /api/options-flow/:symbol - Get options flow data',
      gex: 'GET /api/gex/:symbol - Get Gamma Exposure data',
      'dark-pool': 'GET /api/dark-pool/:symbol - Get Dark Pool data',
      'execute-trade': 'POST /api/execute-trade - Simulate trade execution',
      reset: 'POST /api/reset - Reset algorithm state',
      start: 'POST /api/start - Start continuous signal generation',
      stop: 'POST /api/stop - Stop continuous signal generation',
    },
    unusualWhalesEndpoints: {
      optionsFlow: '/option-trades/flow-alerts',
      darkPool: '/darkpool',
      gex: '/gex',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check endpoint
 */
api.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    initialized: qppfAlgorithm !== null,
    running: isRunning,
    timestamp: new Date().toISOString(),
  });
});

export { api };