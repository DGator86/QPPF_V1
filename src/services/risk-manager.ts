/**
 * Risk Management Service
 * Handles position sizing, risk assessment, and trade validation
 */

import { QPPFSignal } from './qppf-algorithm';
import { OptionsFlowSignals } from './unusual-whales-client';
import { AlpacaAccount, AlpacaPosition } from './alpaca-trading-service';

export interface RiskAssessment {
  positionSize: number;
  riskScore: number;
  maxPositionSize: number;
  confidenceMultiplier: number;
  riskAmount: number;
  recommendation: 'execute' | 'reduce' | 'reject';
  reasons: string[];
}

export interface RiskParameters {
  maxPortfolioRisk: number; // Maximum % of portfolio at risk (default: 0.02 = 2%)
  maxTradeRisk: number; // Maximum % per trade (default: 0.005 = 0.5%)
  minConfidence: number; // Minimum confidence to trade (default: 0.70 = 70%)
  maxRiskScore: number; // Maximum allowed risk score (default: 0.30)
  maxDrawdown: number; // Maximum portfolio drawdown (default: 0.10 = 10%)
  maxPositionCount: number; // Maximum number of open positions (default: 5)
}

export class RiskManager {
  private params: RiskParameters;

  constructor(params?: Partial<RiskParameters>) {
    this.params = {
      maxPortfolioRisk: 0.05, // Increased from 2% to 5%
      maxTradeRisk: 0.02,     // Increased from 0.5% to 2% - allows ~$2000 per trade
      minConfidence: 0.60,    // Reduced from 70% to 60% to allow more trades
      maxRiskScore: 0.50,     // Increased from 0.30 to 0.50 to be less restrictive
      maxDrawdown: 0.15,      // Increased from 10% to 15%
      maxPositionCount: 10,   // Increased from 5 to 10 positions
      ...params,
    };
  }

  /**
   * Assess risk for a potential trade
   */
  assessTrade(
    signal: QPPFSignal,
    uwSignals: OptionsFlowSignals,
    account: AlpacaAccount,
    positions: AlpacaPosition[],
    currentPrice: number
  ): RiskAssessment {
    
    const reasons: string[] = [];
    let recommendation: 'execute' | 'reduce' | 'reject' = 'execute';

    // 1. Calculate base position size
    const basePositionSize = this.calculateBasePositionSize(
      account.portfolioValue,
      signal.confidence,
      currentPrice
    );

    // 2. Apply risk multipliers
    const { adjustedSize, multiplier } = this.applyRiskMultipliers(
      basePositionSize,
      signal,
      uwSignals,
      reasons
    );

    // 3. Check portfolio limits
    const portfolioLimitedSize = this.checkPortfolioLimits(
      adjustedSize,
      account,
      positions,
      currentPrice,
      reasons
    );

    // 4. Calculate risk score
    const riskScore = this.calculateRiskScore(
      signal,
      uwSignals,
      portfolioLimitedSize,
      account,
      positions
    );

    // 5. Make final recommendation
    if (signal.confidence < this.params.minConfidence) {
      recommendation = 'reject';
      reasons.push(`Confidence ${(signal.confidence * 100).toFixed(1)}% below minimum ${(this.params.minConfidence * 100).toFixed(1)}%`);
    } else if (riskScore > this.params.maxRiskScore) {
      recommendation = 'reject';
      reasons.push(`Risk score ${(riskScore * 100).toFixed(1)}% exceeds maximum ${(this.params.maxRiskScore * 100).toFixed(1)}%`);
    } else if (portfolioLimitedSize < basePositionSize * 0.5) {
      recommendation = 'reduce';
      reasons.push('Position size significantly reduced due to risk limits');
    }

    return {
      positionSize: Math.max(0, Math.floor(portfolioLimitedSize)),
      riskScore,
      maxPositionSize: Math.floor(account.portfolioValue * this.params.maxTradeRisk / currentPrice),
      confidenceMultiplier: multiplier,
      riskAmount: portfolioLimitedSize * currentPrice,
      recommendation,
      reasons,
    };
  }

