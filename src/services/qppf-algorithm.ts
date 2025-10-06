/**
 * QPPF (Quantum Potential Price Flow) Algorithm Implementation
 * Integrates Unusual Whales data for enhanced trading signals
 */

import { UnusualWhalesClient, OptionsFlowSignals, UnusualWhalesAlert, GEXData, DarkPoolData } from './unusual-whales-client';

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  timestamp: Date;
}

export interface QPPFSignal {
  direction: 'LONG' | 'SHORT' | 'FLAT';
  confidence: number;
  strength: number;
  sentiment: string;
  reasonsLong: string[];
  reasonsShort: string[];
  marketData: MarketData;
  uwSignals: OptionsFlowSignals;
  gexData?: GEXData;
  darkPoolData?: DarkPoolData;
  timestamp: Date;
}

export interface QPPFState {
  symbol: string;
  positionSize: number;
  entryPrice: number;
  entryTime?: Date;
  priceHistory: number[];
  volumeHistory: number[];
  tradesExecuted: number;
  totalPnL: number;
  isActive: boolean;
}

export class QPPFAlgorithm {
  private uwClient: UnusualWhalesClient;
  private state: QPPFState;
  private readonly symbol: string;
  private readonly gridPoints: number = 201;
  private readonly gridATRSpan: number = 5.0;

  constructor(unusualWhalesApiKey: string, symbol: string = 'SPY') {
    this.uwClient = new UnusualWhalesClient(unusualWhalesApiKey);
    this.symbol = symbol;
    this.state = {
      symbol,
      positionSize: 0,
      entryPrice: 0,
      priceHistory: [],
      volumeHistory: [],
      tradesExecuted: 0,
      totalPnL: 0,
      isActive: false,
    };

    console.log('QPPF Algorithm initialized with corrected Unusual Whales endpoints');
  }

  /**
   * Get current algorithm state
   */
  getState(): QPPFState {
    return { ...this.state };
  }

