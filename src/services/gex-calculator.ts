/**
 * Gamma Exposure (GEX) Calculator
 * Implements real GEX calculations using Black-Scholes gamma and options flow data
 * Based on: https://perfiliev.com/blog/how-to-calculate-gamma-exposure-and-zero-gamma-level/
 */

export interface OptionContract {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  openInterest: number;
  impliedVolatility?: number;
  volume?: number;
  premium?: number;
  unitGamma?: number;
  unitDelta?: number;
}

export interface GEXData {
  totalGEX: number;           // Total gamma exposure in $ billions per 1% move
  callGEX: number;           // Call gamma exposure
  putGEX: number;            // Put gamma exposure  
  zeroGammaLevel: number | null;  // Zero gamma level (ZGL)
  currentSpot: number;       // Current underlying price
  perStrikeGEX: Array<{      // GEX breakdown by strike
    strike: number;
    gex: number;
    callGEX: number;
    putGEX: number;
  }>;
  profile: Array<{           // GEX profile across spot levels
    spotLevel: number;
    totalGEX: number;
  }>;
  timestamp: string;
}

export class GEXCalculator {
  private riskFreeRate: number = 0.05;  // 5% risk-free rate
  private dividendYield: number = 0.02; // 2% dividend yield  
  private contractSize: number = 100;   // Standard option contract size

  constructor(riskFreeRate?: number, dividendYield?: number) {
    if (riskFreeRate !== undefined) this.riskFreeRate = riskFreeRate;
    if (dividendYield !== undefined) this.dividendYield = dividendYield;
  }

