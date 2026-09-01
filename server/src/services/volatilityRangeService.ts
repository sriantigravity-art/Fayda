/**
 * VolatilityRangeService
 *
 * Fetches 52-week OHLC data from Yahoo Finance for each index/commodity
 * and derives the daily / weekly / monthly / 6-month true-range windows
 * used by the Pattern Engine for MTF level calculations.
 *
 * All values are cached for 24 hours and updated in the background.
 * The PatternEngine reads ranges synchronously via getRange() — so the
 * first call falls back to calibrated safe defaults until the async fetch
 * completes (typically within ~2 seconds of server start).
 *
 * Data source: Yahoo Finance /v8/finance/chart/ (same API as globalIndicesService)
 */

import { IndexSymbol } from '../types.js';

export interface VolatilityRange {
  /** Typical daily high–low range (points) */
  dRange: number;
  /** Typical weekly high–low range (points) */
  wRange: number;
  /** Typical monthly high–low range (points) */
  mRange: number;
  /** 6-month structural high–low range (points) */
  h6Range: number;
}

// Yahoo Finance ticker map for all supported symbols
const YAHOO_TICKER: Record<string, string> = {
  NIFTY:      '^NSEI',
  BANKNIFTY:  '^NSEBANK',
  FINNIFTY:   'NIFTY_FIN_SERVICE.NS',
  MIDCPNIFTY: '^NSEMDCP50',
  NIFTYNXT50: 'NIFTY_NEXT_50.NS',
  SENSEX:     '^BSESN',
  BANKEX:     'BSE-BANK.BO',
  CRUDEOIL:   'CL=F',
  NATURALGAS: 'NG=F',
  GOLD:       'GC=F',
  SILVER:     'SI=F',
};

/** Factor to convert USD-denominated range to INR-denominated range for MCX.
 *  Equity indices are 'DIRECT' (already in INR). */
const COMMODITY_INR_FACTOR: Record<string, 'DIRECT' | 'USD_CRUDE' | 'USD_GAS' | 'USD_GOLD' | 'USD_SILVER'> = {
  CRUDEOIL:   'USD_CRUDE',   // USD/barrel  → INR/barrel
  NATURALGAS: 'USD_GAS',     // USD/MMBtu   → INR/MMBtu
  GOLD:       'USD_GOLD',    // USD/troy oz → INR/10g
  SILVER:     'USD_SILVER',  // USD/troy oz → INR/kg
};

/**
 * Calibrated fallback ranges (safe defaults used before or when Yahoo fails).
 * These represent typical historical volatility ranges — they are NOT live prices.
 */
const FALLBACK_RANGES: Record<string, VolatilityRange> = {
  NIFTY:      { dRange: 180,  wRange: 450,  mRange: 900,  h6Range: 2200  },
  BANKNIFTY:  { dRange: 400,  wRange: 1100, mRange: 2400, h6Range: 5500  },
  FINNIFTY:   { dRange: 220,  wRange: 550,  mRange: 1100, h6Range: 2600  },
  MIDCPNIFTY: { dRange: 100,  wRange: 260,  mRange: 520,  h6Range: 1200  },
  NIFTYNXT50: { dRange: 350,  wRange: 900,  mRange: 1800, h6Range: 4200  },
  SENSEX:     { dRange: 600,  wRange: 1600, mRange: 3200, h6Range: 7500  },
  BANKEX:     { dRange: 450,  wRange: 1200, mRange: 2500, h6Range: 6000  },
  CRUDEOIL:   { dRange: 120,  wRange: 300,  mRange: 600,  h6Range: 1500  },
  NATURALGAS: { dRange: 8,    wRange: 20,   mRange: 40,   h6Range: 100   },
  GOLD:       { dRange: 400,  wRange: 1200, mRange: 2500, h6Range: 6000  },
  SILVER:     { dRange: 1500, wRange: 4000, mRange: 8000, h6Range: 20000 },
};

import { usdInrService } from './usdInrService.js';

