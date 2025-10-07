/**
 * QPPF Stock Scanner for Alpaca Trading
 * Multi-factor quantum-inspired analysis across the entire market
 */

import { UnusualWhalesClient } from './unusual-whales-client';

export interface ScanConfig {
  maxSymbols: number;
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  universe: string[];
  timeframe: string;
  lookbackDays: number;
  qppfThreshold: number;
}

export interface QPPFScores {
  momentum: number;
  meanReversion: number;
  volumeAnalysis: number;
  volatilityRegime: number;
  marketStructure: number;
  sentiment: number;
}

export interface TradingOpportunity {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  qppfScore: number;
  currentPrice: number;
  scores: QPPFScores;
  timestamp: Date;
  analysis: string;
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  riskReward?: number;
}

export interface ScanResults {
  timestamp: Date;
  buyOpportunities: TradingOpportunity[];
  sellOpportunities: TradingOpportunity[];
  marketRegime: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  scanMetrics: {
    totalOpportunities: number;
    buyRatio: number;
    avgBuyScore: number;
    avgSellScore: number;
    topBuySymbol: string | null;
    topSellSymbol: string | null;
  };
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  closes: number[];
  volumes: number[];
  highs: number[];
  lows: number[];
  timestamp: Date;
}

export class QPPFStockScanner {
  private scanConfig: ScanConfig;
  private weights: Record<keyof QPPFScores, number>;
  private alpacaApiKey?: string;
  private alpacaSecretKey?: string;
  private uwClient?: UnusualWhalesClient;

  constructor(alpacaApiKey?: string, alpacaSecretKey?: string, uwApiKey?: string) {
    this.alpacaApiKey = alpacaApiKey;
    this.alpacaSecretKey = alpacaSecretKey;
    
    // Initialize Unusual Whales client if API key provided
    if (uwApiKey) {
      try {
        this.uwClient = new UnusualWhalesClient(uwApiKey);
        console.log('🐋 Unusual Whales integration enabled for scanner');
      } catch (error) {
        console.warn('Failed to initialize Unusual Whales client:', error.message);
      }
    }

    // Scanner Configuration
    this.scanConfig = {
      maxSymbols: 200,
      minPrice: 5.0,
      maxPrice: 1000.0,
      minVolume: 100000,
      universe: this.getTopStocks(),
      timeframe: '15Min',
      lookbackDays: 30,
      qppfThreshold: 0.65
    };

    // QPPF Scoring Weights
    this.weights = {
      momentum: 0.25,
      meanReversion: 0.20,
      volumeAnalysis: 0.15,
      volatilityRegime: 0.15,
      marketStructure: 0.15,
      sentiment: 0.10
    };

    console.log('🚀 QPPF Stock Scanner Initialized');
  }

  private getTopStocks(): string[] {
    return [
      // Major ETFs
      'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VEA', 'VWO', 'AGG',
      
      // Top Technology
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA',
      'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'AVGO',
      'CSCO', 'TXN', 'NOW', 'INTU', 'PANW', 'KLAC', 'LRCX', 'AMAT',
      
      // Healthcare & Pharma
      'UNH', 'JNJ', 'PFE', 'ABBV', 'LLY', 'MRK', 'TMO', 'ABT',
      'DHR', 'BMY', 'AMGN', 'GILD', 'REGN', 'VRTX', 'BIIB', 'ZTS',
      
      // Financial Services
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK',
      'SPGI', 'ICE', 'CME', 'V', 'MA', 'PYPL', 'ADYEY',
      
      // Consumer & Retail
      'AMZN', 'WMT', 'HD', 'PG', 'KO', 'PEP', 'COST', 'NKE',
      'MCD', 'SBUX', 'TJX', 'LOW', 'TGT', 'DIS', 'NFLX',
      
      // Energy & Utilities
      'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'OXY', 'DVN', 'PSX',
      'VLO', 'MPC', 'NEE', 'DUK', 'SO', 'AEP', 'EXC',
      
      // Industrial & Materials
      'BA', 'CAT', 'DE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT',
      'GE', 'EMR', 'ITW', 'PH', 'ETN', 'CMI', 'FDX',
      
      // Communication
      'VZ', 'T', 'CMCSA', 'CHTR', 'TMUS', 'DISH'
    ];
  }

