import { IndexSymbol, ALL_SYMBOLS_CONFIG } from '../types.js';
import { GreekEngine } from '../engine/greekEngine.js';
import { NseExpiryService } from './nseExpiryService.js';
import { mcxCommodityService } from './mcxCommodityService.js';
import { globalIndicesService } from './globalIndicesService.js';
import { bseService } from './bseService.js';
import { mcxOptionChainService } from './mcxOptionChainService.js';

import { usdInrService } from './usdInrService.js';

interface RawStrikeSnapshot {
  strikePrice: number;
  callOI: number;
  callOIChangeTotal?: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putOIChangeTotal?: number;
  putLtp: number;
  putVolume: number;
}

export interface NseFetchResult {
  symbol: IndexSymbol;
  spotPrice: number;
  spotChange?: number;
  spotPctChange?: number;
  timestamp: string;
  strikes: RawStrikeSnapshot[];
  expiryDates: string[];
  selectedExpiry: string;
  totalCallOI?: number;
  totalPutOI?: number;
}

// NSE liveEquity-derivatives API index keys (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY)
const NSE_DERIVATIVE_INDEX_MAP: Record<string, string> = {
  NIFTY:      'nse50_opt',
  BANKNIFTY:  'nifty_bank_opt',
  FINNIFTY:   'finnifty_opt',
  MIDCPNIFTY: 'midcap_nifty_opt'
};

// NSE option-chain-indices API symbol names (NIFTYNXT50 uses a different NSE endpoint).
// NSE accepts both 'NIFTYNXT50' and 'NIFTY NEXT 50' — try primary first, fallback second.
const NSE_INDICES_CHAIN_MAP: Record<string, { primary: string; fallback?: string }> = {
  NIFTYNXT50: { primary: 'NIFTYNXT50', fallback: 'NIFTY NEXT 50' }
};

// ─── Yahoo Finance ticker mapping + currency conversion type ─────────────────
// Priority: Fyers (live) → NSE India API → Yahoo Finance (this module) → emergency static
type ConvertType =
  | 'DIRECT'           // Already in INR (Indian equity index)
  | 'USD_INR_CRUDE'    // USD/barrel  → INR/barrel  (MCX CrudeOil)
  | 'USD_INR_GAS'      // USD/MMBtu   → INR/MMBtu   (MCX NatGas)
  | 'USD_INR_GOLD'     // USD/troy oz → INR/10g      (MCX Gold)
  | 'USD_INR_SILVER';  // USD/troy oz → INR/kg       (MCX Silver)

const YAHOO_SPOT_MAP: Record<string, { ticker: string; convert: ConvertType }> = {
  NIFTY:      { ticker: '^NSEI',                  convert: 'DIRECT'         },
  BANKNIFTY:  { ticker: '^NSEBANK',               convert: 'DIRECT'         },
  FINNIFTY:   { ticker: 'NIFTY_FIN_SERVICE.NS',   convert: 'DIRECT'         },
  MIDCPNIFTY: { ticker: '^NSEMDCP50',             convert: 'DIRECT'         },
  NIFTYNXT50: { ticker: 'NIFTY_NEXT_50.NS',       convert: 'DIRECT'         },
  SENSEX:     { ticker: '^BSESN',                 convert: 'DIRECT'         },
  BANKEX:     { ticker: 'BSE-BANK.BO',            convert: 'DIRECT'         },
  CRUDEOIL:   { ticker: 'CL=F',                   convert: 'USD_INR_CRUDE'  },
  NATURALGAS: { ticker: 'NG=F',                   convert: 'USD_INR_GAS'    },
  GOLD:       { ticker: 'GC=F',                   convert: 'USD_INR_GOLD'   },
  SILVER:     { ticker: 'SI=F',                   convert: 'USD_INR_SILVER' },
  RELIANCE:   { ticker: 'RELIANCE.NS',            convert: 'DIRECT'         },
  HDFCBANK:   { ticker: 'HDFCBANK.NS',            convert: 'DIRECT'         },
  ICICIBANK:  { ticker: 'ICICIBANK.NS',           convert: 'DIRECT'         },
  INFY:       { ticker: 'INFY.NS',                convert: 'DIRECT'         },
  TCS:        { ticker: 'TCS.NS',                 convert: 'DIRECT'         },
};

/**
 * Absolute emergency fallback — used ONLY when Fyers + NSE + Yahoo ALL fail simultaneously.
 * These are rough order-of-magnitude numbers, NOT precise prices.
 * They exist solely to prevent a crash / blank screen, not to be accurate.
 */
