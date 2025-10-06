# 🏦 Alpaca Trading API Setup Guide

## 📋 Complete Setup Checklist

Based on the official Alpaca Trading API documentation, this guide ensures your algorithmic trading system is production-ready.

---

## 🔑 1. Account & API Keys Setup

### **Step 1: Create Alpaca Account**
1. **Visit**: https://alpaca.markets/
2. **Sign up** for a free account
3. **Complete verification** (required for live trading)
4. **Fund your account** (for live trading only)

### **Step 2: Generate API Keys**
1. **Login** to your Alpaca dashboard
2. **Navigate** to "API Keys" section
3. **Generate new keys**:
   - **Paper Trading Keys**: For testing (no real money)
   - **Live Trading Keys**: For production (real money)
4. **Save securely**: Store keys in environment variables

### **Step 3: Environment Configuration**
```bash
# Paper Trading (Safe Testing)
export ALPACA_API_KEY_ID="PK..."
export ALPACA_SECRET_KEY="..."
export ALPACA_PAPER=true

# Live Trading (Real Money - Use with caution!)
export ALPACA_API_KEY_ID="AK..."
export ALPACA_SECRET_KEY="..."
export ALPACA_PAPER=false
```

---

## 🌐 2. API Endpoints & Authentication

### **Base URLs**
- **Paper Trading**: `https://paper-api.alpaca.markets`
- **Live Trading**: `https://api.alpaca.markets`

### **Authentication Headers**
```javascript
{
  "APCA-API-KEY-ID": "your-api-key-id",
  "APCA-API-SECRET-KEY": "your-secret-key",
  "Content-Type": "application/json"
}
```

### **X-Request-ID Tracking**
Every API response includes an `X-Request-ID` header for debugging:
```javascript
// Always log this for support tickets
const requestId = response.headers.get('X-Request-ID');
console.log('Request ID:', requestId);
```

---

## 📊 3. Order Types & Parameters

### **Supported Order Types**
- **Market**: Execute immediately at current market price
- **Limit**: Execute only at specified price or better  
- **Stop**: Market order triggered at stop price
- **Stop Limit**: Limit order triggered at stop price
- **Trailing Stop**: Stop price trails the market

### **Order Parameters**
```javascript
{
  symbol: "SPY",           // Stock symbol (required)
  qty: "100",              // Quantity as string (required)  
  side: "buy",             // "buy" or "sell" (required)
  type: "market",          // Order type (required)
  time_in_force: "day",    // "day", "gtc", "ioc", "fok"
  client_order_id: "...",  // Your unique ID for idempotency
  limit_price: "450.00",   // For limit orders
  stop_price: "445.00",    // For stop orders
}
```

### **Bracket Orders (Risk Management)**
```javascript
{
  order_class: "bracket",
  take_profit: {
    limit_price: "460.00"   // Take profit level
  },
  stop_loss: {
    stop_price: "440.00"    // Stop loss level
  }
}
```

---

## ⚡ 4. Rate Limits & Best Practices

### **Rate Limits**
- **200 requests per minute** for most endpoints
- **Use exponential backoff** for retries
- **Respect HTTP 429** (Too Many Requests) responses

### **Retry Logic**
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(1000 * attempt);
    }
  }
}
```

---

## 🛡️ 5. Risk Controls & Safety

### **Pre-Trade Checks**
- ✅ **Account Status**: Ensure trading is not blocked
- ✅ **Buying Power**: Verify sufficient funds  
- ✅ **Position Limits**: Check maximum position size
- ✅ **Day Trade Count**: Monitor PDT rule compliance

### **Order Validation**
```javascript
// Before submitting any order:
const account = await alpaca.getAccount();

if (account.trading_blocked) {
  throw new Error('Trading is blocked on account');
}

if (orderValue > account.buying_power) {
  throw new Error('Insufficient buying power');
}

if (account.day_trade_count >= 3 && account.equity < 25000) {
  throw new Error('PDT rule violation risk');
}
```

### **Position Sizing Formula**
```javascript
function calculatePositionSize(accountValue, riskPercent, stopLossPercent) {
  const riskAmount = accountValue * (riskPercent / 100);
  const stopLossAmount = stopLossPercent / 100;
  return Math.floor(riskAmount / stopLossAmount);
}

