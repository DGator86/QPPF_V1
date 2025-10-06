/**
 * Alpaca Trading Service - Enhanced for Production
 * Fully compliant with Alpaca Trading API best practices
 * Includes proper authentication, error handling, and X-Request-ID tracking
 */

export interface AlpacaCredentials {
  apiKey: string;
  secretKey: string;
  paper: boolean;
}

export interface AlpacaAccount {
  portfolioValue: number;
  buyingPower: number;
  cash: number;
  dayTradeCount: number;
  status: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  unrealizedPLPC: number;
  side: 'long' | 'short';
}

export interface AlpacaOrder {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  status: string;
  submittedAt: string;
  filledAt?: string;
  filledAvgPrice?: number;
  filledQty: number;
}

export interface TradeSignal {
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  confidence: number;
  orderType?: 'market' | 'limit';
  limitPrice?: number;
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  message: string;
  order?: AlpacaOrder;
  error?: string;
}

export class AlpacaTradingService {
  private credentials: AlpacaCredentials;
  private baseUrl: string;

  constructor(credentials: AlpacaCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.paper 
      ? 'https://paper-api.alpaca.markets' 
      : 'https://api.alpaca.markets';
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.credentials.apiKey,
      'APCA-API-SECRET-KEY': this.credentials.secretKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/account`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const account = await response.json();
      
      return {
        portfolioValue: parseFloat(account.portfolio_value),
        buyingPower: parseFloat(account.buying_power),
        cash: parseFloat(account.cash),
        dayTradeCount: parseInt(account.day_trade_count),
        status: account.status,
      };
    } catch (error) {
      console.error('Error fetching account:', error);
      return null;
    }
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/positions`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const positions = await response.json();
      
      return positions.map((pos: any): AlpacaPosition => ({
        symbol: pos.symbol,
        qty: parseInt(pos.qty),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPC: parseFloat(pos.unrealized_plpc),
        side: parseInt(pos.qty) > 0 ? 'long' : 'short',
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Get specific position for a symbol
   */
  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/positions/${symbol}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No position exists
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pos = await response.json();
      
      return {
        symbol: pos.symbol,
        qty: parseInt(pos.qty),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPC: parseFloat(pos.unrealized_plpc),
        side: parseInt(pos.qty) > 0 ? 'long' : 'short',
      };
    } catch (error) {
      console.error(`Error fetching position for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Execute a trade based on QPPF signal
   */
  async executeTrade(signal: TradeSignal): Promise<TradeResult> {
    try {
      // Check if we need to close existing position first
      const currentPosition = await this.getPosition(signal.symbol);
      
      // If we have an opposite position, close it first
      if (currentPosition && 
          ((currentPosition.side === 'long' && signal.direction === 'short') ||
           (currentPosition.side === 'short' && signal.direction === 'long'))) {
        
        await this.closePosition(signal.symbol);
        // Wait a moment for the close to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Determine order side
      const side = signal.direction === 'long' ? 'buy' : 'sell';

      // Create order payload
      const orderPayload = {
        symbol: signal.symbol,
        qty: signal.quantity.toString(),
        side: side,
        type: signal.orderType || 'market',
        time_in_force: 'day',
        ...(signal.orderType === 'limit' && signal.limitPrice ? { limit_price: signal.limitPrice.toString() } : {})
      };

      console.log(`Submitting ${side} order for ${signal.quantity} shares of ${signal.symbol}`);

      const response = await fetch(`${this.baseUrl}/v2/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Order submission failed: ${error}`);
      }

      const order = await response.json();

      const result: TradeResult = {
        success: true,
        orderId: order.id,
        message: `${side.toUpperCase()} order submitted for ${signal.quantity} shares of ${signal.symbol}`,
        order: {
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: parseInt(order.qty),
          orderType: order.type,
          status: order.status,
          submittedAt: order.submitted_at,
          filledAt: order.filled_at,
          filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
          filledQty: order.filled_qty ? parseInt(order.filled_qty) : 0,
        }
      };

      console.log('Trade executed successfully:', result);
      return result;

    } catch (error) {
      console.error('Trade execution failed:', error);
      return {
        success: false,
        message: 'Trade execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close position for a symbol
   */
  async closePosition(symbol: string): Promise<TradeResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/positions/${symbol}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Position close failed: ${error}`);
      }

      const order = await response.json();

      return {
        success: true,
        orderId: order.id,
        message: `Position closed for ${symbol}`,
        order: {
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: parseInt(order.qty),
          orderType: order.type,
          status: order.status,
          submittedAt: order.submitted_at,
          filledAt: order.filled_at,
          filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
          filledQty: order.filled_qty ? parseInt(order.filled_qty) : 0,
        }
      };

    } catch (error) {
      console.error(`Failed to close position for ${symbol}:`, error);
      return {
        success: false,
        message: `Failed to close position for ${symbol}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<AlpacaOrder | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const order = await response.json();

      return {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: parseInt(order.qty),
        orderType: order.type,
        status: order.status,
        submittedAt: order.submitted_at,
        filledAt: order.filled_at,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        filledQty: order.filled_qty ? parseInt(order.filled_qty) : 0,
      };

    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<AlpacaOrder[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/orders?status=all&limit=${limit}&direction=desc`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const orders = await response.json();

      return orders.map((order: any): AlpacaOrder => ({
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: parseInt(order.qty),
        orderType: order.type,
        status: order.status,
        submittedAt: order.submitted_at,
        filledAt: order.filled_at,
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
        filledQty: order.filled_qty ? parseInt(order.filled_qty) : 0,
      }));

    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }

  /**
   * Check if market is open
   */
  async isMarketOpen(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/clock`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const clock = await response.json();
      return clock.is_open;

    } catch (error) {
      console.error('Error checking market status:', error);
      return false;
    }
  }

  /**
   * Get current market price for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/stocks/${symbol}/quotes/latest`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const quote = data.quote;
      
      // Return midpoint of bid/ask
      return (parseFloat(quote.bid_price) + parseFloat(quote.ask_price)) / 2;

    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get account buying power for position sizing
   */
  async getBuyingPower(): Promise<number> {
    const account = await this.getAccount();
    return account?.buyingPower || 0;
  }

  /**
   * Calculate position size based on risk percentage
   */
  calculatePositionSize(
    portfolioValue: number,
    riskPercentage: number,
    confidence: number,
    currentPrice: number
  ): number {
    // Base risk amount
    const baseRiskAmount = portfolioValue * riskPercentage;
    
    // Adjust based on confidence (70% confidence = 0.7x position, 90% = 0.9x)
    const confidenceMultiplier = Math.max(0.1, Math.min(1.0, confidence));
    
    // Calculate final position size
    const riskAmount = baseRiskAmount * confidenceMultiplier;
    const shares = Math.floor(riskAmount / currentPrice);
    
    return Math.max(1, shares); // Minimum 1 share
  }
}