# QPPF Signals - Quantum Trading Algorithm Website

## Project Overview
- **Name**: QPPF Signals
- **Goal**: Advanced trading signals website integrating Quantum Potential Price Flow algorithm with Unusual Whales options flow data
- **Features**: Real-time signal generation, options flow analysis, sentiment tracking, trade simulation, responsive web interface

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
- Algorithm initialization with API key management
- Manual signal generation
- Automatic signal generation mode
- Trade simulation and position tracking
- Algorithm state reset functionality

## 📊 Data Architecture
- **Data Models**: 
  - `UnusualWhalesAlert` - Options flow data structure
  - `QPPFSignal` - Trading signal with confidence metrics
  - `QPPFState` - Algorithm state and statistics
  - `MarketData` - Real-time price and volume data

- **Storage Services**: In-memory state management (ready for Cloudflare D1 integration)
- **Data Flow**: 
  1. Unusual Whales API → Raw options data
  2. QPPF Algorithm → Signal processing
  3. Frontend → Real-time display
  4. User Actions → API calls → Backend processing

## 🎯 Functional API Endpoints

### Core Algorithm
- **POST** `/api/initialize` - Initialize algorithm with Unusual Whales API key
- **GET** `/api/status` - Get current algorithm state and statistics
- **POST** `/api/signal` - Generate single trading signal
- **POST** `/api/start` - Start continuous signal generation
- **POST** `/api/stop` - Stop signal generation
- **POST** `/api/reset` - Reset algorithm state

### Data Access
- **GET** `/api/options-flow/:symbol?` - Get Unusual Whales options flow alerts
- **GET** `/api/gex/:symbol?` - Get Gamma Exposure data
- **GET** `/api/dark-pool/:symbol?` - Get Dark Pool trading data
- **POST** `/api/execute-trade` - Simulate trade execution

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
2. **Enter API Key**: Input your Unusual Whales API key in the configuration panel
3. **Select Symbol**: Choose a stock symbol (default: SPY)
4. **Initialize**: Click "Initialize" to start the algorithm

### Using the Algorithm
1. **Generate Signal**: Click "Generate Signal" for manual signal creation
2. **View Results**: See direction, confidence, strength, and reasoning
3. **Simulate Trade**: Execute simulated trades based on signals
4. **Monitor Data**: Watch real-time unusual whales alerts and market data

### Auto Mode
1. **Start Auto**: Click "Start Auto" for continuous signal generation
2. **Monitor Status**: Watch the status indicator for algorithm state
3. **Stop When Needed**: Click "Stop" to halt automatic generation

## 🚀 Deployment
- **Platform**: Cloudflare Pages (configured)
- **Status**: ✅ Active Development Server
- **Tech Stack**: Hono + TypeScript + Tailwind CSS + PM2
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
- **Educational Purpose**: For demonstration and educational use only, not financial advice
- **API Keys**: Requires valid Unusual Whales API key for real data
- **Security**: API keys processed server-side only, not stored in frontend

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

Built with ❤️ using Hono framework and Unusual Whales integration for advanced options flow analysis.