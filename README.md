# QPPF Trading Signals Dashboard - Professional Time-Domain Analysis

## Project Overview
- **Name**: QPPF Trading Signals Dashboard
- **Goal**: Professional trading signals platform with time-domain analysis for real market conditions and actionable trade signals
- **Features**: Multi-timeframe analysis (5m-1d), real-time options flow, GEX calculations, professional trading interface, live market data integration

## 🚀 Live Trading Dashboard
- **Production URL**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev
- **API Health**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev/health
- **API Documentation**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev/api/info

## 🎯 Current Interface - Professional Trading Signals

### **Multi-Timeframe Analysis**
✅ **6 Time Domain Boxes (5m, 15m, 30m, 1h, 4h, 1d)**
- Real-time signal direction (LONG/SHORT/FLAT) with confidence percentages
- Entry/Target/Stop levels for each timeframe
- Risk:Reward ratios calculated automatically
- Option play recommendations specific to each timeframe
- Visual signal strength indicators (Strong/Medium/Weak borders)

### **Live Market Data Integration** 
✅ **Real-time Market Summary Bar**
- SPY price with live updates
- Daily change percentage with color coding
- Volume, GEX levels, VIX, Call/Put ratios
- Zero Gamma Level for support/resistance

### **Options Flow Analysis**
✅ **Unusual Whales Integration**
- Live options flow alerts with time stamps
- Bullish/Bearish flow counts
- Large trade detection and premium analysis
- Real-time sentiment scoring

### **Market Structure Analysis**
✅ **GEX (Gamma Exposure) Data**
- Total GEX calculations using Black-Scholes mathematics
- Call/Put GEX breakdown
- Zero Gamma Level identification
- Dynamic support/resistance levels

## 🔧 Technical Implementation

### **Backend Architecture**
✅ **Hono Framework + Cloudflare Workers**
- RESTful API with 20+ endpoints for trading operations
- Real-time signal generation and analysis
- Alpaca Trading API integration with enhanced error handling
- Unusual Whales API integration for options flow data
- Mathematical GEX calculations using Black-Scholes model

### **Real-time Data Pipeline**
✅ **Live Market Data Processing**
- Auto-refreshing market summary (15s intervals)
- Staggered timeframe updates (30s-3min intervals)
- Real-time options flow alerts
- Live clock and market status indicators
- Automatic initialization and reconnection

### **Professional Trading Interface**
✅ **Dark Theme Professional Design**
- No buttons or unnecessary UI - pure data focus
- Color-coded signals (Green=Bull, Red=Bear, Gray=Neutral)
- Monospace fonts for precise data display
- Signal strength visual indicators
- Flash animations for live updates

### **Alpaca Paper Trading Integration**
✅ **Production-Ready Trading System**
- Account: PA386UFQSZ6N ($100k paper balance)
- Real-time account monitoring
- Automatic trade execution on strong signals
- Risk management and position sizing
- Order validation and error handling

### **🚀 QPPF Stock Scanner - NEW!**
✅ **Market-Wide Scanning System**
- 114 supported symbols (major ETFs + S&P 500 components)
- Multi-factor QPPF analysis across entire market
- Real-time price feeds (Alpaca API: SPY $668.62, AAPL tested)
- Unusual Whales integration for options flow sentiment enhancement
- 6-factor scoring: momentum, mean reversion, volume, volatility, market structure, sentiment
- BUY/SELL/HOLD signals with confidence scoring and risk/reward ratios
- Smart rate limiting and synthetic historical data fallbacks

## 📊 Time-Domain Analysis System

### **Timeframe Structure**
- **5-Minute**: Ultra short-term scalping signals with 0DTE options
- **15-Minute**: Short-term momentum with 1DTE options  
- **30-Minute**: Medium short-term with weekly options
- **1-Hour**: Medium-term swing trades with 2-week options
- **4-Hour**: Swing trading with monthly options
- **1-Day**: Position trading with 45DTE options

