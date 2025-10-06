# QPPF Signals - Quantum Trading Algorithm with Live Alpaca Integration

## Project Overview
- **Name**: QPPF Signals
- **Goal**: Advanced trading signals website integrating Quantum Potential Price Flow algorithm with Unusual Whales options flow data and live Alpaca trading
- **Features**: Real-time signal generation, options flow analysis, sentiment tracking, live trade execution, risk management, account monitoring, responsive web interface

## 🚀 Live URLs
- **Development**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev
- **API Health**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev/health
- **API Info**: https://3000-iif8eeqf2h6t5xprsh5b4-6532622b.e2b.dev/api/info

## 🔧 Currently Implemented Features
✅ **Unusual Whales API Integration**
- Options flow alerts with corrected endpoints (`/option-trades/flow-alerts`)
- Dark pool data (`/darkpool`)
- Gamma exposure (GEX) data (`/gex`)
- Real-time sentiment analysis and signal processing

✅ **QPPF Algorithm Core**
- Quantum Potential Price Flow signal generation
- Multi-factor confidence scoring
- Sentiment-based directional analysis
- Mock market data integration (ready for real data feeds)

✅ **Responsive Web Interface**
- Modern gradient design with Tailwind CSS
- Real-time data displays and interactive controls
- Signal visualization with confidence/strength meters
- Options flow alerts table with color-coded sentiment

✅ **API Backend (Hono Framework)**
- RESTful API with comprehensive endpoints
- Algorithm initialization and control
- Signal generation and trade simulation
- Status monitoring and statistics

✅ **Trading Controls**
- Algorithm initialization with API key management (Unusual Whales + Alpaca)
- Manual signal generation
- Automatic signal generation mode
- Trade simulation and **LIVE TRADE EXECUTION via Alpaca**
- Algorithm state reset functionality
- Paper trading and live trading modes

✅ **Alpaca Trading Integration**
- Real-time account monitoring (portfolio value, buying power, cash)
- Current positions tracking with P&L
- Recent orders history
- Live trade execution with market orders
- Position closing functionality
- Paper trading for testing

✅ **Advanced Risk Management**
- Position sizing based on confidence and risk parameters
- Portfolio risk assessment and limits
- Multi-factor risk scoring
- Trade validation and recommendations
- Maximum drawdown protection
- Position count limits

## 📊 Data Architecture
- **Data Models**: 
  - `UnusualWhalesAlert` - Options flow data structure
  - `QPPFSignal` - Trading signal with confidence metrics
  - `QPPFState` - Algorithm state and statistics
  - `MarketData` - Real-time price and volume data
  - `AlpacaAccount` - Account balance and trading info
  - `AlpacaPosition` - Current positions and P&L
  - `RiskAssessment` - Risk analysis and recommendations

- **Storage Services**: In-memory state management (ready for Cloudflare D1 integration)
- **Data Flow**: 
  1. Unusual Whales API → Raw options data
  2. QPPF Algorithm → Signal processing with risk assessment
  3. Alpaca API → Live account data and trade execution
  4. Frontend → Real-time display of signals, positions, and P&L
  5. User Actions → API calls → Backend processing → Live trades

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

## 📝 User Guide

### Getting Started
1. **Access the Website**: Visit the development URL above
2. **Configure APIs**:
   - **Unusual Whales API Key**: Required for signals generation
   - **Alpaca API Keys**: Optional - for live trading (leave empty for signal-only mode)
   - **Trading Mode**: Choose Paper Trading (safe) or Live Trading (real money)
3. **Select Symbol**: Choose a stock symbol (default: SPY)
4. **Initialize**: Click "Initialize System" to start the algorithm

### Signal Generation
1. **Generate Signal**: Click "Generate Signal" for manual signal creation
2. **View Results**: See direction, confidence, strength, and reasoning
3. **Monitor Data**: Watch real-time unusual whales alerts and market data

### Trade Execution Options
1. **Simulate Trade**: Execute simulated trades for testing
2. **Execute Live Trade**: **Execute real trades via Alpaca** (requires Alpaca credentials)
3. **Risk Assessment**: View position sizing and risk analysis before trading

### Live Trading Features (Alpaca Integration)
1. **Account Monitoring**: View portfolio value, buying power, and cash balance
2. **Position Tracking**: See current positions with real-time P&L
3. **Order History**: Monitor recent trade executions
4. **Risk Management**: Automated position sizing and risk limits

### Auto Mode
1. **Start Auto**: Click "Start Auto" for continuous signal generation
2. **Monitor Status**: Watch the status indicator for algorithm state
3. **Live Trading**: Signals can automatically trigger live trades (when configured)
4. **Stop When Needed**: Click "Stop" to halt automatic generation

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