  /**
   * Fetch mock market data (in production, this would connect to a real data provider)
   */
  private async fetchMarketData(): Promise<MarketData> {
    try {
      // In production, this would fetch real market data from Alpaca, IEX, or other provider
      // For demo purposes, we'll generate realistic mock data
      const basePrice = 450 + Math.sin(Date.now() / 100000) * 10; // Oscillating around $450
      const spread = 0.01;
      
      return {
        symbol: this.symbol,
        price: basePrice + (Math.random() - 0.5) * 2,
        volume: Math.floor(1000000 + Math.random() * 500000),
        bid: basePrice - spread,
        ask: basePrice + spread,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Return fallback data
      return {
        symbol: this.symbol,
        price: 450.50,
        volume: 1000000,
        bid: 450.49,
        ask: 450.51,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Calculate trading confidence based on signal strength and market conditions
   */
  private calculateConfidence(uwSignals: OptionsFlowSignals, marketData: MarketData): number {
    let baseConfidence = 0.5;

    // Boost confidence with strong Unusual Whales signals
    if (uwSignals.hasUnusualFlow) {
      baseConfidence += 0.3;
    }

    // Boost with strong sentiment
    const sentimentStrength = Math.abs(uwSignals.sentimentScore);
    if (sentimentStrength > 0.5) {
      baseConfidence += 0.2;
    } else if (sentimentStrength > 0.3) {
      baseConfidence += 0.1;
    }

    // Boost with large trades
    if (uwSignals.largeTradesCount > 2) {
      baseConfidence += 0.15;
    }

    // Reduce confidence during low volume periods
    if (marketData.volume < 1000000) {
      baseConfidence *= 0.8;
    }

    // Boost confidence with recent alerts
    if (uwSignals.recentAlerts > 5) {
      baseConfidence += 0.1;
    }

    return Math.min(0.95, baseConfidence); // Cap at 95%
  }

  /**
   * Calculate trade direction based on QPPF and Unusual Whales signals
   */
  private calculateDirection(uwSignals: OptionsFlowSignals, marketData: MarketData): 'LONG' | 'SHORT' | 'FLAT' {
    const sentimentScore = uwSignals.sentimentScore;

    // Strong sentiment override
    if (sentimentScore > 0.4) {
      return 'LONG';
    } else if (sentimentScore < -0.4) {
      return 'SHORT';
    }

    // Use price momentum as secondary signal
    if (this.state.priceHistory.length >= 5) {
      const recentPrices = this.state.priceHistory.slice(-5);
      const priceTrend = recentPrices[recentPrices.length - 1] - recentPrices[0];

      if (priceTrend > 0 && sentimentScore >= 0) {
        return 'LONG';
      } else if (priceTrend < 0 && sentimentScore <= 0) {
        return 'SHORT';
      }
    }

    return 'FLAT'; // No clear direction
  }

  /**
   * Calculate signal strength based on multiple factors
   */
  private calculateStrength(uwSignals: OptionsFlowSignals, confidence: number): number {
    let strength = confidence * 0.5; // Base strength from confidence

    // Add strength from unusual flow
    if (uwSignals.hasUnusualFlow) {
      strength += 0.3;
    }

    // Add strength from large trades
    const largeTradeRatio = Math.min(uwSignals.largeTradesCount / 5, 1.0);
    strength += largeTradeRatio * 0.2;

    // Add strength from sentiment intensity
    strength += Math.abs(uwSignals.sentimentScore) * 0.3;

    return Math.min(1.0, strength); // Cap at 100%
  }

  /**
   * Generate reasons for long positions
   */
  private generateLongReasons(uwSignals: OptionsFlowSignals, marketData: MarketData): string[] {
    const reasons: string[] = [];

    if (uwSignals.sentimentScore > 0.3) {
      reasons.push(`Strong bullish sentiment (${(uwSignals.sentimentScore * 100).toFixed(1)}%)`);
    }

    if (uwSignals.bullishCount > uwSignals.bearishCount) {
      reasons.push(`More bullish alerts (${uwSignals.bullishCount} vs ${uwSignals.bearishCount})`);
    }

    if (uwSignals.largeTradesCount > 2) {
      reasons.push(`${uwSignals.largeTradesCount} large premium trades detected`);
    }

    if (uwSignals.avgPremium > 20000) {
      reasons.push(`High average premium ($${(uwSignals.avgPremium / 1000).toFixed(1)}k)`);
    }

    if (this.state.priceHistory.length >= 3) {
      const recentTrend = this.state.priceHistory.slice(-3);
      if (recentTrend[2] > recentTrend[0]) {
        reasons.push('Recent upward price momentum');
      }
    }

    return reasons;
  }

  /**
   * Generate reasons for short positions
   */
  private generateShortReasons(uwSignals: OptionsFlowSignals, marketData: MarketData): string[] {
    const reasons: string[] = [];

    if (uwSignals.sentimentScore < -0.3) {
      reasons.push(`Strong bearish sentiment (${(uwSignals.sentimentScore * 100).toFixed(1)}%)`);
    }

    if (uwSignals.bearishCount > uwSignals.bullishCount) {
      reasons.push(`More bearish alerts (${uwSignals.bearishCount} vs ${uwSignals.bullishCount})`);
    }

    if (uwSignals.largeTradesCount > 2 && uwSignals.sentimentScore < 0) {
      reasons.push(`${uwSignals.largeTradesCount} large bearish trades detected`);
    }

    if (this.state.priceHistory.length >= 3) {
      const recentTrend = this.state.priceHistory.slice(-3);
      if (recentTrend[2] < recentTrend[0]) {
        reasons.push('Recent downward price momentum');
      }
    }

    return reasons;
  }

  /**
   * Run one iteration of the QPPF algorithm
   */
  async generateSignal(): Promise<QPPFSignal> {
    console.log(`\n--- QPPF Signal Generation at ${new Date().toISOString()} ---`);

    try {
      // Fetch market data
      const marketData = await this.fetchMarketData();

      // Fetch Unusual Whales data
      const [uwAlerts, gexData, darkPoolData] = await Promise.all([
        this.uwClient.getOptionsFlow(this.symbol),
        this.uwClient.getGEXData(this.symbol),
        this.uwClient.getDarkPoolData(this.symbol),
      ]);

      // Process Unusual Whales signals
      const uwSignals = this.uwClient.processOptionsFlowSignals(uwAlerts);

      // Update state
      this.state.priceHistory.push(marketData.price);
      this.state.volumeHistory.push(marketData.volume);

      // Keep history manageable
      if (this.state.priceHistory.length > 100) {
        this.state.priceHistory = this.state.priceHistory.slice(-100);
        this.state.volumeHistory = this.state.volumeHistory.slice(-100);
      }

      // Calculate signals
      const confidence = this.calculateConfidence(uwSignals, marketData);
      const direction = this.calculateDirection(uwSignals, marketData);
      const strength = this.calculateStrength(uwSignals, confidence);

      // Generate trading reasons
      const reasonsLong = this.generateLongReasons(uwSignals, marketData);
      const reasonsShort = this.generateShortReasons(uwSignals, marketData);

      const signal: QPPFSignal = {
        direction,
        confidence,
        strength,
        sentiment: uwSignals.dominantSentiment,
        reasonsLong,
        reasonsShort,
        marketData,
        uwSignals,
        gexData,
        darkPoolData,
        timestamp: new Date(),
      };

      console.log(`Generated signal: ${direction} (confidence: ${(confidence * 100).toFixed(1)}%, strength: ${(strength * 100).toFixed(1)}%)`);

      return signal;

    } catch (error) {
      console.error('Error generating QPPF signal:', error);
      
      // Return safe fallback signal
      const marketData = await this.fetchMarketData();
      return {
        direction: 'FLAT',
        confidence: 0.0,
        strength: 0.0,
        sentiment: 'neutral',
        reasonsLong: [],
        reasonsShort: ['Error in signal generation'],
        marketData,
        uwSignals: {
          sentimentScore: 0.0,
          totalAlerts: 0,
          recentAlerts: 0,
          bullishCount: 0,
          bearishCount: 0,
          avgPremium: 0,
          largeTradesCount: 0,
          hasUnusualFlow: false,
          dominantSentiment: 'neutral',
          recentAlertsList: [],
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Simulate trade execution (for demo purposes)
   */
  simulateTradeExecution(signal: QPPFSignal): boolean {
    // In production, this would execute actual trades through Alpaca or other broker
    if (signal.direction === 'FLAT' || signal.confidence < 0.6) {
      return false;
    }

    // Simulate position sizing based on confidence
    const baseShares = 100;
    const positionSize = Math.floor(baseShares * signal.confidence);

    if (signal.direction === 'LONG') {
      this.state.positionSize = positionSize;
    } else if (signal.direction === 'SHORT') {
      this.state.positionSize = -positionSize;
    }

    this.state.entryPrice = signal.marketData.price;
    this.state.entryTime = new Date();
    this.state.tradesExecuted += 1;
    this.state.isActive = true;

    console.log(`Simulated trade: ${signal.direction} ${Math.abs(positionSize)} shares at $${signal.marketData.price}`);
    
    return true;
  }

  /**
   * Calculate current P&L (for demo purposes)
   */
  calculateCurrentPnL(currentPrice: number): number {
    if (!this.state.isActive || this.state.positionSize === 0) {
      return 0;
    }

    const priceDiff = currentPrice - this.state.entryPrice;
    const pnl = priceDiff * this.state.positionSize;
    
    return pnl;
  }

  /**
   * Reset algorithm state
   */
  reset(): void {
    this.state = {
      symbol: this.symbol,
      positionSize: 0,
      entryPrice: 0,
      priceHistory: [],
      volumeHistory: [],
      tradesExecuted: 0,
      totalPnL: 0,
      isActive: false,
    };
    console.log('QPPF Algorithm state reset');
  }

  /**
   * Get algorithm statistics
   */
  getStatistics() {
    return {
      symbol: this.state.symbol,
      tradesExecuted: this.state.tradesExecuted,
      totalPnL: this.state.totalPnL,
      currentPosition: this.state.positionSize,
      entryPrice: this.state.entryPrice,
      entryTime: this.state.entryTime,
      isActive: this.state.isActive,
      priceHistoryLength: this.state.priceHistory.length,
      avgPrice: this.state.priceHistory.length > 0 
        ? this.state.priceHistory.reduce((a, b) => a + b, 0) / this.state.priceHistory.length 
        : 0,
    };
  }
}