const EMERGENCY_FALLBACK_SPOT: Record<string, number> = {
  NIFTY:      24500,
  BANKNIFTY:  51500,
  FINNIFTY:   23500,
  MIDCPNIFTY: 12500,
  NIFTYNXT50: 68000,
  SENSEX:     77000,
  BANKEX:     65000,
  CRUDEOIL:   7000,
  NATURALGAS: 240,
  GOLD:       75000,
  SILVER:     95000,
  RELIANCE:   2950,
  HDFCBANK:   1650,
  ICICIBANK:  1200,
  INFY:       1850,
  TCS:        4200,
};

export class NseService {
  private cookies: string = '';
  private cookieTimestamp: number = 0;
  private isRefreshingCookies: boolean = false;
  private cachedChain: Map<string, { result: NseFetchResult; timestamp: number }> = new Map();

  // Unified spot data cache (60 s TTL): holds live Yahoo spot + change per symbol
  private spotCache: Map<string, { spot: number; change: number; pctChange: number; ts: number }> = new Map();

  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  // ─── USD/INR live rate ─────────────────────────────────────────────────────
  private async fetchUsdInrRate(): Promise<number> {
    return usdInrService.get();
  }

  // ─── Yahoo Finance spot price fetcher ─────────────────────────────────────

  /**
   * Fetches live spot price, change and pctChange from Yahoo Finance (60 s cache).
   * For USD-denominated commodities (CrudeOil, Gold, Silver, NatGas), the price is
   * automatically converted to INR using the live USD/INR rate.
   *
   * Conversion formulas (1 troy oz = 31.1035 g):
   *   GOLD   : USD/troy oz × USD_INR / 31.1035 × 10   = INR/10g  (MCX Gold lot)
   *   SILVER : USD/troy oz × USD_INR / 31.1035 × 1000 = INR/kg   (MCX Silver lot)
   *   CRUDE  : USD/barrel  × USD_INR                  = INR/barrel
   *   GAS    : USD/MMBtu   × USD_INR                  = INR/MMBtu
   */
  public async fetchYahooSpot(symbol: string): Promise<{ spot: number; change: number; pctChange: number } | null> {
    // ── Priority 1: Check live NSE allIndices feed from globalIndicesService ──
    try {
      const liveNseQuote = await globalIndicesService.getSpotForSymbol(symbol);
      if (liveNseQuote && liveNseQuote.spot > 0) {
        this.spotCache.set(symbol, { ...liveNseQuote, ts: Date.now() });
        return liveNseQuote;
      }
    } catch {}

    // ── GOLD and SILVER: use MCX-aligned IBJA benchmark (official Indian rates) ──
    if (symbol === 'GOLD' || symbol === 'SILVER') {
      const mcqQuote = await mcxCommodityService.fetchSpot(symbol as 'GOLD' | 'SILVER');
      if (mcqQuote) {
        const result = { spot: mcqQuote.spot, change: mcqQuote.change, pctChange: mcqQuote.pctChange };
        this.spotCache.set(symbol, { ...result, ts: Date.now() });
        return result;
      }
    }

    const cached = this.spotCache.get(symbol);
    if (cached && Date.now() - cached.ts < 20000) {
      return { spot: cached.spot, change: cached.change, pctChange: cached.pctChange };
    }

    const cfg = YAHOO_SPOT_MAP[symbol];
    if (!cfg) return null;

    const usdInr = (cfg.convert !== 'DIRECT') ? await this.fetchUsdInrRate() : 1;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return null;

      const data = (await res.json()) as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

      const priceUsd  = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || priceUsd;
      const rawChange = priceUsd - prevClose;
      const pctChange = +(rawChange / Math.max(0.0001, Math.abs(prevClose)) * 100).toFixed(2);

      let spot: number;
      let change: number;

      switch (cfg.convert) {
        case 'USD_INR_CRUDE':
          spot   = Math.round(priceUsd * usdInr);
          change = Math.round(rawChange * usdInr);
          break;
        case 'USD_INR_GAS':
          spot   = +(priceUsd * usdInr).toFixed(1);
          change = +(rawChange * usdInr).toFixed(1);
          break;
        case 'USD_INR_GOLD':
          // USD/troy oz → INR/10g (MCX gold is priced per 10 grams)
          spot   = Math.round(priceUsd * usdInr / 31.1035 * 10);
          change = Math.round(rawChange * usdInr / 31.1035 * 10);
          break;
        case 'USD_INR_SILVER':
          // USD/troy oz → INR/kg (MCX silver is priced per kilogram)
          spot   = Math.round(priceUsd * usdInr / 31.1035 * 1000);
          change = Math.round(rawChange * usdInr / 31.1035 * 1000);
          break;
        default:
          // Indian equity index — already in INR
          spot   = +priceUsd.toFixed(2);
          change = +rawChange.toFixed(2);
      }

      this.spotCache.set(symbol, { spot, change, pctChange, ts: Date.now() });
      return { spot, change, pctChange };
    } catch {
      return null;
    }
  }

  // ─── NSE cookie management ─────────────────────────────────────────────────

  private async ensureCookies(): Promise<string> {
    const now = Date.now();
    if (this.cookies && now - this.cookieTimestamp < 5 * 60 * 1000) return this.cookies;
    if (this.isRefreshingCookies) return this.cookies;

    this.isRefreshingCookies = true;
    try {
      const resMain = await fetch('https://www.nseindia.com', {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(4000)
      });
      const rawCookies = resMain.headers.getSetCookie ? resMain.headers.getSetCookie() : [];
      this.cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
      this.cookieTimestamp = Date.now();
    } catch {
      // Keep existing cookies
    } finally {
      this.isRefreshingCookies = false;
    }
    return this.cookies;
  }

  // ─── Main option chain fetcher ─────────────────────────────────────────────

  // ── Helper: convert external OI result (BSE/MCX) to NseFetchResult shape ───

  private convertExternalResult(
    symbol: IndexSymbol,
    ext: { symbol: string; spotPrice: number; spotChange: number; spotPctChange: number;
            strikes: any[]; expiryDates: string[]; selectedExpiry: string;
            totalCallOI?: number; totalPutOI?: number }
  ): NseFetchResult {
    return {
      symbol,
      spotPrice:    ext.spotPrice,
      spotChange:   ext.spotChange,
      spotPctChange: ext.spotPctChange,
      timestamp:    new Date().toISOString(),
      strikes:      ext.strikes,
      expiryDates:  ext.expiryDates,
      selectedExpiry: ext.selectedExpiry,
      totalCallOI:  ext.totalCallOI,
      totalPutOI:   ext.totalPutOI,
    };
  }

  // ── NSE option-chain-indices API (for NIFTYNXT50) ────────────────────────────

  private async fetchNseIndicesChain(symbol: string, expiry?: string): Promise<NseFetchResult | null> {
    const nseSymCfg = NSE_INDICES_CHAIN_MAP[symbol];
    if (!nseSymCfg) return null;

    // Try primary symbol name, then fallback if primary returns empty data
    const namesToTry = [nseSymCfg.primary, ...(nseSymCfg.fallback ? [nseSymCfg.fallback] : [])];

    for (const nseSymbolName of namesToTry) {
    try {
      const cookies = await this.ensureCookies();
      const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(nseSymbolName)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':  this.userAgent,
          'Accept':      'application/json, text/plain, */*',
          'Referer':     'https://www.nseindia.com/option-chain',
          'Cookie':      cookies
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) return null;
      const json = (await res.json()) as any;

      const records   = json?.records   || {};
      const filtered  = json?.filtered  || {};
      const rawList: any[] = filtered.data || records.data || [];
      if (!rawList.length) return null;

      const spotPrice  = +(records.underlyingValue || filtered.underlyingValue || 0);
      const expiryDates: string[] = records.expiryDates || [];
      const selectedExp = expiry && expiryDates.includes(expiry) ? expiry : (expiryDates[0] || '');

      const yahooQuote = await this.fetchYahooSpot(symbol);
      const spotChangeFinal   = yahooQuote?.change    ?? 0;
      const spotPctFinal      = yahooQuote?.pctChange ?? 0;

      const strikeMap = new Map<number, RawStrikeSnapshot>();
      let totalCallOI = 0;
      let totalPutOI  = 0;

      for (const item of rawList) {
        if (item.expiryDate !== selectedExp) continue;
        const sp = item.strikePrice;
        if (typeof sp !== 'number' || sp <= 0) continue;

        if (!strikeMap.has(sp)) {
          strikeMap.set(sp, {
            strikePrice: sp,
            callOI: 0, callLtp: 0, callVolume: 0, callOIChangeTotal: 0,
            putOI:  0, putLtp:  0, putVolume:  0, putOIChangeTotal:  0
          });
        }
        const entry = strikeMap.get(sp)!;

        if (item.CE) {
          entry.callOI            = item.CE.openInterest           || 0;
          entry.callLtp           = item.CE.lastPrice              || 0;
          entry.callVolume        = item.CE.totalTradedVolume       || 0;
          entry.callOIChangeTotal = item.CE.changeinOpenInterest    || 0;
          totalCallOI += entry.callOI;
        }
        if (item.PE) {
          entry.putOI            = item.PE.openInterest            || 0;
          entry.putLtp           = item.PE.lastPrice               || 0;
          entry.putVolume        = item.PE.totalTradedVolume        || 0;
          entry.putOIChangeTotal = item.PE.changeinOpenInterest     || 0;
          totalPutOI += entry.putOI;
        }
      }

      const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strikePrice - b.strikePrice);
      if (strikes.length === 0) return null;

      console.log(
        `[NSE-Indices] ${symbol} (${nseSymbolName}): ${strikes.length} strikes, ` +
        `spot ₹${spotPrice.toLocaleString('en-IN')} (CE OI: ${totalCallOI.toLocaleString()}, PE OI: ${totalPutOI.toLocaleString()})`
      );

      return {
        symbol,
        spotPrice: spotPrice || yahooQuote?.spot || 0,
        spotChange: spotChangeFinal,
        spotPctChange: spotPctFinal,
        timestamp: new Date().toISOString(),
        strikes,
        expiryDates,
        selectedExpiry: selectedExp,
        totalCallOI,
        totalPutOI
      };
    } catch (err: any) {
      console.warn(`[NSE-Indices] ${symbol} (${nseSymbolName}) fetch error:`, err.message);
      // try next symbol name variant
    }
    } // end namesToTry loop
    return null;
  }

  public async fetchOptionChain(symbol: IndexSymbol, expiry?: string): Promise<NseFetchResult> {
    const cacheKey = `${symbol}_${expiry || 'default'}`;
    const cached = this.cachedChain.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 15000) return cached.result;

    const nseKey = NSE_DERIVATIVE_INDEX_MAP[symbol];

    // ── Attempt 1: NSE India live equity-derivatives API ──────────────────────
    if (nseKey) {
      try {
        const cookies = await this.ensureCookies();
        const url = `https://www.nseindia.com/api/liveEquity-derivatives?index=${encodeURIComponent(nseKey)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.nseindia.com/option-chain',
            'Cookie': cookies
          },
          signal: AbortSignal.timeout(5000)
        });

        if (res.ok) {
          const json = (await res.json()) as any;
          const rawList: any[] = json.data || [];

          if (rawList.length > 0) {
            // Use NSE's underlyingValue; fall back to Yahoo if missing / zero
            const nseSpot = rawList[0]?.underlyingValue;
            const yahooQuote = await this.fetchYahooSpot(symbol);
            const spotPrice = (typeof nseSpot === 'number' && nseSpot > 0)
              ? nseSpot
              : (yahooQuote?.spot ?? EMERGENCY_FALLBACK_SPOT[symbol] ?? 24000);

            const expiries = [...new Set(rawList.map((item: any) => item.expiryDate).filter(Boolean))] as string[];
            const selectedExp = (expiry && expiries.includes(expiry)) ? expiry : (expiries[0] || '');

            // Live change/pct from Yahoo Finance (NSE API doesn't expose spot delta directly)
            const spotChangeFinal  = yahooQuote?.change    ?? 0;
            const spotPctFinal     = yahooQuote?.pctChange ?? 0;

            const strikeMap = new Map<number, RawStrikeSnapshot>();
            let totalCallOI = 0;
            let totalPutOI  = 0;

            for (const item of rawList) {
              if (item.expiryDate !== selectedExp) continue;
              const sp = item.strikePrice;
              if (typeof sp !== 'number' || sp <= 0) continue;

              if (!strikeMap.has(sp)) {
                strikeMap.set(sp, {
                  strikePrice: sp,
                  callOI: 0, callLtp: 0, callVolume: 0, callOIChangeTotal: 0,
                  putOI:  0, putLtp:  0, putVolume:  0, putOIChangeTotal:  0
                });
              }
              const entry = strikeMap.get(sp)!;
              const isCall = item.optionType === 'Call' || item.optionType === 'CE';
              const isPut  = item.optionType === 'Put'  || item.optionType === 'PE';

              if (isCall) {
                entry.callOI = item.openInterest || 0;
                entry.callLtp = item.lastPrice || 0;
                entry.callVolume = item.volume || 0;
                entry.callOIChangeTotal = item.change || 0;
                totalCallOI += entry.callOI;
              } else if (isPut) {
                entry.putOI = item.openInterest || 0;
                entry.putLtp = item.lastPrice || 0;
                entry.putVolume = item.volume || 0;
                entry.putOIChangeTotal = item.change || 0;
                totalPutOI += entry.putOI;
              }
            }

            const allStrikes = Array.from(strikeMap.values()).sort((a, b) => a.strikePrice - b.strikePrice);
            if (allStrikes.length > 0) {
              const result: NseFetchResult = {
                symbol,
                spotPrice,
                spotChange: spotChangeFinal,
                spotPctChange: spotPctFinal,
                timestamp: json.timestamp || new Date().toISOString(),
                strikes: allStrikes,
                expiryDates: expiries,
                selectedExpiry: selectedExp,
                totalCallOI,
                totalPutOI
              };
              this.cachedChain.set(`${symbol}_${selectedExp}`, { result, timestamp: now });
              this.cachedChain.set(`${symbol}_default`,        { result, timestamp: now });
              return result;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[NSE] liveEquity-derivatives error for ${symbol}:`, err.message);
      }
    }

    // ── Attempt 2: NSE option-chain-indices API (NIFTYNXT50) ──────────────────
    if (NSE_INDICES_CHAIN_MAP[symbol]) {
      const nseIndResult = await this.fetchNseIndicesChain(symbol, expiry);
      if (nseIndResult && nseIndResult.strikes.length > 0) {
        this.cachedChain.set(cacheKey,             { result: nseIndResult, timestamp: now });
        this.cachedChain.set(`${symbol}_default`,  { result: nseIndResult, timestamp: now });
        return nseIndResult;
      }
    }

    // ── Attempt 3: BSE option chain API (SENSEX, BANKEX) ─────────────────────
    if (symbol === 'SENSEX' || symbol === 'BANKEX') {
      const bseResult = await bseService.fetchOptionChain(symbol as 'SENSEX' | 'BANKEX', expiry);
      if (bseResult && bseResult.strikes.length > 0) {
        const nseFmt = this.convertExternalResult(symbol, bseResult);
        this.cachedChain.set(cacheKey,             { result: nseFmt, timestamp: now });
        this.cachedChain.set(`${symbol}_default`,  { result: nseFmt, timestamp: now });
        return nseFmt;
      }
    }

    // ── Attempt 4: MCX option chain API (GOLD, SILVER, CRUDEOIL, NATURALGAS) ──
    if (mcxOptionChainService.canHandle(symbol)) {
      const mcxResult = await mcxOptionChainService.fetchOptionChain(symbol, expiry);
      if (mcxResult && mcxResult.strikes.length > 0) {
        const nseFmt = this.convertExternalResult(symbol, mcxResult);
        this.cachedChain.set(cacheKey,             { result: nseFmt, timestamp: now });
        this.cachedChain.set(`${symbol}_default`,  { result: nseFmt, timestamp: now });
        return nseFmt;
      }
    }

    // ── Return stale cache if available (avoids unnecessary fallback OI chain) ─
    if (cached) return cached.result;

    // ── Fallback: Build realistic dynamic OI chain around live Yahoo spot price ──
    // Priority: Fetch live spot & delta from Yahoo Finance.
    // EMERGENCY_FALLBACK_SPOT is used ONLY when all live networks/APIs fail completely.
    const yahooData = await this.fetchYahooSpot(symbol);
    const isOfflineFallback = !yahooData;

    if (isOfflineFallback) {
      console.warn(`[NSE] ⚠️ OFFLINE EMERGENCY FALLBACK: No live data available for ${symbol} — using calibrated safety reference spot ₹${EMERGENCY_FALLBACK_SPOT[symbol] ?? 24000}`);
    } else {
      console.log(`[NSE] Building calibrated options structure for ${symbol} around live spot ₹${yahooData.spot} (${yahooData.change >= 0 ? '+' : ''}${yahooData.change} pts)`);
    }

    const defaultSpot   = yahooData?.spot      ?? EMERGENCY_FALLBACK_SPOT[symbol] ?? 24000;
    const spotChangeFbk = yahooData?.change    ?? 0;
    const spotPctFbk    = yahooData?.pctChange ?? 0;

    const cfg   = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const step  = cfg?.step ?? 50;
    const atmStrike  = Math.round(defaultSpot / step) * step;

    // Use NseExpiryService for dynamically computed official expiry dates (no hardcoding)
    const expiryDates   = NseExpiryService.getUpcomingExpiries(symbol, 6);
    const selectedExpiry = expiry && expiryDates.includes(expiry) ? expiry : (expiryDates[0] || '');

    // Exact dynamic Days-To-Expiry from calendar (min 0.25 days for 0-DTE intraday)
    const rawDte = NseExpiryService.getDaysToExpiry(selectedExpiry);
    const dteDays = Math.max(0.25, rawDte);
    const daysToExp = dteDays / 365;

    // Realistic market-calibrated base volatilities
    const SYMBOL_BASE_IV: Record<string, number> = {
      NIFTY:      0.135,
      BANKNIFTY:  0.165,
      FINNIFTY:   0.150,
      MIDCPNIFTY: 0.145,
      NIFTYNXT50: 0.170,
      SENSEX:     0.135,
      BANKEX:     0.165,
      CRUDEOIL:   0.280,
      NATURALGAS: 0.420,
      GOLD:       0.150,
      SILVER:     0.220,
    };
    const baseSigma = SYMBOL_BASE_IV[symbol] ?? 0.20;

    const fallbackStrikes: RawStrikeSnapshot[] = [];
    let totalCallOI = 0;
    let totalPutOI  = 0;

    for (let i = -15; i <= 15; i++) {
      const strikePrice = atmStrike + i * step;

      // Realistic Institutional Volatility Smile & Downside Put Skew
      const moneyness = (strikePrice - defaultSpot) / (defaultSpot || 1);
      const callSigma = baseSigma * (1 + 0.10 * Math.max(0, moneyness));
      const putSigma  = baseSigma * (1 + 0.24 * Math.max(0, -moneyness)); // Downside put skew

      const callLtp = Math.max(0.5, +(GreekEngine.blackScholesPrice(defaultSpot, strikePrice, daysToExp, 0.07, callSigma, 'CE')).toFixed(2));
      const putLtp  = Math.max(0.5, +(GreekEngine.blackScholesPrice(defaultSpot, strikePrice, daysToExp, 0.07, putSigma,  'PE')).toFixed(2));

      // Natural round-strike institutional OI concentration
      const isMajorRound = strikePrice % (step * 5) === 0;
      const roundMultiplier = isMajorRound ? 1.35 : 1.0;

      const callOI = Math.round(115000 * Math.exp(-Math.abs(i) * 0.12) * roundMultiplier);
      const putOI  = Math.round(125000 * Math.exp(-Math.abs(i) * 0.12) * roundMultiplier);
      const callVolume = Math.round(callOI * 1.15 + (Math.abs(i) <= 3 ? 45000 : 8000));
      const putVolume  = Math.round(putOI * 1.15  + (Math.abs(i) <= 3 ? 45000 : 8000));

      totalCallOI += callOI;
      totalPutOI  += putOI;

      fallbackStrikes.push({
        strikePrice,
        callOI,
        callOIChangeTotal: Math.round(callOI * 0.03),
        callLtp,
        callVolume,
        putOI,
        putOIChangeTotal:  Math.round(putOI * 0.035),
        putLtp,
        putVolume
      });
    }

    return {
      symbol,
      spotPrice: defaultSpot,
      spotChange: spotChangeFbk,
      spotPctChange: spotPctFbk,
      timestamp: new Date().toISOString(),
      strikes: fallbackStrikes,
      expiryDates,
      selectedExpiry,
      totalCallOI,
      totalPutOI
    };
  }

  /**
   * Called at 9:15 AM IST (market open) to flush all stale pre-market caches.
   * Next OI/spot request will fetch fresh live data from NSE.
   */
  public onMarketOpen(): void {
    // Reset session cookies — NSE rotates them at market open
    this.cookies         = '';
    this.cookieTimestamp = 0;
    // Clear option-chain result cache
    this.cachedChain.clear();
    // Clear spot price cache so first tick fetches live price
    this.spotCache.clear();
    // Refresh USD/INR rate so morning rate is loaded
    usdInrService.refresh().catch(() => {});
    console.log('[NSE] \u2705 Market-open cache reset complete \u2014 cookies, OI chain, and spot cache cleared.');
  }
}

export const nseService = new NseService();
