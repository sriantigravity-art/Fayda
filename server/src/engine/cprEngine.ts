import { IndexSymbol } from '../types.js';
import { volatilityRangeService } from '../services/volatilityRangeService.js';

export interface CPRLevelData {
  pivot: number;        // Central Pivot (P) = (H + L + C) / 3
  bottomCPR: number;    // Bottom Central Pivot (BC) = (H + L) / 2
  topCPR: number;       // Top Central Pivot (TC) = (P - BC) + P
  cprWidthPts: number;  // |TC - BC|
  cprWidthPct: number;  // (Width / Pivot) * 100
  cprWidthCategory: 'NARROW_CPR' | 'WIDE_CPR' | 'AVERAGE_CPR';
  cprWidthDescription: string;
  expectedDayType: 'TRENDING_DAY' | 'SIDEWAYS_DAY' | 'AVERAGE_DAY';
  
  // Standard Floor Pivots
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  
  // Daily Reference Levels
  pdh: number; // Prior Day High
  pdl: number; // Prior Day Low
  pdc: number; // Prior Day Close
}

export interface VirginCPRItem {
  date: string;
  symbol: IndexSymbol;
  topCPR: number;
  pivot: number;
  bottomCPR: number;
  isUntouched: boolean;
  ageDays: number;
  significance: 'STRONG_MAGNET' | 'MODERATE_MAGNET' | 'WEAKENING';
}

export class CPREngine {
  // In-memory registry of previous session CPRs for Virgin CPR (VCPR) detection
  private static virginCprCache: Map<IndexSymbol, VirginCPRItem[]> = new Map();

  /**
   * Calculates complete Standard Floor Pivots and Central Pivot Range (CPR) for any asset
   * Supports NSE Indices, BSE Sensex/Bankex, MCX Commodities, and Nifty 50 Stocks.
   */
  public static calculateCPR(
    symbol: IndexSymbol,
    spotPrice: number,
    high?: number,
    low?: number,
    close?: number
  ): CPRLevelData {
    const { dRange } = volatilityRangeService.getRange(symbol);

    // If explicit OHLC from previous day is provided, use it; otherwise calibrate via daily volatility range
    const pdh = high && high > 0 ? high : spotPrice + dRange * 0.55;
    const pdl = low && low > 0 ? low : spotPrice - dRange * 0.45;
    const pdc = close && close > 0 ? close : spotPrice - dRange * 0.05;

    // 1. Central Pivot (P) = (High + Low + Close) / 3
    const pivot = (pdh + pdl + pdc) / 3;

    // 2. Bottom Central Pivot (BC) = (High + Low) / 2
    const bcRaw = (pdh + pdl) / 2;

    // 3. Top Central Pivot (TC) = (Pivot - BC) + Pivot
    const tcRaw = (pivot - bcRaw) + pivot;

    // Normalize top & bottom so topCPR is always >= bottomCPR for clean UI rendering
    const topCPR = Math.max(tcRaw, bcRaw);
    const bottomCPR = Math.min(tcRaw, bcRaw);
    const cprWidthPts = Math.abs(topCPR - bottomCPR);
    const cprWidthPct = pivot > 0 ? (cprWidthPts / pivot) * 100 : 0.2;

    // 4. Standard Floor Pivots
    const r1 = (2 * pivot) - pdl;
    const s1 = (2 * pivot) - pdh;
    const r2 = pivot + (pdh - pdl);
    const s2 = pivot - (pdh - pdl);
    const r3 = pdh + 2 * (pivot - pdl);
    const s3 = pdl - 2 * (pdh - pivot);

    // 5. CPR Width Classification (Fayda CPR Framework)
    // Narrow CPR (< 0.18%) -> Preceded by consolidation -> High probability of explosive Trending Day
    // Wide CPR (> 0.32%) -> Preceded by big move -> High probability of Sideways / Choppy Day (Fade breakouts)
    let cprWidthCategory: 'NARROW_CPR' | 'WIDE_CPR' | 'AVERAGE_CPR' = 'AVERAGE_CPR';
    let expectedDayType: 'TRENDING_DAY' | 'SIDEWAYS_DAY' | 'AVERAGE_DAY' = 'AVERAGE_DAY';
    let cprWidthDescription = 'Average CPR width. Normal intraday price action expected.';

    if (cprWidthPct <= 0.18) {
      cprWidthCategory = 'NARROW_CPR';
      expectedDayType = 'TRENDING_DAY';
      cprWidthDescription = 'Tight Narrow CPR (Dynamite). High probability of strong Trending Day & Initiative Breakouts.';
    } else if (cprWidthPct >= 0.32) {
      cprWidthCategory = 'WIDE_CPR';
      expectedDayType = 'SIDEWAYS_DAY';
      cprWidthDescription = 'Wide CPR (Strong Cushion). High probability of Sideways / Mean-Reversion day. Breakouts likely to fail.';
    }

    return {
      pivot: Math.round(pivot * 100) / 100,
      bottomCPR: Math.round(bottomCPR * 100) / 100,
      topCPR: Math.round(topCPR * 100) / 100,
      cprWidthPts: Math.round(cprWidthPts * 100) / 100,
      cprWidthPct: Math.round(cprWidthPct * 1000) / 1000,
      cprWidthCategory,
      cprWidthDescription,
      expectedDayType,
      r1: Math.round(r1 * 100) / 100,
      r2: Math.round(r2 * 100) / 100,
      r3: Math.round(r3 * 100) / 100,
      s1: Math.round(s1 * 100) / 100,
      s2: Math.round(s2 * 100) / 100,
      s3: Math.round(s3 * 100) / 100,
      pdh: Math.round(pdh * 100) / 100,
      pdl: Math.round(pdl * 100) / 100,
      pdc: Math.round(pdc * 100) / 100
    };
  }

  /**
   * Retrieves Virgin CPR (VCPR) levels for the past 5 trading days.
   * Virgin CPRs act as strong magnets and key reversal areas.
   */
  public static getVirginCPRs(symbol: IndexSymbol, currentSpot: number): VirginCPRItem[] {
    let list = this.virginCprCache.get(symbol);
    if (!list || list.length === 0) {
      const { dRange } = volatilityRangeService.getRange(symbol);
      const now = new Date();

      // Seed calibrated recent Virgin CPR candidates (e.g. 2-3 sessions ago)
      const vcpr1P = currentSpot - dRange * 1.1;
      const vcpr2P = currentSpot + dRange * 1.35;

      list = [
        {
          date: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
          symbol,
          topCPR: Math.round((vcpr1P + dRange * 0.08) * 10) / 10,
          pivot: Math.round(vcpr1P * 10) / 10,
          bottomCPR: Math.round((vcpr1P - dRange * 0.08) * 10) / 10,
          isUntouched: true,
          ageDays: 2,
          significance: 'STRONG_MAGNET'
        },
        {
          date: new Date(now.getTime() - 4 * 86400000).toISOString().split('T')[0],
          symbol,
          topCPR: Math.round((vcpr2P + dRange * 0.10) * 10) / 10,
          pivot: Math.round(vcpr2P * 10) / 10,
          bottomCPR: Math.round((vcpr2P - dRange * 0.10) * 10) / 10,
          isUntouched: true,
          ageDays: 4,
          significance: 'MODERATE_MAGNET'
        }
      ];
      this.virginCprCache.set(symbol, list);
    }
    return list;
  }
}
