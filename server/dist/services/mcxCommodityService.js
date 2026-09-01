/**
 * MCX Commodity Spot Price Service
 *
 * Fetches Gold and Silver spot prices from Indian sources, in priority order:
 *
 *   1. IBJA (India Bullion & Jewellers Association) — the official MCX settlement benchmark
 *      ibjarates.com — publishes INR rates twice daily (AM/PM): Gold per 10g, Silver per kg
 *
 *   2. MCX India website internal API — direct fetch from mcxindia.com's own endpoints
 *      Used when IBJA is unavailable or returns stale data
 *
 *   3. Yahoo Finance COMEX futures (GC=F / SI=F) + live USD/INR rate → INR
 *      Last-resort fallback for when all Indian sources are down
 *
 * Units match MCX contracts:
 *   GOLD   : INR per 10 grams  (MCX Gold contract lots)
 *   SILVER : INR per kilogram  (MCX Silver contract lots)
 *
 * Primary live data: Fyers API (when user is logged in) handles MCX directly.
 * This service is used when Fyers is offline (NSE/offline fallback path).
 */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (IBJA rates are published twice daily)
import { usdInrService } from './usdInrService.js';
export class McxCommodityService {
    cache = new Map();
    UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    // ─── USD/INR helper ──────────────────────────────────────────────────────────
    async getUsdInr() {
        return usdInrService.get();
    }
    // ─── Source 1: IBJA (India Bullion and Jewellers Association) ────────────────
    /**
     * Scrapes ibjarates.com for today's AM/PM gold and silver rates (INR).
     * IBJA is the official benchmark used by MCX for Gold and Silver settlement.
     *
     * Returns:
     *   Gold   — INR per 10 grams (999 purity)
     *   Silver — INR per kilogram (999 purity)
     */
    async fetchFromIbja(symbol) {
        try {
            const res = await fetch('https://ibjarates.com/', {
                headers: {
                    'User-Agent': this.UA,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-IN,en;q=0.9',
                    'Referer': 'https://ibjarates.com/'
                },
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok)
                return null;
            const html = await res.text();
            // Parse IBJA HTML — extract the latest PM and previous PM rates from the table.
            // Table structure: rows contain date, 999, 995, 916, 750, 585, Silver999, Platinum999
            // Gold rates are INR per 10g; Silver rates are INR per kg.
            const pmRows = this.extractIbjaTableRows(html, 'tab-pm');
            const amRows = this.extractIbjaTableRows(html, 'tab-am');
            // Use PM rows for latest rate, fallback to AM rows
            const rows = pmRows.length > 0 ? pmRows : amRows;
            if (rows.length < 1)
                return null;
            const latest = rows[0]; // most recent date
            const previous = rows[1] || rows[0]; // day before
            let spot;
            let prevClose;
            if (symbol === 'GOLD') {
                // Gold 999 purity, per 10 grams
                spot = latest.gold999;
                prevClose = previous.gold999;
            }
            else {
                // Silver 999 purity, per kilogram
                spot = latest.silver999;
                prevClose = previous.silver999;
            }
            if (spot <= 0 || isNaN(spot))
                return null;
            const change = +(spot - prevClose).toFixed(0);
            const pctChange = prevClose > 0 ? +(change / prevClose * 100).toFixed(2) : 0;
            return {
                spot,
                change,
                pctChange,
                prevClose,
                source: 'IBJA',
                lastUpdated: new Date().toISOString()
            };
        }
        catch (e) {
            console.warn('[MCX] IBJA fetch error:', e.message);
            return null;
        }
    }
    /**
     * Extracts IBJA table rows (date, gold999, silver999) from the PM or AM tab section.
     */
    extractIbjaTableRows(html, tabId) {
        const rows = [];
        try {
            // Find the target tab section
            const tabStart = html.indexOf(`id="${tabId}"`);
            if (tabStart === -1)
                return rows;
            // Extract next ~4000 characters covering the table
            const section = html.slice(tabStart, tabStart + 5000);
            // Match <tr> rows containing <td> cells
            const trMatches = section.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
            for (const trMatch of trMatches) {
                const row = trMatch[1];
                // Extract all <td> cell values
                const tdValues = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
                    .map(m => m[1].replace(/<[^>]*>/g, '').trim());
                if (tdValues.length >= 7) {
                    const dateStr = tdValues[0];
                    const gold999 = parseInt(tdValues[1].replace(/,/g, ''), 10);
                    const silver999 = parseInt(tdValues[6].replace(/,/g, ''), 10);
                    if (dateStr && !isNaN(gold999) && gold999 > 0 && !isNaN(silver999) && silver999 > 0) {
                        rows.push({ date: dateStr, gold999, silver999 });
                    }
                }
            }
        }
        catch { /* silently fail */ }
        return rows;
    }
    // ── Source 2: MCX India website internal endpoints ─────────────────────────────
    /**
     * Tries to fetch commodity price data from MCX India's internal website APIs.
     * These are the same endpoints used by the mcxindia.com frontend JavaScript.
     * May return 403 or timeout when MCX blocks server-side requests.
     */
    async fetchFromMcxWebsite(symbol) {
        // MCX India internal endpoints (used by their Angular frontend)
        const endpoints = [
            `https://www.mcxindia.com/MarketData/GetFuturesData?instrumentType=FUTCOM&symbol=${symbol}&strikePrice=0&expiryDate=`,
            `https://www.mcxindia.com/CommonService.svc/GetCategoryWiseContractList?Category=PRECIOUS+METALS&Instrument=FUTCOM`,
            `https://www.mcxindia.com/api/MarketData/commodity-futures?symbol=${symbol}`,
        ];
        const headers = {
            'User-Agent': this.UA,
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.mcxindia.com/en/home',
            'Origin': 'https://www.mcxindia.com',
            'Accept-Language': 'en-IN,en;q=0.9',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
        };
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
                if (!res.ok)
                    continue;
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('json'))
                    continue;
                const data = (await res.json());
                // Try multiple response formats MCX might use
                const items = data?.data || data?.Data || data?.Result || data?.result ||
                    (Array.isArray(data) ? data : []);
                const item = items.find((i) => {
                    const sym = (i.Symbol || i.symbol || i.Commodity || '').toUpperCase();
                    return sym.startsWith(symbol);
                }) || items[0];
                if (item) {
                    const ltp = +(item.LTP || item.LastPrice || item.ltp || item.Close || 0);
                    const prevClose = +(item.PreviousClose || item.PrevClose || item.Settlement || ltp);
                    if (ltp > 1000) { // sanity: gold should be >1000 INR
                        const change = Math.round(ltp - prevClose);
                        const pctChange = prevClose > 0 ? +(change / prevClose * 100).toFixed(2) : 0;
                        return { spot: Math.round(ltp), change, pctChange, prevClose: Math.round(prevClose),
                            source: 'MCX_WEBSITE', lastUpdated: new Date().toISOString() };
                    }
                }
            }
            catch { /* try next endpoint */ }
        }
        return null;
    }
    // ── Source 3: Yahoo Finance COMEX + USD/INR conversion ──────────────────────────
    /**
     * Fetches Gold/Silver from Yahoo Finance COMEX futures (GC=F / SI=F)
     * and converts to INR using live USD/INR rate.
     *
     * GOLD   : GC=F USD/troy oz → INR/10g  (× usdInr / 31.1035 × 10)
     * SILVER : SI=F USD/troy oz → INR/kg   (× usdInr / 31.1035 × 1000)
     */
    async fetchFromYahoo(symbol) {
        const ticker = symbol === 'GOLD' ? 'GC=F' : 'SI=F';
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
            const res = await fetch(url, {
                headers: { 'User-Agent': this.UA },
                signal: AbortSignal.timeout(5000)
            });
            if (!res.ok)
                return null;
            const data = (await res.json());
            const meta = data?.chart?.result?.[0]?.meta;
            if (!meta || typeof meta.regularMarketPrice !== 'number')
                return null;
            const priceUsd = meta.regularMarketPrice;
            const prevCloseUsd = meta.chartPreviousClose || meta.previousClose || priceUsd;
            const usdInr = await this.getUsdInr();
            let spot;
            let prevClose;
            if (symbol === 'GOLD') {
                // USD/troy oz → INR/10g : × usdInr / 31.1035 × 10
                spot = Math.round(priceUsd * usdInr / 31.1035 * 10);
                prevClose = Math.round(prevCloseUsd * usdInr / 31.1035 * 10);
            }
            else {
                // USD/troy oz → INR/kg : × usdInr / 31.1035 × 1000
                spot = Math.round(priceUsd * usdInr / 31.1035 * 1000);
                prevClose = Math.round(prevCloseUsd * usdInr / 31.1035 * 1000);
            }
            const change = spot - prevClose;
            const pctChange = prevClose > 0 ? +(change / prevClose * 100).toFixed(2) : 0;
            return {
                spot,
                change,
                pctChange,
                prevClose,
                source: 'YAHOO_COMEX',
                lastUpdated: new Date().toISOString()
            };
        }
        catch {
            return null;
        }
    }
    // ─── Public API ──────────────────────────────────────────────────────────────
    /**
     * Returns a live MCX-benchmarked spot price for Gold or Silver.
     *
     * Priority: IBJA → MCX India website → Yahoo Finance COMEX + USD/INR
     * Results are cached for 5 minutes.
     */
    async fetchSpot(symbol) {
        const cached = this.cache.get(symbol);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            return cached.quote;
        }
        // Source 1: IBJA (official Indian bullion benchmark = MCX settlement basis)
        let quote = await this.fetchFromIbja(symbol);
        // Source 2: MCX India website internal API
        if (!quote) {
            quote = await this.fetchFromMcxWebsite(symbol);
        }
        // Source 3: Yahoo Finance COMEX futures + live USD/INR conversion
        if (!quote) {
            quote = await this.fetchFromYahoo(symbol);
        }
        if (quote) {
            this.cache.set(symbol, { quote, ts: Date.now() });
            console.log(`[MCX] ${symbol}: ₹${quote.spot.toLocaleString('en-IN')} (${quote.source}) chg: ${quote.change >= 0 ? '+' : ''}${quote.change}`);
        }
        return quote;
    }
}
export const mcxCommodityService = new McxCommodityService();