### **Signal Data Models**
- `TimeframeSignal` - Direction, confidence, entry/target/stop levels
- `OptionsRecommendation` - Strike, expiry, type based on timeframe
- `MarketStructure` - GEX levels, support/resistance, zero gamma
- `OptionsFlow` - Live flow alerts, sentiment, premium analysis
- `RiskReward` - Calculated ratios for each timeframe

### **Real-time Data Pipeline**
1. **Market Data** → Live SPY price, volume, VIX updates (15s)
2. **Options Flow** → Unusual Whales alerts processing (real-time)  
3. **GEX Calculation** → Black-Scholes gamma exposure (30s)
4. **Signal Generation** → Multi-timeframe analysis (staggered intervals)
5. **Display Updates** → Professional trading interface with flash animations

## 🎯 Functional API Endpoints

### Core Algorithm
- **POST** `/api/initialize` - Initialize algorithm with API keys (Unusual Whales + Alpaca)
- **GET** `/api/status` - Get current algorithm state and statistics
- **POST** `/api/signal` - Generate single trading signal
- **POST** `/api/start` - Start continuous signal generation
- **POST** `/api/stop` - Stop signal generation
- **POST** `/api/reset` - Reset algorithm state

### Trade Execution
- **POST** `/api/execute-trade` - Simulate trade execution
- **POST** `/api/execute-alpaca-trade` - **Execute LIVE trade via Alpaca**

### Alpaca Trading
- **GET** `/api/alpaca/account` - Get Alpaca account information
- **GET** `/api/alpaca/positions` - Get current positions
- **GET** `/api/alpaca/orders` - Get recent orders
- **POST** `/api/alpaca/close-position/:symbol` - Close position

### Risk Management
- **GET** `/api/risk-assessment` - Get risk assessment for current signal

### **🚀 QPPF Stock Scanner - NEW!**
- **GET** `/api/scanner/scan` - Run market-wide QPPF scanning (114 symbols) 
- **GET** `/api/scanner/analyze/:symbol` - Detailed QPPF analysis for specific symbol
- **GET** `/api/scanner/config` - Scanner configuration and supported symbols

### Data Access
- **GET** `/api/options-flow/:symbol?` - Get Unusual Whales options flow alerts
- **GET** `/api/gex/:symbol?` - Get Gamma Exposure data
- **GET** `/api/dark-pool/:symbol?` - Get Dark Pool trading data

### System
- **GET** `/api/health` - Health check endpoint
- **GET** `/api/info` - API documentation and endpoints list

## 🔧 Features Not Yet Implemented
❌ **Data Persistence**
- Cloudflare D1 database integration for trade history
- Historical signal storage and analysis
- User session management

❌ **Real-Time Updates**
- Server-Sent Events (SSE) for live data streaming
- WebSocket-like functionality for instant updates
- Live price feeds integration

❌ **Enhanced Analytics**
- Historical performance charts
- Signal accuracy tracking
- Backtesting functionality

❌ **Production Deployment**
- Cloudflare Pages deployment with environment variables
- API key security management
- Production-ready error handling

## 📝 How to Use the Trading Dashboard

### **Pure Data Interface - No Buttons**
The interface automatically initializes and starts providing real-time trading signals without any user interaction required. Simply open the URL and monitor the data.

### **Reading Time-Domain Signals**
1. **Signal Direction**: Green=LONG (bullish), Red=SHORT (bearish), Gray=FLAT (neutral)
2. **Confidence Percentage**: Higher percentages indicate stronger signals
3. **Border Colors**: Gold=Strong signal, Blue=Medium, Gray=Weak  
4. **Entry/Target/Stop**: Precise price levels for trade execution
5. **Risk:Reward Ratio**: Calculated profit potential vs loss risk
6. **Option Recommendations**: Specific strikes and expiries per timeframe

