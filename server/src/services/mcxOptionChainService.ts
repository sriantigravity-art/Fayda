/**
 * MCX Option Chain Service
 *
 * Fetches real option chain OI data for MCX commodities (GOLD, SILVER, CRUDEOIL, NATURALGAS)
 * from MCX India's live market data APIs when Fyers is not connected.
 *
 * Priority:
 *   1. MCX India live option chain API (mcxindia.com/MarketData/GetLiveOptionChain)
 *   2. MCX alternative endpoint (CommonService.svc)
 *   3. Stale cache (returned if all live sources fail)
 *
 * Spot prices come from mcxCommodityService (IBJA → MCX website → Yahoo Finance COMEX).
 * Expiry dates use NseExpiryService as fallback when MCX API does not embed them.
 */

import { IndexSymbol, ALL_SYMBOLS_CONFIG } from '../types.js';
import { mcxCommodityService } from './mcxCommodityService.js';
import { NseExpiryService } from './nseExpiryService.js';
import { GreekEngine } from '../engine/greekEngine.js';

interface RawStrikeSnapshot {
  strikePrice: number;
  callOI: number;
  callOIChangeTotal: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putOIChangeTotal: number;
  putLtp: number;
  putVolume: number;
}

export interface McxOptionChainResult {
  symbol: IndexSymbol;
  spotPrice: number;
  spotChange: number;
  spotPctChange: number;
  strikes: RawStrikeSnapshot[];
  expiryDates: string[];
  selectedExpiry: string;
  totalCallOI: number;
  totalPutOI: number;
}

const CACHE_TTL_MS = 30000; // 30 seconds — MCX data refreshes every 30s during market hours

interface CacheEntry {
  result: McxOptionChainResult;
  ts: number;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// MCX commodity symbols that have listed options
const MCX_OPTION_SYMBOLS = new Set(['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS']);

// Yahoo Finance tickers for spot price fallback (CRUDEOIL, NATURALGAS)
const YAHOO_COMMODITY_MAP: Record<string, { ticker: string; convert: 'USD_CRUDE' | 'USD_GAS' }> = {
  CRUDEOIL:   { ticker: 'CL=F', convert: 'USD_CRUDE' },
  NATURALGAS: { ticker: 'NG=F', convert: 'USD_GAS'   },
};

export class McxOptionChainService {
  private cache: Map<string, CacheEntry> = new Map();
  private usdInrRate: number = 84.5;
  private usdInrTs: number = 0;
  private mcxCookies: string = '';
  private mcxCookieTs: number = 0;

  // ── MCX session cookie warm-up ───────────────────────────────────────────────

  private async ensureMcxCookies(): Promise<string> {
    if (this.mcxCookies && Date.now() - this.mcxCookieTs < 5 * 60 * 1000) return this.mcxCookies;
    try {
      const res = await fetch('https://www.mcxindia.com/market-data/option-chain', {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-IN,en;q=0.9' },
        signal: AbortSignal.timeout(5000)
      });
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (raw.length > 0) {
        this.mcxCookies = raw.map(c => c.split(';')[0]).join('; ');
        this.mcxCookieTs = Date.now();
      }
    } catch { /* MCX cookie warmup is best-effort */ }
    return this.mcxCookies;
  }

  public canHandle(symbol: string): boolean {
    return MCX_OPTION_SYMBOLS.has(symbol);
  }

  // ── USD/INR for CRUDEOIL / NATURALGAS spot conversion ───────────────────────

  private async getUsdInr(): Promise<number> {
    if (Date.now() - this.usdInrTs < 5 * 60 * 1000) return this.usdInrRate;
    try {
      const res = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d',
        { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const d = await res.json() as any;
        const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof p === 'number' && p > 50 && p < 200) {
          this.usdInrRate = p;
          this.usdInrTs   = Date.now();
        }
      }
    } catch { /* keep existing */ }
    return this.usdInrRate;
  }

  // ── Spot price for commodities not covered by mcxCommodityService ────────────

