import { GlobalIndexItem } from '../types';

interface InstrumentConfig {
  id: string;
  symbol: string;        // Yahoo Finance ticker (primary for non-Indian; fallback for Indian)
  name: string;
  country: string;
  flag: string;
  region: 'US' | 'ASIA' | 'EUROPE' | 'COMMODITIES' | 'CURRENCY' | 'YIELDS';
  isGiftNifty?: boolean;
  isCrude?: boolean;
  isYield?: boolean;
  isVix?: boolean;
  /**
   * true → try NSE India allIndices API first; fall back to Yahoo Finance (symbol) on failure.
   * The `nseIndexName` must match the `indexName` field returned by NSE's allIndices API.
   */
  isIndianMarket?: boolean;
  nseIndexName?: string;  // e.g. 'Nifty 50'
  notes: string;
  defaultPrice: number;
  defaultChange: number;
  defaultPct: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'GIFT_NIFTY',
    symbol: '^NSEI',         // Yahoo Finance fallback (Nifty 50 spot + ~32.5 pt premium)
    name: 'GIFT Nifty',
    country: 'India / Singapore',
    flag: '🇮🇳',
    region: 'ASIA',
    isGiftNifty: true,
    isIndianMarket: true,
    nseIndexName: 'NIFTY 50', // NSE allIndices key → used as proxy for GIFT Nifty
    notes: 'NSE IX Gandhinagar (+32 pts premium over Spot)',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'INDIA_VIX',
    symbol: '^INDIAVIX',     // Yahoo Finance fallback for India VIX
    name: 'India VIX',
    country: 'India',
    flag: '⚡',
    region: 'ASIA',
    isVix: true,
    isIndianMarket: true,
    nseIndexName: 'INDIA VIX', // NSE allIndices key
    notes: 'NSE India Volatility Index — fear gauge for Nifty options',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'NASDAQ_100',
    symbol: '^NDX',
    name: 'Nasdaq 100',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'Tech heavy benchmark lead for Indian IT',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'SPX_500',
    symbol: '^GSPC',
    name: 'S&P 500',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'US broad market strength near historic highs',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'DOW_JONES',
    symbol: '^DJI',
    name: 'Dow Jones 30',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'Wall Street bluechip industrial momentum',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'NIKKEI_225',
    symbol: '^N225',
    name: 'Nikkei 225',
    country: 'Japan',
    flag: '🇯🇵',
    region: 'ASIA',
    notes: 'Tokyo Stock Exchange benchmark',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'HANG_SENG',
    symbol: '^HSI',
    name: 'Hang Seng',
    country: 'Hong Kong',
    flag: '🇭🇰',
    region: 'ASIA',
    notes: 'Hong Kong Hang Seng Index',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'SHANGHAI_COMP',
    symbol: '000001.SS',
    name: 'Shanghai Composite',
    country: 'China',
    flag: '🇨🇳',
    region: 'ASIA',
    notes: 'China mainland composite index',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'DAX_40',
    symbol: '^GDAXI',
    name: 'DAX 40',
    country: 'Germany',
    flag: '🇩🇪',
    region: 'EUROPE',
    notes: 'Frankfurt German industrial benchmark',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'FTSE_100',
    symbol: '^FTSE',
    name: 'FTSE 100',
    country: 'United Kingdom',
    flag: '🇬🇧',
    region: 'EUROPE',
    notes: 'London Stock Exchange bluechips',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'BRENT_CRUDE',
    symbol: 'BZ=F',
    name: 'Brent Crude Oil',
    country: 'Global Benchmark',
    flag: '🛢️',
    region: 'COMMODITIES',
    isCrude: true,
    notes: 'Cooling crude prices benefit Indian fiscal & OMCs',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'GOLD_USD',
    symbol: 'GC=F',
    name: 'Spot Gold (XAU/USD)',
    country: 'Global Benchmark',
    flag: '🪙',
    region: 'COMMODITIES',
    notes: 'Safe haven bullion benchmark',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'USD_INR',
    symbol: 'INR=X',
    name: 'USD / INR Forex',
    country: 'India Forex',
    flag: '💵',
    region: 'CURRENCY',
    notes: 'Rupee forex rate vs US Dollar',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'US_10Y_YIELD',
    symbol: '^TNX',
    name: 'US 10-Yr Treasury',
    country: 'United States',
    flag: '📈',
    region: 'YIELDS',
    isYield: true,
    notes: 'Falling US yields trigger FII inflows into India',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  },
  {
    id: 'CBOE_VIX',
    symbol: '^VIX',
    name: 'CBOE US VIX',
    country: 'United States',
    flag: '⚡',
    region: 'US',
    isVix: true,
    notes: 'Low global volatility supports equity bulls',
    defaultPrice: 0, defaultChange: 0, defaultPct: 0
  }
];