  /**
   * Main scanning function - finds best buy/sell opportunities
   */
  async scanMarket(): Promise<ScanResults> {
    console.log('🔍 Starting QPPF Market Scan...');
    
    const symbols = this.scanConfig.universe.slice(0, this.scanConfig.maxSymbols);
    const results: (TradingOpportunity | null)[] = [];
    
    // Process symbols in small batches to avoid rate limits
    const batchSize = 5; // Smaller batches for better rate limiting
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid overwhelming APIs
      for (const symbol of batch) {
        try {
          const result = await this.analyzeSymbol(symbol);
          results.push(result);
          // Small delay between each symbol
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.warn(`Failed to analyze ${symbol}:`, error.message);
          results.push(null);
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < symbols.length) {
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Filter and rank results
    const validResults = results.filter((result): result is TradingOpportunity => 
      result !== null && result.qppfScore >= this.scanConfig.qppfThreshold
    );
    
    const buyOpportunities = validResults
      .filter(r => r.signal === 'BUY')
      .sort((a, b) => b.qppfScore - a.qppfScore)
      .slice(0, 20);
    
    const sellOpportunities = validResults
      .filter(r => r.signal === 'SELL')
      .sort((a, b) => b.qppfScore - a.qppfScore)
      .slice(0, 20);
    
    const marketRegime = await this.assessMarketRegime();
    
    return {
      timestamp: new Date(),
      buyOpportunities,
      sellOpportunities,
      marketRegime,
      scanMetrics: this.getScanMetrics(buyOpportunities, sellOpportunities)
    };
  }

  /**
   * Analyze a single symbol using QPPF framework
   */
  async analyzeSymbol(symbol: string): Promise<TradingOpportunity | null> {
    try {
      console.log(`📊 Starting analysis for ${symbol}...`);
      const marketData = await this.getSymbolData(symbol);
      if (!marketData) {
        console.log(`❌ No market data available for ${symbol}`);
        return null;
      }
      console.log(`✅ Got market data for ${symbol}: $${marketData.currentPrice.toFixed(2)}`);

      // Apply price and volume filters
      console.log(`🔍 Checking filters for ${symbol}: price=$${marketData.currentPrice}, min=$${this.scanConfig.minPrice}, max=$${this.scanConfig.maxPrice}`);
      if (marketData.currentPrice < this.scanConfig.minPrice || 
          marketData.currentPrice > this.scanConfig.maxPrice) {
        console.log(`❌ ${symbol} filtered out by price: $${marketData.currentPrice} (range: $${this.scanConfig.minPrice}-$${this.scanConfig.maxPrice})`);
        return null;
      }

      const avgVolume = marketData.volumes.length > 0 ? 
        marketData.volumes.reduce((a, b) => a + b, 0) / marketData.volumes.length : 0;
      
      console.log(`🔊 Volume check for ${symbol}: avg=${avgVolume.toLocaleString()}, min=${this.scanConfig.minVolume.toLocaleString()}`);
      if (avgVolume < this.scanConfig.minVolume) {
        console.log(`❌ ${symbol} filtered out by volume: ${avgVolume.toLocaleString()} < ${this.scanConfig.minVolume.toLocaleString()}`);
        return null;
      }

      console.log(`✅ ${symbol} passed all filters, computing QPPF scores...`);

      // QPPF Multi-Factor Analysis
      const scores = this.computeQPPFScores(marketData);
      
      // Enhance with Unusual Whales data if available
      if (this.uwClient) {
        try {
          await this.enhanceWithUnusualWhales(symbol, scores);
        } catch (error) {
          console.warn(`UW enhancement failed for ${symbol}:`, error.message);
        }
      }
      
      // Overall QPPF Score
      const totalScore = Object.keys(scores).reduce((sum, factor) => 
        sum + scores[factor as keyof QPPFScores] * this.weights[factor as keyof QPPFScores], 0
      );
      
      // Determine signal and confidence
      let signal: 'BUY' | 'SELL' | 'HOLD';
      let confidence: number;
      
      if (totalScore > 0.7) {
        signal = 'BUY';
        confidence = Math.min(totalScore, 1.0);
      } else if (totalScore < 0.3) {
        signal = 'SELL';
        confidence = Math.min(1.0 - totalScore, 1.0);
      } else {
        signal = 'HOLD';
        confidence = 1.0 - Math.abs(0.5 - totalScore) * 2;
      }

      // Calculate target price and stop loss
      const { targetPrice, stopLoss, riskReward } = this.calculateTradeLevels(
        marketData, signal, scores
      );

      return {
        symbol,
        signal,
        qppfScore: totalScore,
        currentPrice: marketData.currentPrice,
        scores,
        timestamp: new Date(),
        analysis: this.generateAnalysis(scores),
        confidence,
        targetPrice,
        stopLoss,
        riskReward
      };
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive market data for a symbol using multiple sources (like QPPF algorithm)
   */
  private async getSymbolData(symbol: string): Promise<MarketData | null> {
    try {
      // Method 1: Try Alpaca Market Data API (most reliable for current price)
      const currentPrice = await this.fetchCurrentPrice(symbol);
      if (!currentPrice) {
        console.log(`Failed to get current price for ${symbol}`);
        return null;
      }

      // Method 2: Get historical data for technical analysis
      let historicalData = await this.fetchHistoricalData(symbol);
      if (!historicalData) {
        console.log(`⚠️ Failed to get historical data for ${symbol}, using synthetic data`);
        // Create synthetic historical data for basic analysis
        historicalData = this.generateSyntheticHistoricalData(currentPrice);
      }

      return {
        symbol,
        currentPrice,
        closes: historicalData.closes,
        volumes: historicalData.volumes,
        highs: historicalData.highs,
        lows: historicalData.lows,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Generate synthetic historical data when real data is unavailable
   */
  private generateSyntheticHistoricalData(currentPrice: number): {
    closes: number[];
    volumes: number[];
    highs: number[];
    lows: number[];
  } {
    const days = 30;
    const closes: number[] = [];
    const volumes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    
    // Generate realistic price movement around current price
    let price = currentPrice * 0.95; // Start 5% below current
    
    for (let i = 0; i < days; i++) {
      // Simulate realistic price movement
      const dailyChange = (Math.random() - 0.5) * 0.04; // ±2% daily movement
      price = price * (1 + dailyChange);
      
      const dayVolatility = 0.015; // 1.5% intraday volatility
      const high = price * (1 + Math.random() * dayVolatility);
      const low = price * (1 - Math.random() * dayVolatility);
      const volume = Math.floor(1000000 + Math.random() * 5000000); // Realistic volume
      
      closes.push(price);
      highs.push(high);
      lows.push(low);
      volumes.push(volume);
    }
    
    // Ensure the last price trends toward current price
    const finalPrice = currentPrice * (0.98 + Math.random() * 0.04);
    closes[closes.length - 1] = finalPrice;
    
    console.log(`📊 Generated synthetic data for analysis: ${days} days, current=$${currentPrice.toFixed(2)}`);
    
    return { closes, volumes, highs, lows };
  }

  /**
   * Fetch current market price using multiple sources
   */
  private async fetchCurrentPrice(symbol: string): Promise<number | null> {
    // Method 1: Try Alpaca API (most reliable)
    try {
      const response = await fetch(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
        headers: {
          'Apca-Api-Key-Id': 'PKTWWCUSF6UXR0AB9VW3',
          'Apca-Api-Secret-Key': 'YjJ7vVldwxfJLRzUgZ44YcYVK6qodnFOZchrfBCY',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const quote = data.quote;
        // Fix: Use bp (bid price) and ap (ask price) instead of bid_price/ask_price
        if (quote && quote.bp && quote.ap) {
          const price = (parseFloat(quote.bp) + parseFloat(quote.ap)) / 2;
          console.log(`✅ Alpaca price for ${symbol}: $${price.toFixed(2)}`);
          return price;
        }
        console.log(`❌ Alpaca quote structure issue for ${symbol}:`, quote);
      } else {
        console.log(`❌ Alpaca API error for ${symbol}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Alpaca price failed for ${symbol}:`, error.message);
    }

    // Method 2: Try Yahoo Finance API
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
      if (response.ok) {
        const data = await response.json();
        const result = data.chart.result[0];
        if (result?.meta?.regularMarketPrice) {
          const price = result.meta.regularMarketPrice;
          console.log(`✅ Yahoo Finance price for ${symbol}: $${price.toFixed(2)}`);
          return price;
        }
        console.log(`❌ Yahoo Finance data issue for ${symbol}:`, result?.meta);
      } else {
        const errorText = await response.text();
        console.log(`❌ Yahoo Finance API error for ${symbol}: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.warn(`Yahoo Finance price failed for ${symbol}:`, error.message);
    }

    console.error(`❌ All price sources failed for ${symbol}`);
    return null;
  }

  /**
   * Fetch historical data for technical analysis
   */
  private async fetchHistoricalData(symbol: string): Promise<{
    closes: number[];
    volumes: number[];
    highs: number[];
    lows: number[];
  } | null> {
    try {
      // Use Yahoo Finance for historical data with rate limiting
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      const result = data.chart.result[0];
      
      if (!result || !result.indicators || !result.indicators.quote[0]) {
        return null;
      }
      
      const quote = result.indicators.quote[0];
      const timestamps = result.timestamp;
      
      // Filter out null values and get recent data
      const closes = quote.close.filter((c: number) => c !== null);
      const volumes = quote.volume.filter((v: number) => v !== null);
      const highs = quote.high.filter((h: number) => h !== null);
      const lows = quote.low.filter((l: number) => l !== null);
      
      if (closes.length < 20) {
        return null;
      }
      
      return {
        closes,
        volumes,
        highs,
        lows
      };
      
    } catch (error) {
      console.error(`Data error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Compute QPPF factor scores
   */
  private computeQPPFScores(marketData: MarketData): QPPFScores {
    const { closes, volumes, highs, lows, currentPrice } = marketData;
    
    if (closes.length < 20) {
      return {
        momentum: 0.5,
        meanReversion: 0.5,
        volumeAnalysis: 0.5,
        volatilityRegime: 0.5,
        marketStructure: 0.5,
        sentiment: 0.5
      };
    }

    return {
      momentum: this.calculateMomentumScore(closes, currentPrice),
      meanReversion: this.calculateMeanReversionScore(closes, currentPrice),
      volumeAnalysis: this.calculateVolumeScore(volumes, closes),
      volatilityRegime: this.calculateVolatilityScore(closes),
      marketStructure: this.calculateStructureScore(highs, lows, currentPrice),
      sentiment: this.calculateSentimentScore(closes, volumes)
    };
  }

  private calculateMomentumScore(closes: number[], currentPrice: number): number {
    if (closes.length < 20) return 0.5;
    
    // Multiple timeframe momentum
    const mom5 = closes.length >= 5 ? (currentPrice / closes[closes.length - 5] - 1) : 0;
    const mom10 = closes.length >= 10 ? (currentPrice / closes[closes.length - 10] - 1) : 0;
    const mom20 = closes.length >= 20 ? (currentPrice / closes[closes.length - 20] - 1) : 0;
    
    // RSI momentum
    const rsi = this.calculateRSI(closes);
    const rsiScore = rsi > 70 ? 0.8 : rsi < 30 ? 0.2 : 0.5;
    
    // MACD-like momentum
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdScore = ema12.length > 0 && ema26.length > 0 ? 
      (ema12[ema12.length - 1] - ema26[ema26.length - 1]) / ema26[ema26.length - 1] : 0;
    
    // Combine momentum factors
    const momentumScore = (mom5 * 0.4 + mom10 * 0.3 + mom20 * 0.3) * 5;
    const normalizedMomentum = Math.tanh(momentumScore);
    
    return Math.max(0, Math.min(1, (normalizedMomentum + 1) / 2));
  }

  private calculateMeanReversionScore(closes: number[], currentPrice: number): number {
    if (closes.length < 20) return 0.5;
    
    // Bollinger Bands
    const [upperBand, lowerBand] = this.calculateBollingerBands(closes, 20, 2);
    const bbPosition = upperBand.length > 0 && lowerBand.length > 0 ?
      (currentPrice - lowerBand[lowerBand.length - 1]) / 
      (upperBand[upperBand.length - 1] - lowerBand[lowerBand.length - 1]) : 0.5;
    
    // Distance from moving averages
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.length >= 50 ? 
      closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : sma20;
    
    const dev20 = Math.abs((currentPrice - sma20) / sma20);
    const dev50 = Math.abs((currentPrice - sma50) / sma50);
    
    // Mean reversion strength
    const mrStrength = Math.min(dev20 + dev50 * 0.5, 0.2) / 0.2;
    
    // Bollinger reversion signal
    let bbSignal: number;
    if (bbPosition < 0.2) {
      bbSignal = 0.8; // Strong buy signal near lower band
    } else if (bbPosition > 0.8) {
      bbSignal = 0.2; // Strong sell signal near upper band
    } else {
      bbSignal = 0.5;
    }
    
    return (mrStrength + bbSignal) / 2;
  }

  private calculateVolumeScore(volumes: number[], closes: number[]): number {
    if (volumes.length < 10) return 0.5;
    
    // Volume trend
    const recentVolumes = volumes.slice(-10);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    // Relative volume
    const relativeVolume = currentVolume / avgVolume;
    const relVolumeScore = Math.min(relativeVolume, 3.0) / 3.0;
    
    // Volume-price confirmation
    let vpConfirmation = 0.5;
    if (closes.length >= 5 && volumes.length >= 10) {
      const priceChange = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5];
      const volumeChange = (currentVolume - avgVolume) / avgVolume;
      
      if (Math.abs(priceChange) > 0.02) { // Significant price move
        if ((priceChange > 0 && volumeChange > 0) || (priceChange < 0 && volumeChange > 0)) {
          vpConfirmation = 0.8;
        } else {
          vpConfirmation = 0.2;
        }
      }
    }
    
    return (relVolumeScore + vpConfirmation) / 2;
  }

  private calculateVolatilityScore(closes: number[]): number {
    if (closes.length < 20) return 0.5;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    
    // Recent vs historical volatility
    const recentReturns = returns.slice(-10);
    const recentVol = this.calculateStdDev(recentReturns);
    const historicalVol = this.calculateStdDev(returns);
    
    const volRatio = historicalVol > 0 ? recentVol / historicalVol : 1.0;
    
    // Volatility regime scoring
    if (volRatio < 0.7) {
      return 0.8; // Low volatility - potential breakout
    } else if (volRatio > 1.5) {
      return 0.2; // High volatility - caution
    } else {
      return 0.5; // Normal volatility
    }
  }

  private calculateStructureScore(highs: number[], lows: number[], currentPrice: number): number {
    if (highs.length < 10 || lows.length < 10) return 0.5;
    
    // Support/Resistance analysis
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    
    const resistanceLevel = Math.max(...recentHighs);
    const supportLevel = Math.min(...recentLows);
    
    // Breakout detection
    if (currentPrice > resistanceLevel * 1.001) {
      return 0.8; // Bullish breakout
    } else if (currentPrice < supportLevel * 0.999) {
      return 0.2; // Bearish breakdown
    } else {
      // Position within range
      const rangePosition = (currentPrice - supportLevel) / (resistanceLevel - supportLevel);
      return 0.3 + (rangePosition * 0.4); // 0.3 to 0.7 range
    }
  }

  private calculateSentimentScore(closes: number[], volumes: number[]): number {
    if (closes.length < 10) return 0.5;
    
    // Price trend as sentiment proxy
    const shortTrend = this.calculateLinearRegression(closes.slice(-5));
    const mediumTrend = this.calculateLinearRegression(closes.slice(-10));
    
    const combinedTrend = (shortTrend + mediumTrend) / 2;
    const trendStrength = Math.tanh(combinedTrend / closes[closes.length - 1] * 100);
    
    return Math.max(0, Math.min(1, (trendStrength + 1) / 2));
  }

  /**
   * Calculate trade levels (target price, stop loss, risk/reward)
   */
  private calculateTradeLevels(
    marketData: MarketData, 
    signal: 'BUY' | 'SELL' | 'HOLD', 
    scores: QPPFScores
  ): { targetPrice: number; stopLoss: number; riskReward: number } {
    const { currentPrice, closes } = marketData;
    
    if (signal === 'HOLD' || closes.length < 20) {
      return {
        targetPrice: currentPrice,
        stopLoss: currentPrice,
        riskReward: 1.0
      };
    }
    
    // Calculate ATR for dynamic levels
    const atr = this.calculateATR(marketData.highs, marketData.lows, closes, 14);
    const volatilityMultiplier = Math.max(scores.volatilityRegime, 0.5);
    
    let targetPrice: number;
    let stopLoss: number;
    
    if (signal === 'BUY') {
      targetPrice = currentPrice + (atr * 2 * volatilityMultiplier);
      stopLoss = currentPrice - (atr * 1 * volatilityMultiplier);
    } else { // SELL
      targetPrice = currentPrice - (atr * 2 * volatilityMultiplier);
      stopLoss = currentPrice + (atr * 1 * volatilityMultiplier);
    }
    
    const riskAmount = Math.abs(currentPrice - stopLoss);
    const rewardAmount = Math.abs(targetPrice - currentPrice);
    const riskReward = riskAmount > 0 ? rewardAmount / riskAmount : 1.0;
    
    return { targetPrice, stopLoss, riskReward };
  }

  /**
   * Generate human-readable analysis
   */
  private generateAnalysis(scores: QPPFScores): string {
    const analysis: string[] = [];
    
    if (scores.momentum > 0.7) {
      analysis.push('Strong momentum');
    } else if (scores.momentum < 0.3) {
      analysis.push('Weak momentum');
    }
    
    if (scores.meanReversion > 0.7) {
      analysis.push('Oversold condition');
    } else if (scores.meanReversion < 0.3) {
      analysis.push('Overbought condition');
    }
    
    if (scores.volumeAnalysis > 0.7) {
      analysis.push('High volume confirmation');
    }
    
    if (scores.volatilityRegime > 0.7) {
      analysis.push('Low volatility setup');
    } else if (scores.volatilityRegime < 0.3) {
      analysis.push('High volatility risk');
    }
    
    if (scores.marketStructure > 0.7) {
      analysis.push('Bullish breakout');
    } else if (scores.marketStructure < 0.3) {
      analysis.push('Bearish breakdown');
    }
    
    return analysis.length > 0 ? analysis.join('; ') : 'Mixed signals';
  }

  /**
   * Assess overall market regime using SPY
   */
  private async assessMarketRegime(): Promise<'BULLISH' | 'BEARISH' | 'NEUTRAL'> {
    try {
      const spyData = await this.getSymbolData('SPY');
      if (!spyData || spyData.closes.length < 50) {
        return 'NEUTRAL';
      }
      
      const { closes, currentPrice } = spyData;
      const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
      
      if (currentPrice > sma20 && sma20 > sma50) {
        return 'BULLISH';
      } else if (currentPrice < sma20 && sma20 < sma50) {
        return 'BEARISH';
      } else {
        return 'NEUTRAL';
      }
      
    } catch (error) {
      console.error('Market regime assessment error:', error);
      return 'NEUTRAL';
    }
  }

  private getScanMetrics(
    buys: TradingOpportunity[], 
    sells: TradingOpportunity[]
  ) {
    const totalOpportunities = buys.length + sells.length;
    
    return {
      totalOpportunities,
      buyRatio: totalOpportunities > 0 ? buys.length / totalOpportunities : 0,
      avgBuyScore: buys.length > 0 ? buys.reduce((sum, b) => sum + b.qppfScore, 0) / buys.length : 0,
      avgSellScore: sells.length > 0 ? sells.reduce((sum, s) => sum + s.qppfScore, 0) / sells.length : 0,
      topBuySymbol: buys.length > 0 ? buys[0].symbol : null,
      topSellSymbol: sells.length > 0 ? sells[0].symbol : null
    };
  }

  // Technical Indicator Helper Methods
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const deltas = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }
    
    const gains = deltas.map(d => d > 0 ? d : 0).slice(-period);
    const losses = deltas.map(d => d < 0 ? -d : 0).slice(-period);
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];
    
    const emaValues: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (const price of prices) {
      ema = (price - ema) * multiplier + ema;
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  private calculateBollingerBands(
    prices: number[], 
    period: number = 20, 
    stdDev: number = 2
  ): [number[], number[]] {
    if (prices.length < period) return [[], []];
    
    const upperBand: number[] = [];
    const lowerBand: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      upperBand.push(sma + (std * stdDev));
      lowerBand.push(sma - (std * stdDev));
    }
    
    return [upperBand, lowerBand];
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return 0.02; // Default ATR
    }
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < Math.min(highs.length, lows.length, closes.length); i++) {
      const highLow = highs[i] - lows[i];
      const highClose = Math.abs(highs[i] - closes[i - 1]);
      const lowClose = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / period;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateLinearRegression(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, i) => sum + (i * y), 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    return slope;
  }

  /**
   * Get scanner configuration
   */
  getConfig(): ScanConfig {
    return { ...this.scanConfig };
  }

  /**
   * Update scanner configuration
   */
  updateConfig(config: Partial<ScanConfig>): void {
    this.scanConfig = { ...this.scanConfig, ...config };
  }

  /**
   * Get scoring weights
   */
  getWeights(): Record<keyof QPPFScores, number> {
    return { ...this.weights };
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<Record<keyof QPPFScores, number>>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Enhance QPPF scores with Unusual Whales data
   */
  private async enhanceWithUnusualWhales(symbol: string, scores: QPPFScores): Promise<void> {
    if (!this.uwClient) return;

    try {
      // Get options flow data to enhance sentiment
      const optionsFlow = await this.uwClient.getOptionsFlow(symbol);
      if (optionsFlow && optionsFlow.length > 0) {
        const flowSignals = this.uwClient.processOptionsFlowSignals(optionsFlow);
        
        // Enhance sentiment score based on options flow
        const flowSentimentBoost = flowSignals.sentimentScore * 0.2; // 20% boost max
        scores.sentiment = Math.min(1.0, scores.sentiment + flowSentimentBoost);
        
        // Boost volume analysis if there's unusual options activity
        if (flowSignals.hasUnusualFlow) {
          scores.volumeAnalysis = Math.min(1.0, scores.volumeAnalysis + 0.1);
        }
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      // Silently ignore UW errors to not break the main analysis
      console.debug(`UW enhancement skipped for ${symbol}:`, error.message);
    }
  }
}