  private async fetchCommoditySpot(symbol: string): Promise<{ spot: number; change: number; pctChange: number } | null> {
    // GOLD/SILVER: use mcxCommodityService (IBJA → MCX → Yahoo COMEX)
    if (symbol === 'GOLD' || symbol === 'SILVER') {
      const q = await mcxCommodityService.fetchSpot(symbol as 'GOLD' | 'SILVER');
      return q ? { spot: q.spot, change: q.change, pctChange: q.pctChange } : null;
    }

    // CRUDEOIL / NATURALGAS: fetch from Yahoo Finance and convert to INR
    const ymap = YAHOO_COMMODITY_MAP[symbol];
    if (!ymap) return null;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ymap.ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return null;

      const data = await res.json() as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

      const priceUsd   = meta.regularMarketPrice;
      const prevClose  = meta.chartPreviousClose || meta.previousClose || priceUsd;
      const rawChange  = priceUsd - prevClose;
      const pctChange  = +(rawChange / Math.max(0.0001, Math.abs(prevClose)) * 100).toFixed(2);
      const usdInr     = await this.getUsdInr();

      let spot: number;
      let change: number;
      if (ymap.convert === 'USD_CRUDE') {
        spot   = Math.round(priceUsd * usdInr);
        change = Math.round(rawChange * usdInr);
      } else {
        // Natural gas: USD/MMBtu → INR/MMBtu
        spot   = +(priceUsd  * usdInr).toFixed(1);
        change = +(rawChange * usdInr).toFixed(1);
      }

      return { spot, change, pctChange };
    } catch {
      return null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  public async fetchOptionChain(symbol: string, expiry?: string): Promise<McxOptionChainResult | null> {
    if (!this.canHandle(symbol)) return null;

    const cacheKey = `${symbol}_${expiry || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.result;

    // Try MCX live API
    const result = await this.fetchFromMcxApi(symbol, expiry);
    if (result && result.strikes.length > 0) {
      this.cache.set(cacheKey, { result, ts: Date.now() });
      this.cache.set(`${symbol}_default`, { result, ts: Date.now() });
      console.log(
        `[MCX-OI] ${symbol}: ${result.strikes.length} strikes, spot ₹${result.spotPrice.toLocaleString('en-IN')} ` +
        `(CE OI: ${result.totalCallOI.toLocaleString()}, PE OI: ${result.totalPutOI.toLocaleString()})`
      );
      return result;
    }

    // Return stale cache if live MCX API fails
    if (cached) return cached.result;

    return null;
  }

  // ── MCX Live API Fetcher ─────────────────────────────────────────────────────

  private async fetchFromMcxApi(symbol: string, expiry?: string): Promise<McxOptionChainResult | null> {
    const cookies = await this.ensureMcxCookies();
    const headers: Record<string, string> = {
      'User-Agent': UA,
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.mcxindia.com/market-data/option-chain',
      'Origin': 'https://www.mcxindia.com',
      'Accept-Language': 'en-IN,en;q=0.9',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };
    if (cookies) headers['Cookie'] = cookies;

    const expiryParam = expiry ? encodeURIComponent(expiry) : '';

    // Try multiple MCX endpoint patterns (MCX updates their internal API paths periodically)
    const endpoints = [
      `https://www.mcxindia.com/MarketData/GetLiveOptionChain?instrumentType=OPTFUT&symbol=${symbol}&strikePrice=0&expiryDate=${expiryParam}`,
      `https://www.mcxindia.com/MarketData/GetLiveOptionChain?instrumentType=OPTFUT&symbol=${symbol}&expiryDate=${expiryParam}`,
      `https://www.mcxindia.com/api/market-data/option-chain?symbol=${symbol}&instrumentType=OPTFUT&expiryDate=${expiryParam}`,
      `https://www.mcxindia.com/CommonService.svc/GetOptionChainData?symbol=${symbol}&instrumentType=OPTFUT&expiryDate=${expiryParam}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
        if (!res.ok) {
          console.warn(`[MCX-OI] ${symbol} HTTP ${res.status} from ${url}`);
          continue;
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) {
          console.warn(`[MCX-OI] ${symbol} non-JSON content-type: ${ct} from ${url}`);
          continue;
        }
        const json = await res.json() as any;
        const parsed = await this.parseMcxResponse(symbol, json, expiry);
        if (parsed && parsed.strikes.length > 0) return parsed;
      } catch (err: any) {
        console.warn(`[MCX-OI] ${symbol} fetch error from ${url}: ${err.message}`);
      }
    }
    console.warn(`[MCX-OI] ${symbol}: all API endpoints failed — falling back to synthetic OI`);
    return null;
  }

  // ── MCX Response Parser ──────────────────────────────────────────────────────

  private async parseMcxResponse(
    symbol: string,
    json: any,
    requestedExpiry?: string
  ): Promise<McxOptionChainResult | null> {
    try {
      const rows: any[] = json?.Data || json?.data || json?.Result || json?.result ||
        json?.OptionChain || (Array.isArray(json) ? json : []);
      if (!rows || rows.length === 0) return null;

      // ── Extract expiry dates ────────────────────────────────────────────────
      const expirySet = new Set<string>();
      for (const row of rows) {
        const exp = row.ExpiryDate || row.expiryDate || row.Expiry || row.expiry || '';
        if (exp) expirySet.add(String(exp).trim());
      }

      // Fall back to NseExpiryService computed expiries if API doesn't embed them
      let expiryDates = Array.from(expirySet).sort();
      if (expiryDates.length === 0) {
        expiryDates = NseExpiryService.getUpcomingExpiries(symbol, 4);
      }
      const selectedExpiry =
        requestedExpiry && expiryDates.includes(requestedExpiry)
          ? requestedExpiry
          : expiryDates[0] || '';

      // ── Spot price ─────────────────────────────────────────────────────────
      // Try from API response first, then mcxCommodityService / Yahoo Finance
      let spotPrice  = +(json?.UnderlyingValue || json?.SpotValue || json?.spotPrice || json?.Spot || 0);
      let spotChange = 0;
      let spotPctChange = 0;

      if (!spotPrice || spotPrice <= 0) {
        const commoditySpot = await this.fetchCommoditySpot(symbol);
        if (commoditySpot) {
          spotPrice     = commoditySpot.spot;
          spotChange    = commoditySpot.change;
          spotPctChange = commoditySpot.pctChange;
        }
      }

      // ── Parse strike rows ──────────────────────────────────────────────────
      const strikeMap = new Map<number, RawStrikeSnapshot>();
      let totalCallOI = 0;
      let totalPutOI  = 0;

      for (const row of rows) {
        const rowExpiry = (row.ExpiryDate || row.expiryDate || row.Expiry || row.expiry || '').trim();
        if (selectedExpiry && rowExpiry && rowExpiry !== selectedExpiry) continue;

        const sp = +(row.StrikePrice || row.strikePrice || row.Strike || row.strike || 0);
        if (!sp || sp <= 0) continue;

        if (!strikeMap.has(sp)) {
          strikeMap.set(sp, {
            strikePrice:     sp,
            callOI: 0, callOIChangeTotal: 0, callLtp: 0, callVolume: 0,
            putOI:  0, putOIChangeTotal:  0, putLtp:  0, putVolume:  0,
          });
        }
        const entry = strikeMap.get(sp)!;

        // ── Format A: combined row (CE + PE fields in same object) ──────────
        const callOI = +(row.CE_OpenInterest || row.CE_OI || row.CallOI || row.Call_OI || 0);
        const putOI  = +(row.PE_OpenInterest || row.PE_OI || row.PutOI  || row.Put_OI  || 0);

        if (callOI > 0 || +(row.CE_LTP || row.CallLTP || row.Call_LTP || 0) > 0) {
          entry.callOI            = callOI;
          entry.callLtp           = +(row.CE_LTP || row.CallLTP || row.Call_LTP || 0);
          entry.callVolume        = +(row.CE_Volume || row.CallVolume || row.Call_Volume || 0);
          entry.callOIChangeTotal = +(row.CE_OIChange || row.CallOIChange || row.CE_ChangeInOI || 0);
          totalCallOI += callOI;
        }
        if (putOI > 0 || +(row.PE_LTP || row.PutLTP || row.Put_LTP || 0) > 0) {
          entry.putOI            = putOI;
          entry.putLtp           = +(row.PE_LTP || row.PutLTP || row.Put_LTP || 0);
          entry.putVolume        = +(row.PE_Volume || row.PutVolume || row.Put_Volume || 0);
          entry.putOIChangeTotal = +(row.PE_OIChange || row.PutOIChange || row.PE_ChangeInOI || 0);
          totalPutOI += putOI;
        }

        // ── Format B: separate rows (OptionType / CP_Flag / OptionFlag field) ─
        const optType = (
          row.OptionType || row.optionType || row.CP_Flag || row.OptionFlag ||
          row.option_type || row.Type || ''
        ).toUpperCase().trim();

        if (optType === 'CE' || optType === 'C' || optType === 'CALL') {
          entry.callOI            = +(row.OpenInterest || row.OI || row.CurrentOI || row.Oi || 0);
          entry.callLtp           = +(row.LTP || row.LastPrice || row.Ltp || row.Close || 0);
          entry.callVolume        = +(row.Volume || row.TotalVolume || row.TrdVolume || row.vol || 0);
          entry.callOIChangeTotal = +(row.OIChange || row.ChangeInOI || row.ChngInOI || 0);
          totalCallOI += entry.callOI;
        } else if (optType === 'PE' || optType === 'P' || optType === 'PUT') {
          entry.putOI            = +(row.OpenInterest || row.OI || row.CurrentOI || row.Oi || 0);
          entry.putLtp           = +(row.LTP || row.LastPrice || row.Ltp || row.Close || 0);
          entry.putVolume        = +(row.Volume || row.TotalVolume || row.TrdVolume || row.vol || 0);
          entry.putOIChangeTotal = +(row.OIChange || row.ChangeInOI || row.ChngInOI || 0);
          totalPutOI += entry.putOI;
        }
      }

      const strikes = Array.from(strikeMap.values())
        .filter(s => s.callOI > 0 || s.putOI > 0 || s.callLtp > 0 || s.putLtp > 0)
        .sort((a, b) => a.strikePrice - b.strikePrice);

      if (strikes.length === 0) return null;

      return {
        symbol,
        spotPrice,
        spotChange,
        spotPctChange,
        strikes,
        expiryDates,
        selectedExpiry,
        totalCallOI,
        totalPutOI,
      };
    } catch (err: any) {
      console.warn(`[MCX-OI] Parse error for ${symbol}:`, err.message);
      return null;
    }
  }
}

export const mcxOptionChainService = new McxOptionChainService();