// Example: Risk 1% of $10,000 account with 2% stop loss
const positionSize = calculatePositionSize(10000, 1, 2);
// Result: 250 shares maximum
```

---

## 📈 6. QPPF Algorithm Integration

### **Signal to Order Translation**
```javascript
// Convert QPPF signal to Alpaca order
function convertSignalToOrder(signal, account) {
  const positionSize = calculatePositionSize(
    account.portfolio_value,
    2.0,  // Risk 2% per trade
    signal.stopLoss || 2.0
  );

  return {
    symbol: signal.symbol,
    qty: positionSize.toString(),
    side: signal.direction === 'LONG' ? 'buy' : 'sell',
    type: signal.confidence > 0.8 ? 'market' : 'limit',
    time_in_force: 'day',
    client_order_id: `qppf-${Date.now()}`,
    // Add stop loss and take profit for risk management
    order_class: 'bracket',
    stop_loss: {
      stop_price: calculateStopLoss(signal.entry_price, signal.direction)
    },
    take_profit: {
      limit_price: calculateTakeProfit(signal.entry_price, signal.direction)
    }
  };
}
```

### **Real-time Monitoring**
```javascript
// Check order status every few seconds
setInterval(async () => {
  const orders = await alpaca.getOrders({status: 'open'});
  
  for (const order of orders) {
    if (order.status === 'filled') {
      console.log(`✅ Order filled: ${order.symbol} at $${order.filled_avg_price}`);
      // Update position tracking
      await updatePositionTracking(order);
    }
  }
}, 5000);
```

---

## 🔍 7. Debugging & Monitoring

### **Comprehensive Logging**
```javascript
class AlpacaLogger {
  static logRequest(method, url, body, response, requestId) {
    console.log(`📤 ${method} ${url}`);
    console.log(`📝 Request ID: ${requestId}`);
    console.log(`📊 Status: ${response.status}`);
    
    if (body) console.log(`📦 Body:`, JSON.stringify(body, null, 2));
    if (!response.ok) console.error(`❌ Error:`, response.statusText);
  }
}
```

### **Health Monitoring**
```javascript
// Regular health checks
setInterval(async () => {
  const isHealthy = await alpaca.healthCheck();
  
  if (!isHealthy) {
    console.error('🚨 Alpaca API health check failed!');
    // Implement alerting system
    await sendAlert('Alpaca API connectivity issue');
  }
}, 60000); // Check every minute
```

---

## ⚠️ 8. Production Deployment Checklist

### **Before Going Live**
- [ ] **Test thoroughly** in paper trading environment
- [ ] **Verify API keys** are for correct environment (paper vs live)
- [ ] **Fund account** with appropriate amount for live trading
- [ ] **Set position limits** and risk controls
- [ ] **Test emergency stop** functionality
- [ ] **Set up monitoring** and alerting
- [ ] **Backup request IDs** logging system
- [ ] **Review compliance** requirements

### **Go-Live Process**
1. **Switch API keys** from paper to live
2. **Update base URL** to production endpoint  
3. **Start with small position sizes**
4. **Monitor first few trades closely**
5. **Gradually increase position sizes**
6. **Keep detailed logs** for auditing

### **Emergency Controls**
```javascript
// Emergency stop all trading
async function emergencyStop() {
  console.log('🚨 EMERGENCY STOP ACTIVATED');
  
  // Cancel all open orders
  const orders = await alpaca.getOrders({status: 'open'});
  for (const order of orders) {
    await alpaca.cancelOrder(order.id);
  }
  
  // Close all positions
  const positions = await alpaca.getPositions();
  for (const position of positions) {
    await alpaca.closePosition(position.symbol);
  }
  
  console.log('✅ All orders canceled and positions closed');
}
```

---

## 📞 9. Support & Troubleshooting

### **Common Issues**
- **HTTP 401**: Invalid API keys
- **HTTP 403**: Insufficient permissions
- **HTTP 422**: Invalid order parameters
- **HTTP 429**: Rate limit exceeded

### **Getting Help**
- **Documentation**: https://docs.alpaca.markets/
- **Support**: support@alpaca.markets
- **Always include**: X-Request-ID from failed requests
- **Community**: Alpaca Discord/Slack channels

### **Request ID Tracking**
```javascript
// Always save recent request IDs for support
const requestIdHistory = [];

function saveRequestId(requestId) {
  requestIdHistory.push({
    id: requestId,
    timestamp: new Date().toISOString()
  });
  
  // Keep last 100 requests
  if (requestIdHistory.length > 100) {
    requestIdHistory.shift();
  }
}
```

---

## 🚀 **Ready for Production!**

Your QPPF algorithmic trading system is now configured according to Alpaca's best practices:

- ✅ **Proper authentication** with secure key handling
- ✅ **X-Request-ID tracking** for debugging
- ✅ **Comprehensive error handling** and retry logic  
- ✅ **Risk controls** and position sizing
- ✅ **Order idempotency** with client-side IDs
- ✅ **Rate limiting** and backpressure
- ✅ **Emergency stops** and monitoring
- ✅ **Production deployment** checklist

**⚠️ Remember**: Start with paper trading, test thoroughly, and use appropriate position sizing for your risk tolerance!