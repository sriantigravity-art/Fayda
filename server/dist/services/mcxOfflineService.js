/**
 * MCX Offline Data Service
 *
 * Fetches after-hours / holiday commodity price data from mcxindia.com.
 * Used ONLY when MCX market is closed (after 23:30 IST, weekends, holidays).
 *
 * Data source: https://www.mcxindia.com/en/home
 *   - MCX iCOMDEX Indices (composite commodity indices)
 *   - Market Activity (Gold, Silver, CrudeOil, NaturalGas, etc.)
 *
 * When Fyers is live and MCX market is open → Fyers handles all commodity data.
 * When market is closed → this service provides the last-known settlement data.
 */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min cache
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// Known MCX commodity units
const COMMODITY_UNITS = {
    GOLD: '₹/10g',
    SILVER: '₹/kg',
    CRUDEOIL: '₹/bbl',
    NATURALGAS: '₹/MMBtu',
    COPPER: '₹/kg',
    ZINC: '₹/kg',
    LEAD: '₹/kg',
    NICKEL: '₹/kg',
    ALUMINIUM: '₹/kg',
    COTTON: '₹/bale',
    MENTHAOIL: '₹/kg',
    GOLDMINI: '₹/10g',
    GOLDPETAL: '₹/g',
    SILVERMINI: '₹/kg',
};
class McxOfflineService {
    cache = null;
    // ─── MCX Website Scraper ────────────────────────────────────────────────────
    /**
     * Tries multiple MCX India endpoints to get closing/offline data.
     * MCX blocks direct server-side requests with 403, so we try with
     * browser-like headers and fallback to IBJA-cached data.
     */
    async scrapeFromMcxWebsite() {
        const headers = {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Referer': 'https://www.mcxindia.com/',
            'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="126", "Chromium";v="126"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'Upgrade-Insecure-Requests': '1',
        };
        // Try to get MCX iCOMDEX data from their JSON endpoints
        const jsonEndpoints = [
            'https://www.mcxindia.com/CommonService.svc/GetAllIndices',
            'https://www.mcxindia.com/CommonService.svc/GetMarketSummary',
            'https://www.mcxindia.com/MarketData/GetBestBidOfferVolume?instrumentType=FUTCOM',
            'https://www.mcxindia.com/api/market/indices',
            'https://www.mcxindia.com/api/market/summary',
        ];
        const icomdex = [];
        const commodities = [];
        for (const url of jsonEndpoints) {
            try {
                const res = await fetch(url, {
                    headers: { ...headers, 'Accept': 'application/json, text/plain, */*', 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors' },
                    signal: AbortSignal.timeout(4000)
                });
                if (!res.ok)
                    continue;
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('json'))
                    continue;
                const data = await res.json();
                console.log(`[MCX-Offline] Got JSON from: ${url}`);
                // Parse iCOMDEX indices
                const indices = data?.indices || data?.Indices || data?.data?.indices || [];
                for (const idx of indices) {
                    const name = idx.IndexName || idx.Name || idx.name || '';
                    const value = +(idx.Value || idx.LTP || idx.Close || 0);
                    const chg = +(idx.Change || idx.NetChange || 0);
                    const pct = +(idx.PercentChange || idx.PChange || 0);
                    if (name && value > 0) {
                        icomdex.push({ name, value, change: chg, pctChange: pct });
                    }
                }
                // Parse commodity market data
                const contracts = data?.contracts || data?.Data || data?.data || (Array.isArray(data) ? data : []);
                for (const c of contracts) {
                    const sym = (c.Symbol || c.symbol || c.Commodity || '').replace(/\d+/g, '').toUpperCase();
                    const ltp = +(c.LTP || c.LastPrice || c.Close || 0);
                    const prev = +(c.PreviousClose || c.PrevClose || c.Settlement || ltp);
                    if (sym && ltp > 0 && COMMODITY_UNITS[sym]) {
                        commodities.push({
                            symbol: sym,
                            name: c.Name || c.CommodityName || sym,
                            ltp: Math.round(ltp),
                            change: Math.round(ltp - prev),
                            pctChange: prev > 0 ? +((ltp - prev) / prev * 100).toFixed(2) : 0,
                            prevClose: Math.round(prev),
                            high: Math.round(+(c.High || c.DayHigh || ltp)),
                            low: Math.round(+(c.Low || c.DayLow || ltp)),
                            volume: +(c.Volume || c.TotalVolume || 0),
                            oi: +(c.OI || c.OpenInterest || 0),
                            unit: COMMODITY_UNITS[sym] || '₹',
                            source: 'MCX_WEBSITE',
                            settlementDate: c.ExpiryDate || c.SettlementDate || new Date().toLocaleDateString('en-IN'),
                        });
                    }
                }
                if (icomdex.length > 0 || commodities.length > 0)
                    break;
            }
            catch { /* try next */ }
        }
        return { commodities, icomdex };
    }
    // ─── IBJA Cached Fallback ───────────────────────────────────────────────────
    /**
     * Fetches last known Gold/Silver rates from IBJA as fallback commodity data.
     * Returns synthesized offline quotes matching MCX contract units.
     */
    async fetchIbjaFallback() {
        try {
            const res = await fetch('https://ibjarates.com/', {
                headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://ibjarates.com/' },
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok)
                return [];
            const html = await res.text();
            const rows = this.parseIbjaRows(html, 'tab-pm').concat(this.parseIbjaRows(html, 'tab-am'));
            if (rows.length < 1)
                return [];
            const latest = rows[0];
            const previous = rows[1] || rows[0];
            const result = [];
            if (latest.gold999 > 0) {
                const chg = latest.gold999 - previous.gold999;
                result.push({
                    symbol: 'GOLD', name: 'Gold (999 purity)',
                    ltp: latest.gold999, change: chg,
                    pctChange: previous.gold999 > 0 ? +(chg / previous.gold999 * 100).toFixed(2) : 0,
                    prevClose: previous.gold999, high: latest.gold999, low: latest.gold999,
                    unit: '₹/10g', source: 'IBJA_CACHED',
                    settlementDate: latest.date,
                });
            }
            if (latest.silver999 > 0) {
                const chg = latest.silver999 - previous.silver999;
                result.push({
                    symbol: 'SILVER', name: 'Silver (999 purity)',
                    ltp: latest.silver999, change: chg,
                    pctChange: previous.silver999 > 0 ? +(chg / previous.silver999 * 100).toFixed(2) : 0,
                    prevClose: previous.silver999, high: latest.silver999, low: latest.silver999,
                    unit: '₹/kg', source: 'IBJA_CACHED',
                    settlementDate: latest.date,
                });
            }
            return result;
        }
        catch {
            return [];
        }
    }
    parseIbjaRows(html, tabId) {
        const rows = [];
        try {
            const start = html.indexOf(`id="${tabId}"`);
            if (start === -1)
                return rows;
            const section = html.slice(start, start + 5000);
            for (const trMatch of section.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
                const cells = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
                    .map(m => m[1].replace(/<[^>]*>/g, '').trim());
                if (cells.length >= 7) {
                    const gold999 = parseInt(cells[1].replace(/,/g, ''), 10);
                    const silver999 = parseInt(cells[6].replace(/,/g, ''), 10);
                    if (!isNaN(gold999) && gold999 > 0 && !isNaN(silver999) && silver999 > 0) {
                        rows.push({ date: cells[0], gold999, silver999 });
                    }
                }
            }
        }
        catch { /* silently fail */ }
        return rows;
    }
    // ─── Market Status ──────────────────────────────────────────────────────────
    static getMcxStatus() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const day = ist.getDay(); // 0=Sun, 6=Sat
        if (day === 0 || day === 6)
            return { isOpen: false, status: 'HOLIDAY' };
        const min = ist.getHours() * 60 + ist.getMinutes();
        if (min >= 9 * 60 - 15 && min < 9 * 60)
            return { isOpen: false, status: 'PRE_OPEN' };
        if (min >= 9 * 60 && min < 23 * 60 + 30)
            return { isOpen: true, status: 'OPEN' };
        return { isOpen: false, status: 'CLOSED' };
    }
    // ─── Public API ─────────────────────────────────────────────────────────────
    async getOfflineData() {
        if (this.cache && Date.now() - this.cache.ts < CACHE_TTL_MS) {
            return this.cache.data;
        }
        const { status } = McxOfflineService.getMcxStatus();
        const now = new Date().toISOString();
        // Try MCX website first
        const mcxData = await this.scrapeFromMcxWebsite();
        let commodities = mcxData.commodities || [];
        const icomdex = mcxData.icomdex || [];
        // Fallback to IBJA for Gold/Silver if MCX website didn't return data
        if (!commodities.some(c => c.symbol === 'GOLD') || !commodities.some(c => c.symbol === 'SILVER')) {
            const ibjaData = await this.fetchIbjaFallback();
            // Merge: add IBJA items not already present from MCX
            for (const item of ibjaData) {
                if (!commodities.some(c => c.symbol === item.symbol)) {
                    commodities.push(item);
                }
            }
        }
        const data = {
            commodities,
            icomdex,
            marketStatus: status,
            lastUpdated: now,
            closingDate: new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        };
        this.cache = { data, ts: Date.now() };
        console.log(`[MCX-Offline] Data ready: ${commodities.length} commodities, ${icomdex.length} iCOMDEX indices, status=${status}`);
        return data;
    }
}
export const mcxOfflineService = new McxOfflineService();
export { McxOfflineService };
