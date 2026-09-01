import { fyersService } from './fyersService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Persistent disk cache — stores last successful Yahoo quote for every symbol.
// server/src/services/ → ../../ = server/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUOTES_CACHE_PATH = path.join(__dirname, '../../', 'globalQuotesCache.json');
const INSTRUMENTS = [
    {
        id: 'GIFT_NIFTY',
        symbol: '^NSEI',
        name: 'GIFT Nifty',
        country: 'India / Singapore',
        flag: '🇮🇳',
        region: 'ASIA',
        isGiftNifty: true,
        isIndianMarket: true,
        nseIndexName: 'NIFTY 50',
        notes: 'NSE IX Gandhinagar (+32 pts premium over Spot)',
        defaultPrice: 0, defaultChange: 0, defaultPct: 0
    },
    {
        id: 'INDIA_VIX',
        symbol: '^INDIAVIX',
        name: 'India VIX',
        country: 'India',
        flag: '⚡',
        region: 'ASIA',
        isVix: true,
        isIndianMarket: true,
        nseIndexName: 'INDIA VIX',
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
const NSE_HOME_URL = 'https://www.nseindia.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
export class GlobalIndicesService {
    static instance;
    indices = [];
    pollTimer = null;
    isFetching = false;
    // NSE session cookies (refreshed every 5 min)
    nseCookies = '';
    nseCookieTs = 0;
    isRefreshingNseCookies = false;
    // Cache of NSE allIndices data (15 s TTL)
    nseIndicesCache = null;
    // In-memory Yahoo batch quote cache (symbol → quote). Written to disk on every success.
    yahooQuoteCache = new Map();
    marketOpenTimer = null;
    constructor() {
        this.loadDiskCache(); // ←─ populate yahooQuoteCache from last run immediately
        this.initDefaultIndices();
        this.fetchAllRealQuotes();
        // Refresh live quotes from global exchanges every 15 seconds
        this.pollTimer = setInterval(() => {
            this.fetchAllRealQuotes();
        }, 15000);
        // Schedule automatic cache clear at market open (9:15 AM IST daily)
        this.scheduleMarketOpenReset();
    }
    static getInstance() {
        if (!GlobalIndicesService.instance) {
            GlobalIndicesService.instance = new GlobalIndicesService();
        }
        return GlobalIndicesService.instance;
    }
    /** Callback fired when market opens — server index.ts wires this to broadcast MARKET_OPEN */
    onMarketOpen = null;
    /**
     * Clears all stale caches (Yahoo in-memory, NSE allIndices, disk cache).
     * Called automatically at 9:15 AM IST and also exposed for manual use.
     */
    clearAllCaches() {
        console.log('[GlobalIndicesService] 🔔 Market open reset — clearing all stale caches...');
        this.yahooQuoteCache.clear();
        this.nseIndicesCache = null;
        // Delete disk cache so we don't re-serve yesterday's data after a restart today
        try {
            if (fs.existsSync(QUOTES_CACHE_PATH)) {
                fs.unlinkSync(QUOTES_CACHE_PATH);
                console.log('[GlobalIndicesService] ✅ Disk cache cleared.');
            }
        }
        catch (err) {
            console.warn('[GlobalIndicesService] Could not delete disk cache:', err.message);
        }
        // Force an immediate re-fetch with fresh live data
        this.fetchAllRealQuotes().then(() => {
            console.log('[GlobalIndicesService] ✅ Fresh market-open quotes loaded.');
            this.onMarketOpen?.();
        });
    }
    /**
     * Schedules the automatic daily cache clear at 9:15 AM IST (NSE market open).
     * Recursively reschedules itself so it fires every day without manual intervention.
     */
    scheduleMarketOpenReset() {
        if (this.marketOpenTimer)
            clearTimeout(this.marketOpenTimer);
        const msUntilOpen = this.msUntilMarketOpen();
        const minutesUntil = Math.round(msUntilOpen / 60000);
        console.log(`[GlobalIndicesService] Market-open cache reset scheduled in ${minutesUntil} minutes (9:15 AM IST)`);
        this.marketOpenTimer = setTimeout(() => {
            this.clearAllCaches();
            // Reschedule for next day's 9:15 AM IST
            this.scheduleMarketOpenReset();
        }, msUntilOpen);
    }
    /** Returns milliseconds until the next 9:15 AM IST market open. */
    msUntilMarketOpen() {
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const ist = new Date(utcMs + 3600000 * 5.5); // current IST time
        const next915 = new Date(ist);
        next915.setHours(9, 15, 0, 0); // 9:15:00 AM IST
        if (ist >= next915)
            next915.setDate(next915.getDate() + 1); // already past today → tomorrow
        // Convert next915 (IST) back to UTC ms
        const next915Utc = next915.getTime() - 3600000 * 5.5;
        return Math.max(next915Utc - Date.now(), 5000); // minimum 5 s
    }
    initDefaultIndices() {
        const now = new Date().toISOString();
        this.indices = INSTRUMENTS.map(item => {
            // Use disk-cached quote if available (real last-close data from a previous run)
            const cached = this.yahooQuoteCache.get(item.symbol);
            const price = cached ? cached.price : item.defaultPrice;
            const change = cached ? cached.change : item.defaultChange;
            const pctChange = cached ? cached.pctChange : item.defaultPct;
            const isStale = !cached; // No disk cache → using built-in defaults
            let adjustedPrice = price;
            let adjustedChange = change;
            if (item.isGiftNifty && price > 0) {
                adjustedPrice = +(price + 32.5).toFixed(1);
                adjustedChange = +(change + 0).toFixed(2);
            }
            return {
                id: item.id,
                name: item.name,
                country: item.country,
                flag: item.flag,
                region: item.region,
                price: adjustedPrice,
                change: adjustedChange,
                pctChange,
                status: 'CLOSED',
                lastUpdated: now,
                impactOnIndia: this.calculateImpact(pctChange, item),
                notes: isStale
                    ? `${item.notes} [loading…]`
                    : `${item.notes} [last close]`
            };
        });
    }
    calculateImpact(pctChange, cfg) {
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
    async ensureNseCookies() {
        if (this.nseCookies && Date.now() - this.nseCookieTs < 5 * 60 * 1000)
            return this.nseCookies;
        if (this.isRefreshingNseCookies)
            return this.nseCookies;
        this.isRefreshingNseCookies = true;
        try {
            const res = await fetch(NSE_HOME_URL, {
                headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
                signal: AbortSignal.timeout(6000)
            });
            const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
            this.nseCookies = rawCookies.map((c) => c.split(';')[0]).join('; ');
            this.nseCookieTs = Date.now();
        }
        catch {
            // Keep existing cookies
        }
        finally {
            this.isRefreshingNseCookies = false;
        }
        return this.nseCookies;
    }
    /**
     * Fetches NSE allIndices and returns a map of indexName → { price, change, pctChange }.
     * Result is cached for 15 seconds.
     * Returns null if NSE is unreachable or returns invalid data.
     */
    async fetchNseAllIndices() {
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
                signal: AbortSignal.timeout(10000)
            });
            if (!res.ok) {
                console.warn('[GlobalIndicesService] NSE allIndices returned HTTP', res.status, '— using Yahoo Finance fallback for Indian market');
                return null;
            }
            const json = (await res.json());
            const list = json?.data || [];
            if (!list.length)
                return null;
            const result = {};
            for (const entry of list) {
                const name = entry.indexSymbol || entry.index || '';
                const price = typeof entry.last === 'number' ? entry.last :
                    typeof entry.lastPrice === 'number' ? entry.lastPrice : NaN;
                const change = typeof entry.variation === 'number' ? entry.variation :
                    typeof entry.change === 'number' ? entry.change : 0;
                const pctChange = typeof entry.percentChange === 'number' ? +entry.percentChange.toFixed(2)
                    : (price && change ? +(change / (price - change) * 100).toFixed(2) : 0);
                if (name && !isNaN(price) && price > 0) {
                    result[name] = { price: +price.toFixed(2), change: +change.toFixed(2), pctChange };
                }
            }
            this.nseIndicesCache = { data: result, ts: Date.now() };
            console.log(`[GlobalIndicesService] NSE allIndices OK — ${Object.keys(result).length} indices loaded`);
            return result;
        }
        catch (err) {
            console.warn('[GlobalIndicesService] NSE allIndices fetch failed:', err.message, '— using Yahoo Finance fallback for Indian market');
            return null;
        }
    }
    // ── Disk cache helpers ───────────────────────────────────────────────────────────
    loadDiskCache() {
        try {
            if (fs.existsSync(QUOTES_CACHE_PATH)) {
                const raw = JSON.parse(fs.readFileSync(QUOTES_CACHE_PATH, 'utf-8'));
                for (const [symbol, quote] of Object.entries(raw)) {
                    if (quote && typeof quote.price === 'number' && quote.price > 0) {
                        this.yahooQuoteCache.set(symbol, quote);
                    }
                }
                console.log(`[GlobalIndicesService] Loaded ${this.yahooQuoteCache.size} cached quotes from disk (last-close data)`);
            }
        }
        catch (err) {
            console.warn('[GlobalIndicesService] Could not load disk cache:', err.message);
        }
    }
    saveDiskCache() {
        try {
            const obj = {};
            for (const [sym, q] of this.yahooQuoteCache.entries())
                obj[sym] = q;
            fs.writeFileSync(QUOTES_CACHE_PATH, JSON.stringify(obj, null, 2));
        }
        catch { /* non-critical */ }
    }
    // ── Yahoo Finance BATCH fetch (one request for all symbols) ─────────────────────
    /**
     * Fetches all non-NSE Yahoo Finance quotes in a single HTTP request.
     * Uses Yahoo Finance v7/finance/quote?symbols=... batch endpoint.
     * On success, updates in-memory cache AND writes to disk.
     * On failure, existing cache continues to serve last-known-good values.
     */
    async fetchAllYahooQuotesBatch(symbols) {
        const result = new Map();
        if (symbols.length === 0)
            return result;
        // Yahoo v8/finance/chart works without auth. Fetch all concurrently (no rate limit issues for ~15 symbols).
        const fetches = symbols.map(async (sym) => {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(8000)
                });
                if (!res.ok)
                    return { sym, data: null };
                const json = await res.json();
                return { sym, data: json };
            }
            catch {
                return { sym, data: null };
            }
        });
        const results = await Promise.allSettled(fetches);
        let updated = 0;
        for (const settled of results) {
            if (settled.status !== 'fulfilled' || !settled.value?.data)
                continue;
            const { sym, data } = settled.value;
            const meta = data?.chart?.result?.[0]?.meta;
            if (!meta || typeof meta.regularMarketPrice !== 'number')
                continue;
            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
            const change = +(price - prevClose).toFixed(2);
            const pctChange = prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0;
            const isOpen = meta.currentTradingPeriod?.regular
                ? (Date.now() / 1000 >= meta.currentTradingPeriod.regular.start &&
                    Date.now() / 1000 <= meta.currentTradingPeriod.regular.end)
                : false;
            if (price > 0) {
                const entry = { price, prevClose, change, pctChange, isMarketOpen: isOpen, ts: Date.now() };
                result.set(sym, entry);
                this.yahooQuoteCache.set(sym, entry);
                updated++;
            }
        }
        if (updated > 0) {
            console.log(`[GlobalIndicesService] Yahoo v8 batch OK — ${updated}/${symbols.length} quotes fetched`);
            this.saveDiskCache();
        }
        else {
            console.warn(`[GlobalIndicesService] Yahoo v8 batch: 0 quotes fetched. Using existing cache (${this.yahooQuoteCache.size} entries).`);
            // Return stale cache so UI always has data
            for (const sym of symbols) {
                const cached = this.yahooQuoteCache.get(sym);
                if (cached)
                    result.set(sym, cached);
            }
        }
        return result;
    }
    /**
     * @deprecated Use fetchAllYahooQuotesBatch() instead. Kept for getSpotForSymbol fallback.
     */
    async fetchYahooQuote(symbol) {
        // Check in-memory cache first (populated by batch fetch)
        const cached = this.yahooQuoteCache.get(symbol);
        if (cached && Date.now() - cached.ts < 30000) {
            return { price: cached.price, prevClose: cached.prevClose, isMarketOpen: cached.isMarketOpen };
        }
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
            const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) });
            if (!res.ok)
                return cached ? { price: cached.price, prevClose: cached.prevClose, isMarketOpen: false } : null;
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            if (!meta || typeof meta.regularMarketPrice !== 'number')
                return cached ? { price: cached.price, prevClose: cached.prevClose, isMarketOpen: false } : null;
            const isMarketOpen = meta.currentTradingPeriod?.regular
                ? (Date.now() / 1000 >= meta.currentTradingPeriod.regular.start && Date.now() / 1000 <= meta.currentTradingPeriod.regular.end)
                : true;
            return { price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice, isMarketOpen };
        }
        catch {
            return cached ? { price: cached.price, prevClose: cached.prevClose, isMarketOpen: false } : null;
        }
    }
    async fetchAllRealQuotes() {
        if (this.isFetching)
            return;
        this.isFetching = true;
        // Pre-fetch NSE allIndices once for all Indian market entries in this batch
        const nseData = await this.fetchNseAllIndices();
        // Pre-fetch ALL Yahoo Finance symbols in one batch request
        const yahooSymbols = INSTRUMENTS
            .filter(cfg => !cfg.isIndianMarket) // Indian ones use NSE/Fyers first
            .map(cfg => cfg.symbol);
        // Also include Yahoo fallback symbols for Indian instruments
        const indianYahooFallbacks = INSTRUMENTS
            .filter(cfg => cfg.isIndianMarket)
            .map(cfg => cfg.symbol);
        const allYahooSymbols = [...yahooSymbols, ...indianYahooFallbacks];
        const yahooQuotes = await this.fetchAllYahooQuotesBatch(allYahooSymbols);
        try {
            const updatedList = [];
            for (const cfg of INSTRUMENTS) {
                try {
                    let price = null;
                    let change = null;
                    let pctChange = null;
                    let isMarketOpen = false;
                    let sourceUsed = 'YAHOO';
                    // ── Step 1: Fyers Live (Indian indices & commodities when connected) ──
                    if (cfg.isIndianMarket) {
                        const FYERS_MAP = {
                            NIFTY_50: 'NSE:NIFTY50-INDEX',
                            NIFTY: 'NSE:NIFTY50-INDEX',
                            GIFT_NIFTY: 'NSE:NIFTY50-INDEX',
                            NIFTY_BANK: 'NSE:NIFTYBANK-INDEX',
                            BANKNIFTY: 'NSE:NIFTYBANK-INDEX',
                            FINNIFTY: 'NSE:FINNIFTY-INDEX',
                            MIDCPNIFTY: 'NSE:MIDCPNIFTY-INDEX',
                            SENSEX: 'BSE:SENSEX-INDEX',
                            BANKEX: 'BSE:BANKEX-INDEX',
                            INDIA_VIX: 'NSE:INDIAVIX-INDEX',
                            CRUDE_OIL: 'MCX:CRUDEOIL26SEPFUT',
                            NATURAL_GAS: 'MCX:NATURALGAS26SEPFUT',
                            GOLD: 'MCX:GOLD26OCTFUT',
                            SILVER: 'MCX:SILVER26DECFUT'
                        };
                        const fyersSym = FYERS_MAP[cfg.id] || FYERS_MAP[cfg.symbol];
                        if (fyersSym) {
                            const quotes = await fyersService.fetchQuotes([fyersSym]);
                            if (quotes && quotes.length > 0) {
                                const q = quotes[0]?.v;
                                if (q && q.lp > 0) {
                                    const livePrice = q.lp;
                                    const prevClose = q.prev_close_price || (livePrice - (q.ch ?? 0));
                                    const liveChange = typeof q.ch === 'number' ? q.ch : +(livePrice - prevClose).toFixed(2);
                                    const livePctChange = typeof q.chp === 'number' ? q.chp : (prevClose > 0 ? +((liveChange / prevClose) * 100).toFixed(2) : 0);
                                    price = cfg.isGiftNifty ? +(livePrice + 32.5).toFixed(1) : livePrice;
                                    change = liveChange;
                                    pctChange = livePctChange;
                                    sourceUsed = 'FYERS';
                                    const istMin = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 330) % 1440;
                                    isMarketOpen = istMin >= 555 && istMin <= 930;
                                }
                            }
                        }
                    }
                    // ── Step 2: NSE allIndices (Indian indices) ─────────────────────────────
                    if (price === null && cfg.isIndianMarket && cfg.nseIndexName && nseData) {
                        const nseEntry = nseData[cfg.nseIndexName];
                        if (nseEntry && nseEntry.price > 0) {
                            price = nseEntry.price;
                            change = nseEntry.change;
                            pctChange = nseEntry.pctChange;
                            if (cfg.isGiftNifty) {
                                price = +(price + 32.5).toFixed(1);
                                change = +(change + 0).toFixed(2);
                            }
                            sourceUsed = 'NSE';
                            const istMin = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 330) % 1440;
                            isMarketOpen = istMin >= 555 && istMin <= 930;
                        }
                    }
                    // ── Step 3: Yahoo Finance batch result (or cache) ───────────────────────
                    if (price === null) {
                        const yahoo = yahooQuotes.get(cfg.symbol);
                        if (yahoo && yahoo.price > 0) {
                            price = yahoo.price;
                            change = yahoo.change;
                            pctChange = yahoo.pctChange;
                            isMarketOpen = yahoo.isMarketOpen;
                            sourceUsed = 'YAHOO';
                            // GIFT Nifty: add futures premium
                            if (cfg.isGiftNifty) {
                                const prev = yahoo.prevClose + 32.5;
                                price = +(yahoo.price + 32.5).toFixed(1);
                                change = +(price - prev).toFixed(2);
                                pctChange = +((change / (prev || 1)) * 100).toFixed(2);
                            }
                        }
                    }
                    // ── Step 4: In-memory / disk cache (last-close from a previous successful fetch) ──
                    if (price === null) {
                        const cached = this.yahooQuoteCache.get(cfg.symbol);
                        if (cached && cached.price > 0) {
                            price = cfg.isGiftNifty ? +(cached.price + 32.5).toFixed(1) : cached.price;
                            change = cached.change;
                            pctChange = cached.pctChange;
                            isMarketOpen = false;
                            sourceUsed = 'CACHE';
                        }
                    }
                    if (price !== null && change !== null && pctChange !== null && price > 0) {
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
                                : sourceUsed === 'CACHE'
                                    ? `${cfg.notes} [last close]`
                                    : cfg.notes
                        });
                        continue;
                    }
                }
                catch (itemErr) {
                    console.warn(`[GlobalIndicesService] Error fetching ${cfg.id}:`, itemErr.message);
                }
                // Keep last known good value rather than drop the card entirely
                const existing = this.indices.find(i => i.id === cfg.id);
                if (existing)
                    updatedList.push(existing);
            }
            if (updatedList.length > 0) {
                this.indices = updatedList;
                if (this.onUpdateCallback) {
                    try {
                        this.onUpdateCallback(this.indices);
                    }
                    catch { }
                }
            }
        }
        catch (err) {
            console.error('[GlobalIndicesService] Quote fetch error:', err);
        }
        finally {
            this.isFetching = false;
        }
    }
    onUpdateCallback = null;
    setCallback(cb) {
        this.onUpdateCallback = cb;
    }
    getIndices() {
        return this.indices;
    }
    async getSpotForSymbol(symbol) {
        // 1. Try Fyers first if live and authenticated
        const FYERS_MAP = {
            NIFTY: 'NSE:NIFTY50-INDEX',
            BANKNIFTY: 'NSE:NIFTYBANK-INDEX',
            FINNIFTY: 'NSE:FINNIFTY-INDEX',
            MIDCPNIFTY: 'NSE:MIDCPNIFTY-INDEX',
            SENSEX: 'BSE:SENSEX-INDEX',
            BANKEX: 'BSE:BANKEX-INDEX',
            INDIA_VIX: 'NSE:INDIAVIX-INDEX'
        };
        if (FYERS_MAP[symbol]) {
            const quotes = await fyersService.fetchQuotes([FYERS_MAP[symbol]]);
            if (quotes && quotes.length > 0) {
                const q = quotes[0]?.v;
                if (q && q.lp > 0) {
                    const spot = q.lp;
                    const prevClose = q.prev_close_price || (spot - (q.ch ?? 0));
                    const change = typeof q.ch === 'number' ? q.ch : +(spot - prevClose).toFixed(2);
                    const pctChange = typeof q.chp === 'number' ? q.chp : (prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0);
                    return {
                        spot,
                        change,
                        pctChange
                    };
                }
            }
        }
        // 2. Fallback to NSE India
        const nseData = await this.fetchNseAllIndices();
        if (nseData) {
            const MAP = {
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
        // 3. Fallback to Yahoo Finance
        const item = this.indices.find(i => i.id === symbol || i.id.replace('_', '') === symbol.replace('_', ''));
        if (item && item.price > 0) {
            return { spot: item.price, change: item.change, pctChange: item.pctChange };
        }
        return null;
    }
}
export const globalIndicesService = GlobalIndicesService.getInstance();
