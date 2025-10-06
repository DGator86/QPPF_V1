/**
 * API Routes for QPPF Signals Website
 * Handles all backend functionality for the trading algorithm
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { QPPFAlgorithm, QPPFSignal, QPPFState } from '../services/qppf-algorithm';
import { UnusualWhalesClient } from '../services/unusual-whales-client';
import { AlpacaTradingService, AlpacaCredentials, TradeSignal } from '../services/alpaca-trading-service-enhanced';
import { RiskManager } from '../services/risk-manager';

// Global instances (in production, use proper state management)
let qppfAlgorithm: QPPFAlgorithm | null = null;
let alpacaService: AlpacaTradingService | null = null;
let riskManager: RiskManager | null = null;
let isRunning = false;
let latestSignal: QPPFSignal | null = null;

// API configuration interface
interface APIConfig {
  unusualWhalesApiKey?: string;
  alpacaApiKey?: string;
  alpacaSecretKey?: string;
  alpacaPaper?: boolean;
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
    
    // Initialize the QPPF algorithm
    qppfAlgorithm = new QPPFAlgorithm(config.unusualWhalesApiKey, symbol);
    
    // Initialize Alpaca service if credentials provided
    if (config.alpacaApiKey && config.alpacaSecretKey) {
      const alpacaCredentials: AlpacaCredentials = {
        apiKeyId: config.alpacaApiKey,
        secretKey: config.alpacaSecretKey,
        paper: config.alpacaPaper ?? true, // Default to paper trading
      };
      
      alpacaService = new AlpacaTradingService(alpacaCredentials);
      riskManager = new RiskManager(); // Use default risk parameters
      
      // Test Alpaca connection
      const account = await alpacaService.getAccount();
      if (!account) {
        return c.json({ 
          error: 'Failed to connect to Alpaca API. Please check your credentials.',
          success: false 
        }, 400);
      }
      
      console.log(`Alpaca service initialized (Paper: ${alpacaCredentials.paper})`);
    }
    
    console.log(`QPPF Algorithm initialized for ${symbol}`);
    
    return c.json({
      success: true,
      message: `QPPF Algorithm initialized for ${symbol}`,
      symbol: symbol,
      alpacaEnabled: alpacaService !== null,
      alpacaPaper: config.alpacaPaper ?? true,
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
 * Execute real trade through Alpaca
 */
