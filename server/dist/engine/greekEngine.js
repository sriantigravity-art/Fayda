"use strict";
/**
 * Precision Black-Scholes Options Greeks & Implied Volatility (IV) Inversion Engine
 * Solves exact Implied Volatility (IV %) from actual Option Closing Premiums (LTP)
 * and calculates exact Black-Scholes Theta Decay (₹/day & ₹/hour).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GreekEngine = void 0;
class GreekEngine {
    static cumulativeDistribution(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        const absX = Math.abs(x) / Math.SQRT2;
        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
        return 0.5 * (1.0 + sign * y);
    }
    static standardNormalDensity(x) {
        return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    }
    /**
     * Black-Scholes Theoretical Price
     */
    static blackScholesPrice(spot, strike, tYears, r, sigma, type) {
        if (tYears <= 0) {
            return type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
        }
        const sqrtT = Math.sqrt(tYears);
        const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * tYears) / (sigma * sqrtT);
        const d2 = d1 - sigma * sqrtT;
        if (type === 'CE') {
            return spot * this.cumulativeDistribution(d1) - strike * Math.exp(-r * tYears) * this.cumulativeDistribution(d2);
        }
        else {
            return strike * Math.exp(-r * tYears) * this.cumulativeDistribution(-d2) - spot * this.cumulativeDistribution(-d1);
        }
    }
    /**
     * Inverts Black-Scholes formula using Bisection to find exact Implied Volatility (IV) from closing LTP
     */
    static solveImpliedVolatility(spot, strike, daysToExpiry, ltp, type, r = 0.068) {
        const tYears = Math.max(0.08, daysToExpiry) / 365.0;
        const intrinsic = type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
        // If option price is at or below intrinsic, return baseline minimum IV
        if (ltp <= intrinsic + 0.5 || ltp <= 0.5) {
            return 10.5;
        }
        let lowSigma = 0.03; // 3% IV
        let highSigma = 1.50; // 150% IV
        let midSigma = 0.14;
        for (let i = 0; i < 22; i++) {
            midSigma = (lowSigma + highSigma) / 2.0;
            const price = this.blackScholesPrice(spot, strike, tYears, r, midSigma, type);
            const diff = price - ltp;
            if (Math.abs(diff) < 0.05)
                break;
            if (diff > 0) {
                highSigma = midSigma;
            }
            else {
                lowSigma = midSigma;
            }
        }
        const ivPct = +(midSigma * 100).toFixed(1);
        return Math.max(5.0, Math.min(120.0, ivPct));
    }
    /**
     * Evaluates Implied Volatility pricing classification
     * Low IV (<12.5%) = Cheap (Favorable for Buyers)
     * Moderate IV (12.5-18%) = Fair Value
     * High IV (>18%) = Expensive / High IV Crush Risk
     */
    static getIvStatus(ivPct) {
        if (ivPct < 12.5)
            return 'CHEAP';
        if (ivPct > 18.0)
            return 'EXPENSIVE_CRUSH_RISK';
        return 'FAIR';
    }
    /**
     * Evaluates Strike Liquidity and Slippage Safety
     */
    static evaluateLiquidity(volume, oi, ltp) {
        if (volume >= 50000 && oi >= 200000) {
            const spreadPct = ltp > 100 ? 0.05 : 0.15;
            return { rating: 'HIGH_LIQUIDITY', spreadPct };
        }
        if (volume >= 15000 && oi >= 50000) {
            return { rating: 'MODERATE', spreadPct: 0.45 };
        }
        return { rating: 'LOW_SLIPPAGE_RISK', spreadPct: 1.8 };
    }
    /**
     * Calculate Black-Scholes Daily Theta & Implied Volatility directly from Closing LTP
     */
    static calculateGreeks(spot, strike, daysToExpiry, callLtp, putLtp, r = 0.068) {
        const tYears = Math.max(0.08, daysToExpiry) / 365.0;
        const sqrtT = Math.sqrt(tYears);
        // Solve Exact Real-Time Implied Volatility from Option Premiums
        const callIvPct = this.solveImpliedVolatility(spot, strike, daysToExpiry, callLtp, 'CE', r);
        const putIvPct = this.solveImpliedVolatility(spot, strike, daysToExpiry, putLtp, 'PE', r);
        const avgIv = +((callIvPct + putIvPct) / 2).toFixed(1);
        // Calculate Call Theta Decay using exact Call IV
        const callSigma = callIvPct / 100.0;
        const callD1 = (Math.log(spot / strike) + (r + 0.5 * callSigma * callSigma) * tYears) / (callSigma * sqrtT);
        const callD2 = callD1 - callSigma * sqrtT;
        const callNd1Prime = this.standardNormalDensity(callD1);
        const callND2 = this.cumulativeDistribution(callD2);
        const callTerm1 = -(spot * callNd1Prime * callSigma) / (2 * sqrtT);
        const callThetaAnnual = callTerm1 - r * strike * Math.exp(-r * tYears) * callND2;
        const callThetaDaily = +(callThetaAnnual / 365.0).toFixed(2);
        const callThetaPerHour = +(callThetaDaily / 6.4).toFixed(2);
        // Calculate Put Theta Decay using exact Put IV
        const putSigma = putIvPct / 100.0;
        const putD1 = (Math.log(spot / strike) + (r + 0.5 * putSigma * putSigma) * tYears) / (putSigma * sqrtT);
        const putD2 = putD1 - putSigma * sqrtT;
        const putNd1Prime = this.standardNormalDensity(putD1);
        const putNMinusD2 = this.cumulativeDistribution(-putD2);
        const putTerm1 = -(spot * putNd1Prime * putSigma) / (2 * sqrtT);
        const putThetaAnnual = putTerm1 + r * strike * Math.exp(-r * tYears) * putNMinusD2;
        const putThetaDaily = +(putThetaAnnual / 365.0).toFixed(2);
        const putThetaPerHour = +(putThetaDaily / 6.4).toFixed(2);
        // Determine Theta Intensity (highest at ATM and low DTE)
        const moneyness = Math.abs(spot - strike) / spot;
        let thetaIntensity = 'LOW';
        if (daysToExpiry <= 1 && moneyness <= 0.01) {
            thetaIntensity = 'EXTREME';
        }
        else if (daysToExpiry <= 3 && moneyness <= 0.02) {
            thetaIntensity = 'HIGH';
        }
        else if (moneyness <= 0.04) {
            thetaIntensity = 'MODERATE';
        }
        return {
            callTheta: callThetaDaily,
            putTheta: putThetaDaily,
            callThetaPerHour,
            putThetaPerHour,
            callIv: callIvPct,
            callIvStatus: this.getIvStatus(callIvPct),
            putIv: putIvPct,
            putIvStatus: this.getIvStatus(putIvPct),
            iv: avgIv,
            thetaIntensity
        };
    }
}
exports.GreekEngine = GreekEngine;