  /**
   * Calculate Black-Scholes unit gamma
   */
  private calculateUnitGamma(
    spot: number,
    strike: number, 
    timeToExpiry: number,
    impliedVolatility: number,
    riskFreeRate: number = this.riskFreeRate,
    dividendYield: number = this.dividendYield
  ): number {
    if (timeToExpiry <= 0 || impliedVolatility <= 0 || spot <= 0) {
      return 0.0;
    }

    try {
      const d1 = (
        Math.log(spot / strike) + 
        (riskFreeRate - dividendYield + 0.5 * impliedVolatility * impliedVolatility) * timeToExpiry
      ) / (impliedVolatility * Math.sqrt(timeToExpiry));

      // Standard normal probability density function
      const phi_d1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);

      const gamma = Math.exp(-dividendYield * timeToExpiry) * phi_d1 / 
                   (spot * impliedVolatility * Math.sqrt(timeToExpiry));

      return gamma;
    } catch (error) {
      console.warn('Error calculating unit gamma:', error);
      return 0.0;
    }
  }

  /**
   * Calculate time to expiry in years (business days)
   */
  private calculateTimeToExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24)); // At least 1 day
    
    // Convert to business days (assume 262 business days per year)
    return diffDays / 365 * (262 / 365);
  }

  /**
   * Calculate option's GEX contribution  
   */
  private calculateOptionGEX(
    unitGamma: number,
    contracts: number,
    spot: number,
    isCall: boolean = true
  ): number {
    // GEX = unit_gamma * contracts * contract_size * spot^2 * 0.01
    // Result is in $ per 1% move of underlying
    const gex = unitGamma * contracts * this.contractSize * spot * spot * 0.01;
    
    // Sign convention: calls positive, puts negative (assuming dealers long calls, short puts)
    return isCall ? gex : -gex;
  }

  /**
   * Calculate implied volatility from option price using Newton-Raphson method
   * Simple approximation - in production would use more sophisticated solver
   */
  private calculateImpliedVolatility(
    optionPrice: number,
    spot: number,
    strike: number,
    timeToExpiry: number,
    isCall: boolean
  ): number {
    // Simple approximation based on ATM volatility
    // For more accuracy, implement full Black-Scholes IV solver
    const moneyness = spot / strike;
    
    if (isCall) {
      // Rough approximation for call IV
      return Math.max(0.1, Math.min(2.0, optionPrice / spot * Math.sqrt(2 * Math.PI / timeToExpiry)));
    } else {
      // Rough approximation for put IV  
      return Math.max(0.1, Math.min(2.0, optionPrice / strike * Math.sqrt(2 * Math.PI / timeToExpiry)));
    }
  }

  /**
   * Calculate total GEX and zero gamma level from options contracts
   */
  calculateGEX(contracts: OptionContract[], currentSpot: number): GEXData {
    console.log(`Calculating GEX for ${contracts.length} contracts at spot ${currentSpot}`);

    let totalCallGEX = 0;
    let totalPutGEX = 0;
    const perStrikeMap = new Map<number, {callGEX: number, putGEX: number}>();

    // Process each contract
    for (const contract of contracts) {
      if (!contract.strike || !contract.expiry || !contract.openInterest) {
        continue;
      }

      const timeToExpiry = this.calculateTimeToExpiry(contract.expiry);
      const isCall = contract.type.toLowerCase() === 'call';
      
      // Get or calculate implied volatility
      let iv = contract.impliedVolatility;
      if (!iv && contract.premium) {
        iv = this.calculateImpliedVolatility(
          contract.premium, currentSpot, contract.strike, timeToExpiry, isCall
        );
      }
      if (!iv) iv = 0.3; // Default 30% IV if cannot determine
      
      // Get or calculate unit gamma
      let unitGamma = contract.unitGamma;
      if (!unitGamma) {
        unitGamma = this.calculateUnitGamma(
          currentSpot, contract.strike, timeToExpiry, iv
        );
      }

      // Calculate option's GEX contribution
      const optionGEX = this.calculateOptionGEX(
        unitGamma, contract.openInterest, currentSpot, isCall
      );

      // Aggregate by type
      if (isCall) {
        totalCallGEX += optionGEX;
      } else {
        totalPutGEX += optionGEX;
      }

      // Aggregate by strike
      const strikeData = perStrikeMap.get(contract.strike) || {callGEX: 0, putGEX: 0};
      if (isCall) {
        strikeData.callGEX += optionGEX;
      } else {
        strikeData.putGEX += optionGEX;
      }
      perStrikeMap.set(contract.strike, strikeData);
    }

    const totalGEX = totalCallGEX + totalPutGEX;

    // Build per-strike array
    const perStrikeGEX = Array.from(perStrikeMap.entries())
      .map(([strike, data]) => ({
        strike,
        gex: data.callGEX + data.putGEX,
        callGEX: data.callGEX,
        putGEX: data.putGEX
      }))
      .sort((a, b) => a.strike - b.strike);

    // Calculate GEX profile and Zero Gamma Level
    const profile = this.calculateGEXProfile(contracts, currentSpot);
    const zeroGammaLevel = this.findZeroGammaLevel(profile);

    return {
      totalGEX: totalGEX / 1e9, // Convert to billions
      callGEX: totalCallGEX / 1e9,
      putGEX: totalPutGEX / 1e9,
      zeroGammaLevel,
      currentSpot,
      perStrikeGEX,
      profile: profile.map(p => ({
        spotLevel: p.spotLevel,
        totalGEX: p.totalGEX / 1e9
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate GEX profile across different spot levels
   */
  private calculateGEXProfile(contracts: OptionContract[], currentSpot: number): Array<{spotLevel: number, totalGEX: number}> {
    const profile: Array<{spotLevel: number, totalGEX: number}> = [];
    
    // Create spot level range (±20% around current spot)
    const minSpot = currentSpot * 0.8;
    const maxSpot = currentSpot * 1.2; 
    const numLevels = 40;
    
    for (let i = 0; i <= numLevels; i++) {
      const spotLevel = minSpot + (maxSpot - minSpot) * i / numLevels;
      let totalGEXAtLevel = 0;

      for (const contract of contracts) {
        if (!contract.strike || !contract.expiry || !contract.openInterest) {
          continue;
        }

        const timeToExpiry = this.calculateTimeToExpiry(contract.expiry);
        const isCall = contract.type.toLowerCase() === 'call';
        
        // Use original IV or default
        let iv = contract.impliedVolatility;
        if (!iv && contract.premium) {
          iv = this.calculateImpliedVolatility(
            contract.premium, currentSpot, contract.strike, timeToExpiry, isCall
          );
        }
        if (!iv) iv = 0.3;

        // Recalculate unit gamma at this spot level
        const unitGamma = this.calculateUnitGamma(
          spotLevel, contract.strike, timeToExpiry, iv
        );

        // Calculate GEX at this level
        const optionGEX = this.calculateOptionGEX(
          unitGamma, contract.openInterest, spotLevel, isCall
        );

        totalGEXAtLevel += optionGEX;
      }

      profile.push({
        spotLevel,
        totalGEX: totalGEXAtLevel
      });
    }

    return profile;
  }

  /**
   * Find Zero Gamma Level by interpolating where GEX profile crosses zero
   */
  private findZeroGammaLevel(profile: Array<{spotLevel: number, totalGEX: number}>): number | null {
    for (let i = 0; i < profile.length - 1; i++) {
      const current = profile[i];
      const next = profile[i + 1];

      // Check for sign change (zero crossing)
      if ((current.totalGEX > 0 && next.totalGEX < 0) || 
          (current.totalGEX < 0 && next.totalGEX > 0)) {
        
        // Linear interpolation to find exact zero crossing
        const zeroLevel = next.spotLevel - 
          (next.spotLevel - current.spotLevel) * 
          next.totalGEX / (next.totalGEX - current.totalGEX);
          
        return zeroLevel;
      }
    }

    return null; // No zero crossing found
  }

  /**
   * Convert Unusual Whales flow alert to OptionContract format
   */
  static fromUnusualWhalesAlert(alert: any): OptionContract | null {
    try {
      if (!alert.strike || !alert.expiry || !alert.volume) {
        return null;
      }

      return {
        strike: Number(alert.strike),
        expiry: alert.expiry,
        type: alert.optionType?.toLowerCase() === 'put' ? 'put' : 'call',
        openInterest: Number(alert.openInterest || alert.volume), // Use volume if OI not available
        impliedVolatility: undefined, // UW doesn't provide IV in flow alerts
        volume: Number(alert.volume),
        premium: Number(alert.premium),
        unitGamma: undefined, // Will be calculated
        unitDelta: undefined
      };
    } catch (error) {
      console.warn('Error converting UW alert to contract:', error);
      return null;
    }
  }

  /**
   * Create mock contracts for testing (when no real data available)
   */
  static createMockContracts(spotPrice: number): OptionContract[] {
    const contracts: OptionContract[] = [];
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days to expiry
    const expiryStr = expiry.toISOString().split('T')[0];

    // Create ATM and OTM options
    const strikes = [
      spotPrice * 0.95, spotPrice * 0.98, spotPrice,           // ITM calls, ATM
      spotPrice * 1.02, spotPrice * 1.05, spotPrice * 1.10    // OTM calls
    ];

    for (const strike of strikes) {
      // Call option
      contracts.push({
        strike: Math.round(strike),
        expiry: expiryStr,
        type: 'call',
        openInterest: Math.floor(1000 + Math.random() * 5000),
        impliedVolatility: 0.2 + Math.random() * 0.3, // 20-50% IV
        volume: Math.floor(100 + Math.random() * 500),
        premium: Math.max(1, (spotPrice - strike + Math.random() * 10)),
      });

      // Put option
      contracts.push({
        strike: Math.round(strike),
        expiry: expiryStr,
        type: 'put', 
        openInterest: Math.floor(1000 + Math.random() * 5000),
        impliedVolatility: 0.2 + Math.random() * 0.3,
        volume: Math.floor(100 + Math.random() * 500),
        premium: Math.max(1, (strike - spotPrice + Math.random() * 10)),
      });
    }

    return contracts;
  }
}