class VolatilityRangeService {
  private cache: Map<string, { ranges: VolatilityRange; fetchedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  private async getUsdInr(): Promise<number> {
    return usdInrService.get();
  }

  constructor() {
    // Warm up cache for the most-used symbols at startup (non-blocking)
    const primary = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY', 'CRUDEOIL', 'GOLD', 'SILVER'];
    setTimeout(() => {
      primary.forEach(sym => this.refresh(sym).catch(() => {}));
    }, 2000);
  }

  /**
   * Returns cached volatility ranges synchronously.
   * Falls back to calibrated defaults if not yet fetched or Yahoo was unreachable.
   */
  public getRange(symbol: IndexSymbol): VolatilityRange {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.ranges;
    }

    // Trigger background refresh without blocking (fire-and-forget)
    this.refresh(symbol).catch(() => {});

    // Return calibrated fallback while async fetch completes
    return FALLBACK_RANGES[symbol] ?? FALLBACK_RANGES['NIFTY'];
  }

  /**
   * Fetches 6-month daily OHLC from Yahoo Finance and derives all four range tiers.
   * Results are stored in the cache for 24 hours.
   */
  public async refresh(symbol: string): Promise<void> {
    const ticker = YAHOO_TICKER[symbol];
    if (!ticker) return;

    try {
      // Fetch 6 months of daily candles
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=6mo`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.UA },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return;

      const data = (await res.json()) as any;
      const result = data?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp ?? [];
      const highs:  number[] = result?.indicators?.quote?.[0]?.high  ?? [];
      const lows:   number[] = result?.indicators?.quote?.[0]?.low   ?? [];

      if (timestamps.length < 10 || highs.length < 10) return;

      // Filter valid candles (no null/NaN values)
      const candles: { h: number; l: number; ts: number }[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (typeof highs[i] === 'number' && typeof lows[i] === 'number' &&
            isFinite(highs[i]) && isFinite(lows[i])) {
          candles.push({ h: highs[i], l: lows[i], ts: timestamps[i] * 1000 });
        }
      }
      if (candles.length < 5) return;

      const day20  = candles.slice(-20);
      const week8  = candles.slice(-40);
      const month3 = candles.slice(-66);
      const all    = candles;

      const avgDailyRange = (set: typeof candles) =>
        set.reduce((acc, c) => acc + (c.h - c.l), 0) / set.length;

      const structuralRange = (set: typeof candles) =>
        Math.max(...set.map(c => c.h)) - Math.min(...set.map(c => c.l));

      // Raw ranges in the ticker's native currency (USD for commodities, INR for indices)
      let dRaw  = avgDailyRange(day20);
      let wRaw  = avgDailyRange(week8)  * 2.5;
      let mRaw  = avgDailyRange(month3) * 5;
      let h6Raw = structuralRange(all);

      // ── Convert USD commodity ranges to INR ──────────────────────────────
      const convertType = COMMODITY_INR_FACTOR[symbol];
      if (convertType) {
        const usdInr = await this.getUsdInr();
        const toInr = (v: number) => {
          switch (convertType) {
            case 'USD_CRUDE':  return v * usdInr;                      // USD/bbl → INR/bbl
            case 'USD_GAS':    return v * usdInr;                      // USD/MMBtu → INR/MMBtu
            case 'USD_GOLD':   return v * usdInr / 31.1035 * 10;       // USD/oz → INR/10g
            case 'USD_SILVER': return v * usdInr / 31.1035 * 1000;     // USD/oz → INR/kg
            default:           return v;
          }
        };
        dRaw  = toInr(dRaw);
        wRaw  = toInr(wRaw);
        mRaw  = toInr(mRaw);
        h6Raw = toInr(h6Raw);
      }

      const fallback = FALLBACK_RANGES[symbol] ?? FALLBACK_RANGES['NIFTY'];
      const ranges: VolatilityRange = {
        dRange:  Math.round(dRaw)  > 0 ? Math.round(dRaw)  : fallback.dRange,
        wRange:  Math.round(wRaw)  > 0 ? Math.round(wRaw)  : fallback.wRange,
        mRange:  Math.round(mRaw)  > 0 ? Math.round(mRaw)  : fallback.mRange,
        h6Range: Math.round(h6Raw) > 0 ? Math.round(h6Raw) : fallback.h6Range,
      };

      this.cache.set(symbol, { ranges, fetchedAt: Date.now() });
      console.log(`[VolatilityRange] ${symbol}: dRange=${ranges.dRange} wRange=${ranges.wRange} mRange=${ranges.mRange} h6Range=${ranges.h6Range}`);
    } catch {
      // Leave cache as-is; fallback will be served by getRange()
    }
  }
}

// Singleton export
export const volatilityRangeService = new VolatilityRangeService();