  /**
   * Calculate base position size based on confidence and risk parameters
   */
  private calculateBasePositionSize(
    portfolioValue: number,
    confidence: number,
    currentPrice: number
  ): number {
    // Base risk amount (now 2% of portfolio)
    const baseRiskAmount = portfolioValue * this.params.maxTradeRisk;
    
    // Adjust for confidence (70% confidence = 0.7x, 90% = 0.9x, etc.)
    const confidenceMultiplier = Math.max(0.1, Math.min(1.0, confidence));
    
    // Calculate shares
    const riskAmount = baseRiskAmount * confidenceMultiplier;
    const shares = riskAmount / currentPrice;
    
    console.log(`💰 Position Sizing: Portfolio=$${portfolioValue}, Risk=${(this.params.maxTradeRisk*100)}%, Amount=$${baseRiskAmount.toFixed(2)}, Confidence=${confidence}, Price=$${currentPrice}, Shares=${shares.toFixed(2)}`);
    
    return shares;
  }

  /**
   * Apply risk multipliers based on signal characteristics
   */
  private applyRiskMultipliers(
    baseSize: number,
    signal: QPPFSignal,
    uwSignals: OptionsFlowSignals,
    reasons: string[]
  ): { adjustedSize: number; multiplier: number } {
    
    let multiplier = signal.confidence;

    // Boost for strong Unusual Whales signals
    if (uwSignals.hasUnusualFlow && Math.abs(uwSignals.sentimentScore) > 0.4) {
      multiplier *= 1.2;
      reasons.push('Boosted for strong unusual options flow');
    }

    // Boost for large trades alignment
    if (uwSignals.largeTradesCount >= 3) {
      multiplier *= 1.15;
      reasons.push(`Boosted for ${uwSignals.largeTradesCount} large trades`);
    }

    // Reduce for conflicting signals
    if (signal.sentiment !== uwSignals.dominantSentiment && uwSignals.hasUnusualFlow) {
      multiplier *= 0.8;
      reasons.push('Reduced for conflicting sentiment signals');
    }

    // Reduce for low signal strength
    if (signal.strength < 0.6) {
      multiplier *= 0.9;
      reasons.push('Reduced for low signal strength');
    }

    // Cap multiplier
    multiplier = Math.min(1.5, multiplier);

    return {
      adjustedSize: baseSize * multiplier,
      multiplier,
    };
  }

  /**
   * Check portfolio-level limits
   */
  private checkPortfolioLimits(
    size: number,
    account: AlpacaAccount,
    positions: AlpacaPosition[],
    currentPrice: number,
    reasons: string[]
  ): number {
    
    let adjustedSize = size;

    // Check maximum position count
    if (positions.length >= this.params.maxPositionCount) {
      adjustedSize = 0;
      reasons.push(`Maximum position count (${this.params.maxPositionCount}) reached`);
      return adjustedSize;
    }

    // Check buying power
    const requiredCapital = size * currentPrice;
    if (requiredCapital > account.buyingPower) {
      adjustedSize = account.buyingPower / currentPrice;
      reasons.push('Reduced to available buying power');
    }

    // Check portfolio risk limit
    const currentRisk = this.calculateCurrentPortfolioRisk(account, positions);
    const newTradeRisk = (adjustedSize * currentPrice) / account.portfolioValue;
    
    if (currentRisk + newTradeRisk > this.params.maxPortfolioRisk) {
      const maxNewRisk = this.params.maxPortfolioRisk - currentRisk;
      if (maxNewRisk <= 0) {
        adjustedSize = 0;
        reasons.push('Portfolio risk limit reached');
      } else {
        adjustedSize = (maxNewRisk * account.portfolioValue) / currentPrice;
        reasons.push('Reduced to stay within portfolio risk limit');
      }
    }

    return Math.max(0, adjustedSize);
  }