api.post('/execute-alpaca-trade', async (c) => {
  if (!qppfAlgorithm || !alpacaService || !riskManager) {
    return c.json({ 
      error: 'QPPF Algorithm or Alpaca service not initialized',
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
    // Get account information
    const account = await alpacaService.getAccount();
    if (!account) {
      return c.json({ 
        error: 'Failed to get Alpaca account information',
        success: false 
      }, 500);
    }

    // Get current positions
    const positions = await alpacaService.getPositions();

    // Get current market price
    const currentPrice = await alpacaService.getCurrentPrice(latestSignal.marketData.symbol);
    if (!currentPrice) {
      return c.json({ 
        error: 'Failed to get current market price',
        success: false 
      }, 500);
    }

    // Assess risk
    const riskAssessment = riskManager.assessTrade(
      latestSignal,
      latestSignal.uwSignals,
      account,
      positions,
      currentPrice
    );

    // Check if we should execute
    if (!riskManager.shouldExecuteTrade(riskAssessment)) {
      return c.json({
        success: false,
        message: `Trade rejected by risk management`,
        recommendation: riskAssessment.recommendation,
        reasons: riskAssessment.reasons,
        riskAssessment,
        timestamp: new Date().toISOString(),
      });
    }

    // Create trade signal for Alpaca
    const tradeSignal: TradeSignal = {
      symbol: latestSignal.marketData.symbol,
      direction: latestSignal.direction === 'LONG' ? 'long' : 'short',
      quantity: riskAssessment.positionSize,
      confidence: latestSignal.confidence,
      orderType: 'market',
    };

    // Execute the trade
    const tradeResult = await alpacaService.executeTrade(tradeSignal);

    if (tradeResult.success) {
      return c.json({
        success: true,
        message: 'Real trade executed successfully',
        tradeResult,
        riskAssessment,
        signal: {
          direction: latestSignal.direction,
          confidence: latestSignal.confidence,
          strength: latestSignal.strength,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return c.json({
        success: false,
        message: 'Trade execution failed',
        error: tradeResult.error,
        riskAssessment,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Error executing Alpaca trade:', error);
    return c.json({ 
      error: 'Failed to execute Alpaca trade',
      success: false 
    }, 500);
  }
});

/**
 * Get Alpaca account information
 */
api.get('/alpaca/account', async (c) => {
  if (!alpacaService) {
    return c.json({ 
      error: 'Alpaca service not initialized',
      success: false 
    }, 400);
  }

  try {
    const account = await alpacaService.getAccount();
    if (!account) {
      return c.json({ 
        error: 'Failed to get account information',
        success: false 
      }, 500);
    }

    return c.json({
      success: true,
      account,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Alpaca account:', error);
    return c.json({ 
      error: 'Failed to fetch account information',
      success: false 
    }, 500);
  }
});

/**
 * Get Alpaca positions
 */
api.get('/alpaca/positions', async (c) => {
  if (!alpacaService) {
    return c.json({ 
      error: 'Alpaca service not initialized',
      success: false 
    }, 400);
  }

  try {
    const positions = await alpacaService.getPositions();
    
    return c.json({
      success: true,
      positions,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Alpaca positions:', error);
    return c.json({ 
      error: 'Failed to fetch positions',
      success: false 
    }, 500);
  }
});

/**
 * Get Alpaca recent orders
 */
api.get('/alpaca/orders', async (c) => {
  if (!alpacaService) {
    return c.json({ 
      error: 'Alpaca service not initialized',
      success: false 
    }, 400);
  }

  try {
    const orders = await alpacaService.getRecentOrders(20);
    
    return c.json({
      success: true,
      orders,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Alpaca orders:', error);
    return c.json({ 
      error: 'Failed to fetch orders',
      success: false 
    }, 500);
  }
});

/**
 * Close Alpaca position
 */
api.post('/alpaca/close-position/:symbol', async (c) => {
  if (!alpacaService) {
    return c.json({ 
      error: 'Alpaca service not initialized',
      success: false 
    }, 400);
  }

  try {
    const symbol = c.req.param('symbol');
    const result = await alpacaService.closePosition(symbol);

    return c.json({
      success: result.success,
      message: result.message,
      order: result.order,
      error: result.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error closing position:', error);
    return c.json({ 
      error: 'Failed to close position',
      success: false 
    }, 500);
  }
});

/**
 * Get risk assessment for current signal
 */
api.get('/risk-assessment', async (c) => {
  if (!qppfAlgorithm || !alpacaService || !riskManager) {
    return c.json({ 
      error: 'Services not fully initialized',
      success: false 
    }, 400);
  }

  if (!latestSignal) {
    return c.json({ 
      error: 'No signal available',
      success: false 
    }, 400);
  }

  try {
    const account = await alpacaService.getAccount();
    const positions = await alpacaService.getPositions();
    const currentPrice = await alpacaService.getCurrentPrice(latestSignal.marketData.symbol);

    if (!account || !currentPrice) {
      return c.json({ 
        error: 'Failed to get required data for risk assessment',
        success: false 
      }, 500);
    }

    const riskAssessment = riskManager.assessTrade(
      latestSignal,
      latestSignal.uwSignals,
      account,
      positions,
      currentPrice
    );

    const riskReport = riskManager.generateRiskReport(account, positions);

    return c.json({
      success: true,
      riskAssessment,
      riskReport,
      currentPrice,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating risk assessment:', error);
    return c.json({ 
      error: 'Failed to generate risk assessment',
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
    name: 'QPPF Signals API with Alpaca Integration',
    version: '2.0.0',
    description: 'Quantum Potential Price Flow Algorithm with Unusual Whales Integration and Live Alpaca Trading',
    endpoints: {
      // Core QPPF Algorithm
      initialize: 'POST /api/initialize - Initialize algorithm with API keys (now includes Alpaca)',
      status: 'GET /api/status - Get current algorithm status',
      signal: 'POST /api/signal - Generate a single trading signal',
      'execute-trade': 'POST /api/execute-trade - Simulate trade execution',
      'execute-alpaca-trade': 'POST /api/execute-alpaca-trade - Execute real trade via Alpaca',
      reset: 'POST /api/reset - Reset algorithm state',
      start: 'POST /api/start - Start continuous signal generation',
      stop: 'POST /api/stop - Stop continuous signal generation',
      
      // Unusual Whales Data
      'options-flow': 'GET /api/options-flow/:symbol - Get options flow data',
      gex: 'GET /api/gex/:symbol - Get Gamma Exposure data',
      'dark-pool': 'GET /api/dark-pool/:symbol - Get Dark Pool data',
      
      // Alpaca Trading
      'alpaca-account': 'GET /api/alpaca/account - Get Alpaca account information',
      'alpaca-positions': 'GET /api/alpaca/positions - Get current positions',
      'alpaca-orders': 'GET /api/alpaca/orders - Get recent orders',
      'alpaca-close-position': 'POST /api/alpaca/close-position/:symbol - Close position',
      
      // Risk Management
      'risk-assessment': 'GET /api/risk-assessment - Get risk assessment for current signal',
    },
    features: {
      unusualWhalesIntegration: true,
      alpacaLiveTrading: true,
      riskManagement: true,
      positionSizing: true,
      paperTrading: true,
      realTimeSignals: true,
    },
    unusualWhalesEndpoints: {
      optionsFlow: '/option-trades/flow-alerts',
      darkPool: '/darkpool',
      gex: '/gex',
    },
    alpacaIntegration: {
      paperTradingSupported: true,
      liveTradingSupported: true,
      riskManagementEnabled: true,
      supportedOrderTypes: ['market', 'limit'],
      supportedAssets: ['US Equities', 'ETFs'],
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