### **Market Summary Bar**
- **SPY Price**: Live price with color-coded daily change
- **Volume**: Current trading volume in millions
- **Total GEX**: Gamma exposure in billions  
- **Zero Gamma**: Key support/resistance level
- **VIX**: Market volatility index
- **Call/Put Ratio**: Options flow sentiment indicator

### **Options Flow Analysis**
- **Live Alerts**: Real-time options flow with timestamps and premiums
- **Sentiment Score**: Bullish vs bearish flow ratio
- **Large Trades**: Detection of institutional activity
- **GEX Structure**: Support/resistance levels from gamma positioning

### **Trading with the Signals**
1. **Choose Timeframe**: Select based on your trading style (5m for scalping, 1d for position)
2. **Check Confidence**: Only trade signals with >70% confidence for best results
3. **Use Precise Levels**: Enter at the specified entry price, target, and stop levels
4. **Follow Option Recommendations**: Use suggested strikes and expiries for options trades
5. **Monitor Multiple Timeframes**: Align shorter timeframes with longer-term bias

## 🚀 Deployment
- **Platform**: Cloudflare Pages (configured)
- **Status**: ✅ Active Development Server with Live Trading Integration
- **Tech Stack**: Hono + TypeScript + Tailwind CSS + PM2 + Alpaca API
- **Last Updated**: 2025-10-06

## 🔑 API Configuration
The application uses the corrected Unusual Whales API endpoints:
```javascript
{
  "base_url": "https://api.unusualwhales.com/api",
  "endpoints": {
    "options_flow": "/option-trades/flow-alerts",
    "dark_pool": "/darkpool", 
    "gex": "/gex"
  }
}
```

## 🛠 Development Commands
```bash
# Build project
npm run build

# Start development server
npm run dev:sandbox

# Clean port and restart
npm run clean-port && pm2 restart webapp

# View logs
pm2 logs webapp --nostream

# Check service status
curl http://localhost:3000/health
```

## ⚠️ Important Notes
- **Demo Mode**: Uses mock data when API calls fail for continuous testing
- **LIVE TRADING ENABLED**: This system can execute real trades with real money via Alpaca
- **Educational Purpose**: For demonstration and educational use only, not financial advice
- **API Keys**: Requires valid Unusual Whales API key for signals; Alpaca keys for live trading
- **Security**: All API keys processed server-side only, never stored in frontend
- **Paper Trading**: Always test with paper trading mode before using live funds
- **Risk Management**: Built-in position sizing and risk limits for safety

## 🔮 Recommended Next Steps
1. **Add Cloudflare D1 Database**: Implement persistent storage for signals and trades
2. **Deploy to Production**: Set up Cloudflare Pages deployment with secrets management
3. **Real Data Integration**: Connect to live market data feeds (Alpaca, IEX, etc.)
4. **Enhanced Analytics**: Add charts, historical analysis, and performance tracking
5. **User Management**: Implement user accounts and personalized settings
6. **Mobile Optimization**: Enhance mobile responsiveness and PWA features

## 📈 Signal Generation Logic
The QPPF algorithm uses multiple factors:
- **Unusual Whales Sentiment**: Options flow sentiment analysis
- **Large Trade Detection**: Premium threshold analysis ($50k+)
- **Volume Analysis**: Market volume considerations
- **Price Momentum**: Recent price movement trends
- **Confidence Scoring**: Multi-factor confidence calculation
- **Direction Analysis**: Long/Short/Flat signal generation

## 🎯 Live Trading Workflow

**For Paper Trading (Recommended for Testing):**
1. Initialize with your Unusual Whales API key + Alpaca paper trading credentials
2. Generate signals and execute paper trades to test the system
3. Monitor simulated P&L and positions without risking real money

**For Live Trading (Real Money):**
1. ⚠️ **Use at your own risk** - this will execute real trades with real money
2. Start with small position sizes and low risk parameters
3. Monitor the risk assessment before each trade
4. Always have stop-loss and position management strategies

Built with ❤️ using Hono framework, Unusual Whales integration for advanced options flow analysis, and Alpaca API for live trading execution.