  /**
   * Calculate overall risk score for the trade
   */
  private calculateRiskScore(
    signal: QPPFSignal,
    uwSignals: OptionsFlowSignals,
    positionSize: number,
    account: AlpacaAccount,
    positions: AlpacaPosition[]
  ): number {
    
    const riskFactors: number[] = [];

    // 1. Confidence risk (lower confidence = higher risk)
    const confidenceRisk = (1.0 - signal.confidence) * 0.4;
    riskFactors.push(confidenceRisk);

    // 2. Position size risk (larger position = higher risk)
    const positionRisk = Math.min(
      (positionSize * 450) / (account.portfolioValue * this.params.maxTradeRisk), 
      1.0
    ) * 0.3;
    riskFactors.push(positionRisk);

    // 3. Signal conflict risk
    let conflictRisk = 0;
    if (uwSignals.hasUnusualFlow && signal.sentiment !== uwSignals.dominantSentiment) {
      conflictRisk = 0.2;
    }
    riskFactors.push(conflictRisk * 0.15);

    // 4. Portfolio concentration risk
    const concentrationRisk = Math.min(positions.length / this.params.maxPositionCount, 1.0) * 0.1;
    riskFactors.push(concentrationRisk);

    // 5. Market timing risk (simplified)
    const marketRisk = this.getMarketTimingRisk() * 0.05;
    riskFactors.push(marketRisk);

    return Math.min(1.0, riskFactors.reduce((sum, risk) => sum + risk, 0));
  }

  /**
   * Calculate current portfolio risk exposure
   */
  private calculateCurrentPortfolioRisk(
    account: AlpacaAccount,
    positions: AlpacaPosition[]
  ): number {
    
    const totalPositionValue = positions.reduce(
      (sum, pos) => sum + Math.abs(pos.qty * pos.currentPrice),
      0
    );

    return totalPositionValue / account.portfolioValue;
  }

  /**
   * Get market timing risk factor
   */
  private getMarketTimingRisk(): number {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Higher risk near market open/close
    if ((hour === 9 && minute < 45) || (hour === 15 && minute > 45)) {
      return 0.3; // 30% additional risk near open/close
    }
    
    return 0.1; // 10% base market risk
  }

  /**
   * Validate if trade should be executed
   */
  shouldExecuteTrade(assessment: RiskAssessment): boolean {
    return assessment.recommendation === 'execute' && assessment.positionSize > 0;
  }

  /**
   * Get risk parameters
   */
  getRiskParameters(): RiskParameters {
    return { ...this.params };
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(newParams: Partial<RiskParameters>): void {
    this.params = { ...this.params, ...newParams };
  }

  /**
   * Calculate maximum allowed position size for emergency scenarios
   */
  getMaxEmergencyPosition(portfolioValue: number, currentPrice: number): number {
    const maxRiskAmount = portfolioValue * this.params.maxTradeRisk * 2; // 2x emergency limit
    return Math.floor(maxRiskAmount / currentPrice);
  }

  /**
   * Generate risk report for monitoring
   */
  generateRiskReport(
    account: AlpacaAccount,
    positions: AlpacaPosition[]
  ): {
    portfolioRisk: number;
    positionCount: number;
    availableCapacity: number;
    riskStatus: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  } {
    
    const portfolioRisk = this.calculateCurrentPortfolioRisk(account, positions);
    const recommendations: string[] = [];

    let riskStatus: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (portfolioRisk > this.params.maxPortfolioRisk * 0.8) {
      riskStatus = 'high';
      recommendations.push('Portfolio risk approaching limit - consider reducing positions');
    } else if (portfolioRisk > this.params.maxPortfolioRisk * 0.6) {
      riskStatus = 'medium';
      recommendations.push('Portfolio risk at medium level - monitor closely');
    }

    if (positions.length >= this.params.maxPositionCount) {
      riskStatus = 'critical';
      recommendations.push('Maximum position count reached - no new positions allowed');
    }

    // Calculate unrealized P&L percentage
    const totalUnrealizedPL = positions.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
    const unrealizedPLPercent = totalUnrealizedPL / account.portfolioValue;

    if (unrealizedPLPercent < -this.params.maxDrawdown) {
      riskStatus = 'critical';
      recommendations.push(`Drawdown ${(unrealizedPLPercent * 100).toFixed(1)}% exceeds limit - consider stopping trading`);
    }

    return {
      portfolioRisk,
      positionCount: positions.length,
      availableCapacity: Math.max(0, this.params.maxPortfolioRisk - portfolioRisk),
      riskStatus,
      recommendations,
    };
  }
}