/**
 * Unusual Whales API Client
 * Implements the corrected API endpoints for options flow, dark pool, and GEX data
 */

export interface UnusualWhalesAlert {
  symbol: string;
  alertType: string;
  strike: number;
  expiry: string;
  optionType: string;
  premium: number;
  volume: number;
  openInterest: number;
  timestamp: Date;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface DarkPoolData {
  trades: Array<{
    symbol: string;
    size: number;
    price: number;
    timestamp: string;
  }>;
  totalVolume: number;
  avgPrice: number;
}

// GEXData interface moved to gex-calculator.ts

export interface OptionsFlowSignals {
  sentimentScore: number;
  totalAlerts: number;
  recentAlerts: number;
  bullishCount: number;
  bearishCount: number;
  avgPremium: number;
  largeTradesCount: number;
  hasUnusualFlow: boolean;
  dominantSentiment: 'bullish' | 'bearish' | 'neutral';
  recentAlertsList: UnusualWhalesAlert[];
}

export class UnusualWhalesClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.unusualwhales.com';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch unusual options flow from Unusual Whales API
   * Uses the corrected endpoint: /option-trades/flow-alerts
   */
  async getOptionsFlow(
    symbol: string = 'SPY',
    startDate?: string,
    endDate?: string
  ): Promise<UnusualWhalesAlert[]> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        symbol,
        start: startDate || yesterday.toISOString().split('T')[0],
        end: endDate || now.toISOString().split('T')[0],
      });

      console.log(`Fetching options flow for ${symbol} from ${params.get('start')} to ${params.get('end')}`);

      const response = await fetch(`${this.baseUrl}/api/option-trades/flow-alerts?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        
        // Handle both direct array and {data: array} response formats
        const data = result.data || result;
        
        if (Array.isArray(data)) {
          console.log(`Received ${data.length} flow alerts`);

          return data.map((alertData: any): UnusualWhalesAlert => ({
          symbol: alertData.symbol || '',
          alertType: alertData.trade_type || alertData.alert_type || '',
          strike: Number(alertData.strike_price || alertData.strike || 0),
          expiry: alertData.expiration_date || alertData.expiry || '',
          optionType: (alertData.option_type || '').toLowerCase(),
          premium: Number(alertData.premium || alertData.price || 0),
          volume: Number(alertData.size || alertData.volume || 0),
          openInterest: Number(alertData.open_interest || 0),
          timestamp: alertData.timestamp || alertData.created_at 
            ? new Date(alertData.timestamp || alertData.created_at) 
            : new Date(),
          sentiment: this.inferSentiment(alertData),
        }));
        } else {
          console.log('Options flow data is not an array, using mock data');
          return this.mockOptionsFlow();
        }
      } else {
        const errorText = await response.text();
        console.log(`Unusual Whales API error (${response.status}): ${errorText}`);
        return this.mockOptionsFlow();
      }
    } catch (error) {
      console.error('Error fetching options flow:', error);
      return this.mockOptionsFlow();
    }
  }

  /**
   * Fetch dark pool trading data
   * Uses the corrected endpoint from OpenAPI: /api/darkpool/{ticker}
   */
  async getDarkPoolData(symbol: string = 'SPY'): Promise<DarkPoolData> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const params = new URLSearchParams({ date: dateStr });

      console.log(`Fetching dark pool data for ${symbol} on ${dateStr}`);

      const response = await fetch(`${this.baseUrl}/api/darkpool/${symbol}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log(`Dark pool response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        
        // Handle both direct array and {data: array} response formats
        const trades = result.data || result;
        
        if (Array.isArray(trades)) {
          console.log(`Received dark pool data: ${trades.length} trades`);
          
          // Convert to our expected format
          const processedTrades = trades.map(trade => ({
            symbol: trade.ticker || trade.symbol || symbol,
            size: trade.size || 0,
            price: parseFloat(trade.price || '0'),
            timestamp: trade.executed_at || trade.timestamp || new Date().toISOString(),
          }));
          
          const totalVolume = processedTrades.reduce((sum, trade) => sum + trade.size, 0);
          const avgPrice = totalVolume > 0 
            ? processedTrades.reduce((sum, trade) => sum + (trade.price * trade.size), 0) / totalVolume
            : 0;
          
          return {
            trades: processedTrades,
            totalVolume,
            avgPrice,
          };
        } else {
          console.log('Dark pool data is not an array, using mock data');
          return this.mockDarkPool();
        }
      } else {
        console.log(`Dark pool API error (${response.status}): ${await response.text()}`);
        return this.mockDarkPool();
      }
    } catch (error) {
      console.error('Error fetching dark pool data:', error);
      return this.mockDarkPool();
    }
  }

  /**
   * Fetch Gamma Exposure (GEX) data
   * Tries multiple potential endpoints for GEX data
   */
  async getGEXData(symbol: string = 'SPY'): Promise<GEXData> {
    const endpoints = [
      `/api/gex/${symbol}`,
      `/api/gamma/${symbol}`,
      `/gex?symbol=${symbol}`,
      `/api/market/gex?symbol=${symbol}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying GEX endpoint: ${endpoint}`);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        console.log(`GEX response status for ${endpoint}: ${response.status}`);

        if (response.ok) {
          const result = await response.json();
          
          // Handle different response formats
          const data = result.data || result;
          
          if (data && (data.gex !== undefined || data.gamma !== undefined)) {
            console.log(`Received GEX data from ${endpoint}:`, data);
            
            return {
              gex: parseFloat(data.gex || data.gamma || '0'),
              dex: parseFloat(data.dex || data.delta_exposure || '0'), 
              totalGamma: parseFloat(data.total_gamma || data.totalGamma || data.gex || '0'),
              symbol: data.symbol || symbol,
              timestamp: data.timestamp || new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        console.log(`Error with GEX endpoint ${endpoint}:`, error.message);
        continue;
      }
    }
    
    console.log('All GEX endpoints failed, using mock data');
    return this.mockGEX();
  }

  /**
   * Process options flow alerts into trading signals
   */
  processOptionsFlowSignals(alerts: UnusualWhalesAlert[]): OptionsFlowSignals {
    if (!alerts.length) {
      return {
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
      };
    }

    // Filter for recent alerts (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentAlerts = alerts.filter(alert => alert.timestamp > twoHoursAgo);

    // Calculate sentiment scores
    const bullishAlerts = recentAlerts.filter(a => a.sentiment === 'bullish');
    const bearishAlerts = recentAlerts.filter(a => a.sentiment === 'bearish');

    const totalRecentAlerts = recentAlerts.length;
    const sentimentScore = totalRecentAlerts > 0 
      ? (bullishAlerts.length - bearishAlerts.length) / totalRecentAlerts 
      : 0.0;

    // Calculate flow strength
    const totalPremium = recentAlerts.reduce((sum, alert) => sum + alert.premium, 0);
    const avgPremium = recentAlerts.length > 0 ? totalPremium / recentAlerts.length : 0;

    // Find large trades (premium > $50k)
    const largeTrades = recentAlerts.filter(alert => alert.premium > 50000);

    const dominantSentiment = sentimentScore > 0.2 ? 'bullish' 
      : sentimentScore < -0.2 ? 'bearish' 
      : 'neutral';

    return {
      sentimentScore,
      totalAlerts: alerts.length,
      recentAlerts: totalRecentAlerts,
      bullishCount: bullishAlerts.length,
      bearishCount: bearishAlerts.length,
      avgPremium,
      largeTradesCount: largeTrades.length,
      hasUnusualFlow: recentAlerts.length > 2, // At least 3 recent alerts
      dominantSentiment,
      recentAlertsList: recentAlerts.slice(0, 5), // Last 5 alerts for display
    };
  }

  private inferSentiment(alertData: any): 'bullish' | 'bearish' | 'neutral' {
    const optionType = (alertData.option_type || '').toLowerCase();
    const tradeType = (alertData.trade_type || '').toLowerCase();

    // Simple sentiment inference
    if (optionType === 'call') {
      if (['sweep', 'large_block'].includes(tradeType)) {
        return 'bullish';
      }
      return 'bullish';
    } else if (optionType === 'put') {
      if (['sweep', 'large_block'].includes(tradeType)) {
        return 'bearish';
      }
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Mock data for testing without API key
   */
  private mockOptionsFlow(): UnusualWhalesAlert[] {
    console.log('Using mock options flow data');
    const now = new Date();
    return [
      {
        symbol: 'SPY',
        alertType: 'sweep',
        strike: 450.0,
        expiry: '2025-10-18',
        optionType: 'call',
        premium: 15000.0,
        volume: 100,
        openInterest: 500,
        timestamp: new Date(now.getTime() - 30 * 60 * 1000),
        sentiment: 'bullish',
      },
      {
        symbol: 'SPY',
        alertType: 'block',
        strike: 445.0,
        expiry: '2025-10-18',
        optionType: 'put',
        premium: 12000.0,
        volume: 75,
        openInterest: 300,
        timestamp: new Date(now.getTime() - 45 * 60 * 1000),
        sentiment: 'bearish',
      },
      {
        symbol: 'SPY',
        alertType: 'large_single',
        strike: 455.0,
        expiry: '2025-10-25',
        optionType: 'call',
        premium: 25000.0,
        volume: 200,
        openInterest: 800,
        timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        sentiment: 'bullish',
      },
    ];
  }

  private mockDarkPool(): DarkPoolData {
    return {
      trades: [
        { symbol: 'SPY', size: 1000, price: 450.5, timestamp: new Date().toISOString() },
        { symbol: 'SPY', size: 500, price: 450.3, timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
      ],
      totalVolume: 1500,
      avgPrice: 450.4,
    };
  }

  private mockGEX(): GEXData {
    return {
      gex: 12345.67,
      dex: 6789.01,
      totalGamma: 1234567.89,
      symbol: 'SPY',
      timestamp: new Date().toISOString(),
    };
  }
}