// ─── NSE India allIndices API ─────────────────────────────────────────────────
const NSE_ALL_INDICES_URL = 'https://www.nseindia.com/api/allIndices';
const NSE_HOME_URL        = 'https://www.nseindia.com';
const USER_AGENT          = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export class GlobalIndicesService {
  private static instance: GlobalIndicesService;
  private indices: GlobalIndexItem[] = [];
  private pollTimer: NodeJS.Timeout | null = null;
  private isFetching = false;

  // NSE session cookies (refreshed every 5 min)
  private nseCookies: string = '';
  private nseCookieTs: number = 0;
  private isRefreshingNseCookies = false;

  // Cache of NSE allIndices data (15 s TTL)
  private nseIndicesCache: { data: Record<string, { price: number; change: number; pctChange: number }>; ts: number } | null = null;

  private constructor() {
    this.initDefaultIndices();
    this.fetchAllRealQuotes();
    // Refresh live quotes from global exchanges every 15 seconds
    this.pollTimer = setInterval(() => {
      this.fetchAllRealQuotes();
    }, 15000);
  }

  public static getInstance(): GlobalIndicesService {
    if (!GlobalIndicesService.instance) {
      GlobalIndicesService.instance = new GlobalIndicesService();
    }
    return GlobalIndicesService.instance;
  }

  private initDefaultIndices() {
    const now = new Date().toISOString();
    this.indices = INSTRUMENTS.map(item => ({
      id: item.id,
      name: item.name,
      country: item.country,
      flag: item.flag,
      region: item.region,
      price: item.defaultPrice,
      change: item.defaultChange,
      pctChange: item.defaultPct,
      status: 'OPEN',
      lastUpdated: now,
      impactOnIndia: this.calculateImpact(item.defaultPct, item),
      notes: item.notes
    }));
  }

  private calculateImpact(pctChange: number, cfg: InstrumentConfig): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (cfg.isCrude) {
      // Lower crude is positive for India
      return pctChange < -0.2 ? 'POSITIVE' : pctChange > 0.4 ? 'NEGATIVE' : 'NEUTRAL';
    }
    if (cfg.isYield || cfg.isVix) {
      // Lower yields and lower VIX is positive for India
      return pctChange < -0.2 ? 'POSITIVE' : pctChange > 0.4 ? 'NEGATIVE' : 'NEUTRAL';
    }
    // Equities: positive when up
    return pctChange > 0.1 ? 'POSITIVE' : pctChange < -0.1 ? 'NEGATIVE' : 'NEUTRAL';
  }

  // ─── NSE cookie refresh ─────────────────────────────────────────────────────

  private async ensureNseCookies(): Promise<string> {
    if (this.nseCookies && Date.now() - this.nseCookieTs < 5 * 60 * 1000) return this.nseCookies;
    if (this.isRefreshingNseCookies) return this.nseCookies;
    this.isRefreshingNseCookies = true;
    try {
      const res = await fetch(NSE_HOME_URL, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(4000)
      });
      const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      this.nseCookies = rawCookies.map((c: string) => c.split(';')[0]).join('; ');
      this.nseCookieTs = Date.now();
    } catch {
      // Keep existing cookies
    } finally {
      this.isRefreshingNseCookies = false;
    }
    return this.nseCookies;
  }

  /**
   * Fetches NSE allIndices and returns a map of indexName → { price, change, pctChange }.
   * Result is cached for 15 seconds.
   * Returns null if NSE is unreachable or returns invalid data.
   */
  private async fetchNseAllIndices(): Promise<Record<string, { price: number; change: number; pctChange: number }> | null> {
    if (this.nseIndicesCache && Date.now() - this.nseIndicesCache.ts < 15000) {
      return this.nseIndicesCache.data;
    }
    try {
      const cookies = await this.ensureNseCookies();
      const res = await fetch(NSE_ALL_INDICES_URL, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.nseindia.com/',
          'Cookie': cookies
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        console.warn('[GlobalIndicesService] NSE allIndices returned HTTP', res.status, '— using Yahoo Finance fallback for Indian market');
        return null;
      }

      const json = (await res.json()) as any;
      const list: any[] = json?.data || [];
      if (!list.length) return null;

      const result: Record<string, { price: number; change: number; pctChange: number }> = {};
      for (const entry of list) {
        const name: string = entry.indexSymbol || entry.index || '';
        const price  = typeof entry.last      === 'number' ? entry.last      :
                       typeof entry.lastPrice === 'number' ? entry.lastPrice : NaN;
        const change = typeof entry.variation  === 'number' ? entry.variation :
                       typeof entry.change     === 'number' ? entry.change    : 0;
        const pctChange = typeof entry.percentChange === 'number' ? +entry.percentChange.toFixed(2)
                        : (price && change ? +(change / (price - change) * 100).toFixed(2) : 0);
        if (name && !isNaN(price) && price > 0) {
          result[name] = { price: +price.toFixed(2), change: +change.toFixed(2), pctChange };
        }
      }

      this.nseIndicesCache = { data: result, ts: Date.now() };
      console.log(`[GlobalIndicesService] NSE allIndices OK — ${Object.keys(result).length} indices loaded`);
      return result;
    } catch (err: any) {
      console.warn('[GlobalIndicesService] NSE allIndices fetch failed:', err.message, '— using Yahoo Finance fallback for Indian market');
      return null;
    }
  }

  /**
   * Fetches a single quote from Yahoo Finance for the given symbol.
   * Returns null on failure.
   */
  private async fetchYahooQuote(symbol: string): Promise<{ price: number; prevClose: number; isMarketOpen: boolean } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
      const isMarketOpen = meta.currentTradingPeriod?.regular?.start && meta.currentTradingPeriod?.regular?.end
        ? (Date.now() / 1000 >= meta.currentTradingPeriod.regular.start && Date.now() / 1000 <= meta.currentTradingPeriod.regular.end)
        : true;
      return {
        price: meta.regularMarketPrice,
        prevClose: meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice,
        isMarketOpen
      };
    } catch {
      return null;
    }
  }

  public async fetchAllRealQuotes() {
    if (this.isFetching) return;
    this.isFetching = true;

    // Pre-fetch NSE allIndices once for all Indian market entries in this batch
    const nseData = await this.fetchNseAllIndices();

    try {
      const updatedList: GlobalIndexItem[] = [];

      for (const cfg of INSTRUMENTS) {
        try {
          let price: number | null = null;
          let change: number | null = null;
          let pctChange: number | null = null;
          let isMarketOpen = true;
          let sourceUsed: 'NSE' | 'YAHOO' = 'YAHOO';

          // ── Indian market entries: try NSE first, Yahoo Finance as fallback ──
          if (cfg.isIndianMarket && cfg.nseIndexName && nseData) {
            const nseEntry = nseData[cfg.nseIndexName];
            if (nseEntry && nseEntry.price > 0) {
              price     = nseEntry.price;
              change    = nseEntry.change;
              pctChange = nseEntry.pctChange;
              // GIFT Nifty: add futures premium over underlying Nifty 50 spot
              if (cfg.isGiftNifty) {
                price  = +(price  + 32.5).toFixed(1);
                change = +(change + 0).toFixed(2); // premium is fixed, change stays same
              }
              sourceUsed = 'NSE';
              // Determine market open status via IST time (NSE: 09:15–15:30 IST = UTC+05:30)
              const istMin = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 330) % 1440;
              isMarketOpen = istMin >= 555 && istMin <= 930; // 09:15–15:30 IST
            } else {
              console.warn(`[GlobalIndicesService] NSE data missing for "${cfg.nseIndexName}" — falling back to Yahoo Finance (${cfg.symbol})`);
            }
          }

          // ── Yahoo Finance (primary for non-Indian; fallback for Indian) ──
          if (price === null) {
            const yahoo = await this.fetchYahooQuote(cfg.symbol);
            if (yahoo) {
              price        = yahoo.price;
              isMarketOpen = yahoo.isMarketOpen;
              sourceUsed   = 'YAHOO';

              // GIFT Nifty: add ~32.5 pt futures premium over Nifty 50 spot (^NSEI)
              if (cfg.isGiftNifty) {
                price = +(price + 32.5).toFixed(1);
                const prevClose = +(yahoo.prevClose + 32.5).toFixed(1);
                change    = +(price - prevClose).toFixed(2);
                pctChange = +(((price - prevClose) / (prevClose || 1)) * 100).toFixed(2);
              } else {
                change    = +(price - yahoo.prevClose).toFixed(2);
                pctChange = +(((price - yahoo.prevClose) / (yahoo.prevClose || 1)) * 100).toFixed(2);
              }
            }
          }

          if (price !== null && change !== null && pctChange !== null) {
            updatedList.push({
              id: cfg.id,
              name: cfg.name,
              country: cfg.country,
              flag: cfg.flag,
              region: cfg.region,
              price: +(price).toFixed(cfg.isYield || cfg.region === 'CURRENCY' || cfg.isCrude ? 2 : 1),
              change,
              pctChange,
              status: isMarketOpen ? 'OPEN' : 'CLOSED',
              lastUpdated: new Date().toISOString(),
              impactOnIndia: this.calculateImpact(pctChange, cfg),
              notes: cfg.isIndianMarket
                ? `${cfg.notes} [src: ${sourceUsed}]`
                : cfg.notes
            });
            continue;
          }
        } catch (itemErr: any) {
          console.warn(`[GlobalIndicesService] Error fetching ${cfg.id}:`, itemErr.message);
        }

        // Final fallback: keep last known good value from memory cache
        const existing = this.indices.find(i => i.id === cfg.id);
        if (existing) {
          updatedList.push(existing);
        }
      }

      if (updatedList.length > 0) {
        this.indices = updatedList;
        if (this.onUpdateCallback) {
          try {
            this.onUpdateCallback(this.indices);
          } catch {}
        }
      }
    } catch (err) {
      console.error('[GlobalIndicesService] Quote fetch error:', err);
    } finally {
      this.isFetching = false;
    }
  }

  private onUpdateCallback: ((indices: GlobalIndexItem[]) => void) | null = null;

  public setCallback(cb: (indices: GlobalIndexItem[]) => void) {
    this.onUpdateCallback = cb;
  }

  public getIndices(): GlobalIndexItem[] {
    return this.indices;
  }

  public async getSpotForSymbol(symbol: string): Promise<{ spot: number; change: number; pctChange: number } | null> {
    const nseData = await this.fetchNseAllIndices();
    if (nseData) {
      const MAP: Record<string, string[]> = {
        NIFTY: ['NIFTY 50', 'NIFTY 50 TRI', 'Nifty 50'],
        BANKNIFTY: ['NIFTY BANK', 'Nifty Bank'],
        FINNIFTY: ['NIFTY FINANCIAL SERVICES', 'Nifty Financial Services'],
        MIDCPNIFTY: ['NIFTY MIDCAP 50', 'NIFTY MIDCAP SELECT', 'NIFTY MID SELECT', 'Nifty Midcap 50'],
        NIFTYNXT50: ['NIFTY NEXT 50', 'Nifty Next 50'],
        INDIA_VIX: ['INDIA VIX', 'India VIX']
      };
      const keys = MAP[symbol];
      if (keys) {
        for (const k of keys) {
          const entry = nseData[k];
          if (entry && entry.price > 0) {
            return { spot: entry.price, change: entry.change, pctChange: entry.pctChange };
          }
        }
      }
    }

    const item = this.indices.find(i => i.id === symbol || i.id.replace('_', '') === symbol.replace('_', ''));
    if (item && item.price > 0) {
      return { spot: item.price, change: item.change, pctChange: item.pctChange };
    }

    return null;
  }
}

export const globalIndicesService = GlobalIndicesService.getInstance();
