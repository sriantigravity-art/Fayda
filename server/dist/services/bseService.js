/**
 * BSE Option Chain Service
 *
 * Fetches real SENSEX and BANKEX option chain OI data from BSE India.
 * Used as fallback when Fyers is not connected.
 *
 * Data source priority:
 *   1. BSE live option chain API (api.bseindia.com) — primary, but CDN-blocked from servers
 *   2. BSE public XML derivatives feed (bseindia.com/data/xml/derivatives.xml) — static, accessible
 *   3. BSE derivatives bhavcopy CSV — last session's OI (always available, published daily)
 *   4. Stale cache
 *
 * Note: api.bseindia.com uses Cloudflare WAF and typically blocks server-side fetch.
 * The XML feed and bhavcopy are plain HTTP files not behind CDN protection.
 */
import { globalIndicesService } from './globalIndicesService.js';
import { NseExpiryService } from './nseExpiryService.js';
// BSE scrip codes for index derivatives (Index Options = producttype=IO)
const BSE_SCRIP_CODES = {
    SENSEX: '999EZ',
    BANKEX: '999EV'
};
const CACHE_TTL_MS = 15000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
export class BseService {
    cache = new Map();
    bseCookies = '';
    bseCookieTs = 0;
    // ── Cookie warm-up ───────────────────────────────────────────────────────────
    async ensureBseCookies() {
        if (this.bseCookies && Date.now() - this.bseCookieTs < 5 * 60 * 1000)
            return this.bseCookies;
        try {
            // Two-phase: homepage first, then derivatives page to get all session cookies
            for (const warmupUrl of [
                'https://www.bseindia.com',
                'https://www.bseindia.com/markets/Derivatives/DerivativesHome.aspx'
            ]) {
                const res = await fetch(warmupUrl, {
                    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-IN,en;q=0.9' },
                    signal: AbortSignal.timeout(4000)
                });
                const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
                const newCookies = raw.map(c => c.split(';')[0]).join('; ');
                if (newCookies) {
                    this.bseCookies = this.bseCookies ? `${this.bseCookies}; ${newCookies}` : newCookies;
                }
            }
            this.bseCookieTs = Date.now();
        }
        catch {
            // BSE warmup is best-effort
        }
        return this.bseCookies;
    }
    // ── Public API ───────────────────────────────────────────────────────────────
    async fetchOptionChain(symbol, expiry) {
        const cacheKey = `${symbol}_${expiry || 'default'}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS)
            return cached.result;
        // Attempt 1: BSE live API (may be blocked by Cloudflare from server IPs)
        const result = await this.fetchFromBseApi(symbol, BSE_SCRIP_CODES[symbol], expiry)
            // Attempt 2: BSE public JSON fallback endpoints
            ?? await this.fetchFromBsePublicJson(symbol, BSE_SCRIP_CODES[symbol], expiry)
            // Attempt 3: BSE daily bhavcopy (last session OI — always available)
            ?? await this.fetchFromBseBhavcopy(symbol, expiry);
        if (result && result.strikes.length > 0) {
            this.cache.set(cacheKey, { result, ts: Date.now() });
            this.cache.set(`${symbol}_default`, { result, ts: Date.now() });
            return result;
        }
        if (cached)
            return cached.result;
        return null;
    }
    // ── Attempt 1: Live BSE API (api.bseindia.com) ───────────────────────────────
    async fetchFromBseApi(symbol, scripCode, expiry) {
        const cookies = await this.ensureBseCookies();
        const headers = {
            'User-Agent': UA,
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.bseindia.com/markets/Derivatives/DerivativesHome.aspx',
            'Origin': 'https://www.bseindia.com',
            'Accept-Language': 'en-IN,en;q=0.9',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
        };
        if (cookies)
            headers['Cookie'] = cookies;
        const expiryParam = expiry ? encodeURIComponent(expiry) : '';
        const endpoints = [
            `https://api.bseindia.com/BseIndiaAPI/api/GetLivederivativeOptionchain/w?scripcode=${scripCode}&producttype=IO&markettype=&expirydate=${expiryParam}`,
            `https://api.bseindia.com/BseIndiaAPI/api/GetLiveoptionchain/w?scripcode=${scripCode}&producttype=IO&expirydate=${expiryParam}`,
        ];
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
                if (!res.ok)
                    continue;
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('json'))
                    continue;
                const json = await res.json();
                const parsed = await this.parseBseJson(symbol, json, expiry);
                if (parsed && parsed.strikes.length > 0) {
                    console.log(`[BSE] ${symbol}: ${parsed.strikes.length} strikes via live API`);
                    return parsed;
                }
            }
            catch { /* blocked — try next */ }
        }
        return null;
    }
    // ── Attempt 2: BSE public JSON endpoints (no Cloudflare) ────────────────────
    async fetchFromBsePublicJson(symbol, scripCode, expiry) {
        const expiryParam = expiry ? encodeURIComponent(expiry) : '';
        // These are older BSE endpoints that sometimes work without CDN protection
        const endpoints = [
            `https://www.bseindia.com/Msource/Derivatives/GetLiveOptionChain.aspx?scripcode=${scripCode}&producttype=IO&expirydate=${expiryParam}`,
            `https://www.bseindia.com/Msource/Derivatives/GetDerivativeQuote.aspx?scripcode=${scripCode}`,
        ];
        const headers = {
            'User-Agent': UA,
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.bseindia.com/',
            'Accept-Language': 'en-IN,en;q=0.9',
        };
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
                if (!res.ok)
                    continue;
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('json'))
                    continue;
                const json = await res.json();
                const parsed = await this.parseBseJson(symbol, json, expiry);
                if (parsed && parsed.strikes.length > 0) {
                    console.log(`[BSE] ${symbol}: ${parsed.strikes.length} strikes via public endpoint`);
                    return parsed;
                }
            }
            catch { /* try next */ }
        }
        return null;
    }
    // ── Attempt 3: BSE daily bhavcopy CSV (last session OI) ─────────────────────
    async fetchFromBseBhavcopy(symbol, expiry) {
        // BSE publishes daily derivatives bhavcopy for last trading session
        // Try the last few trading days (today, yesterday, day before)
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 5; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const day = d.getDay();
            if (day === 0 || day === 6)
                continue; // Skip weekends
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            dates.push(`${dd}${mm}${yyyy}`);
            if (dates.length >= 3)
                break;
        }
        const headers = {
            'User-Agent': UA,
            'Accept': 'text/csv,text/plain,*/*',
            'Referer': 'https://www.bseindia.com/'
        };
        for (const dateStr of dates) {
            // BSE derivatives bhavcopy URL patterns
            const urls = [
                `https://www.bseindia.com/download/Bhavcopy/Derivative/bhavcopy${dateStr}.zip`,
                `https://www.bseindia.com/Bhavcopy/fo_bhavcopy_${dateStr}.zip`,
            ];
            for (const url of urls) {
                try {
                    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
                    if (!res.ok)
                        continue;
                    // BSE bhavcopy is a ZIP; skip binary parsing for now
                    // Try plain CSV variant instead
                    console.warn(`[BSE] ${symbol}: bhavcopy ZIP found for ${dateStr} but ZIP parsing not supported yet`);
                }
                catch { /* try next date */ }
            }
            // Try plain-text/CSV endpoints
            const csvUrls = [
                `https://www.bseindia.com/download/Bhavcopy/Derivative/fo${dateStr}bhav.csv`,
                `https://www.bseindia.com/data/xml/derivatives.csv`,
            ];
            for (const url of csvUrls) {
                try {
                    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
                    if (!res.ok)
                        continue;
                    const text = await res.text();
                    const parsed = this.parseBseCsv(symbol, text, expiry);
                    if (parsed && parsed.strikes.length > 0) {
                        console.log(`[BSE] ${symbol}: ${parsed.strikes.length} strikes from bhavcopy CSV (${dateStr})`);
                        return parsed;
                    }
                }
                catch { /* try next */ }
            }
        }
        return null;
    }
    // ── JSON Parser (handles multiple BSE API response shapes) ──────────────────
    async parseBseJson(symbol, json, requestedExpiry) {
        try {
            const rows = json?.Table || json?.optionchain || json?.Data || json?.data ||
                json?.Result || (Array.isArray(json) ? json : null);
            if (!rows || !Array.isArray(rows) || rows.length === 0)
                return null;
            const expirySet = new Set();
            for (const row of rows) {
                const exp = (row.ExpiryDate || row.expirydate || row.Expirydate || row.expiry || '').trim();
                if (exp)
                    expirySet.add(exp);
            }
            const expiryDates = Array.from(expirySet).sort();
            const selectedExpiry = requestedExpiry && expiryDates.includes(requestedExpiry)
                ? requestedExpiry : (expiryDates[0] || NseExpiryService.getUpcomingExpiries(symbol, 1)[0] || '');
            // Spot price: from response → globalIndicesService
            let spotPrice = +(json?.spotValue || json?.SpotValue || json?.underlyingValue || json?.UnderlyingValue || 0);
            if (!spotPrice) {
                const entry = globalIndicesService.getIndices().find(i => (symbol === 'SENSEX' && i.name?.toLowerCase().includes('sensex')) ||
                    (symbol === 'BANKEX' && i.name?.toLowerCase().includes('bankex')));
                spotPrice = entry?.price || 0;
            }
            const strikeMap = new Map();
            let totalCallOI = 0, totalPutOI = 0;
            for (const row of rows) {
                const rowExp = (row.ExpiryDate || row.expirydate || row.expiry || '').trim();
                if (selectedExpiry && rowExp && rowExp !== selectedExpiry)
                    continue;
                const sp = +(row.StrikePrice || row.strikePrice || row.STRIKEPRICE || 0);
                if (!sp || sp <= 0)
                    continue;
                if (!strikeMap.has(sp)) {
                    strikeMap.set(sp, { strikePrice: sp, callOI: 0, callOIChangeTotal: 0, callLtp: 0, callVolume: 0, putOI: 0, putOIChangeTotal: 0, putLtp: 0, putVolume: 0 });
                }
                const e = strikeMap.get(sp);
                // Format A: combined CE+PE fields
                const cOI = +(row.CE_OpenInterest || row.CallOI || row.callOpenInterest || row.CE_OI || 0);
                const pOI = +(row.PE_OpenInterest || row.PutOI || row.putOpenInterest || row.PE_OI || 0);
                if (cOI > 0 || +(row.CE_LTP || row.CallLTP || 0) > 0) {
                    e.callOI = cOI;
                    e.callLtp = +(row.CE_LTP || row.CallLTP || row.callLastTradedPrice || 0);
                    e.callVolume = +(row.CE_Volume || row.CallVolume || 0);
                    e.callOIChangeTotal = +(row.CE_OIChange || row.CallOIChange || 0);
                    totalCallOI += cOI;
                }
                if (pOI > 0 || +(row.PE_LTP || row.PutLTP || 0) > 0) {
                    e.putOI = pOI;
                    e.putLtp = +(row.PE_LTP || row.PutLTP || row.putLastTradedPrice || 0);
                    e.putVolume = +(row.PE_Volume || row.PutVolume || 0);
                    e.putOIChangeTotal = +(row.PE_OIChange || row.PutOIChange || 0);
                    totalPutOI += pOI;
                }
                // Format B: separate rows per option type
                const optType = (row.OptionType || row.optionType || row.CP_Flag || row.otype || '').toUpperCase();
                if (optType === 'CE' || optType === 'C' || optType === 'CALL') {
                    e.callOI = +(row.OpenInterest || row.OI || 0);
                    e.callLtp = +(row.LTP || row.LastPrice || 0);
                    e.callVolume = +(row.Volume || row.TotalVolume || 0);
                    e.callOIChangeTotal = +(row.OIChange || row.ChangeInOI || 0);
                    totalCallOI += e.callOI;
                }
                else if (optType === 'PE' || optType === 'P' || optType === 'PUT') {
                    e.putOI = +(row.OpenInterest || row.OI || 0);
                    e.putLtp = +(row.LTP || row.LastPrice || 0);
                    e.putVolume = +(row.Volume || row.TotalVolume || 0);
                    e.putOIChangeTotal = +(row.OIChange || row.ChangeInOI || 0);
                    totalPutOI += e.putOI;
                }
            }
            const strikes = Array.from(strikeMap.values())
                .filter(s => s.callOI > 0 || s.putOI > 0 || s.callLtp > 0 || s.putLtp > 0)
                .sort((a, b) => a.strikePrice - b.strikePrice);
            if (strikes.length === 0)
                return null;
            return { symbol, spotPrice, spotChange: 0, spotPctChange: 0, strikes, expiryDates, selectedExpiry, totalCallOI, totalPutOI };
        }
        catch (err) {
            console.warn(`[BSE] JSON parse error for ${symbol}:`, err.message);
            return null;
        }
    }
    // ── CSV Parser (BSE bhavcopy format) ────────────────────────────────────────
    parseBseCsv(symbol, csv, requestedExpiry) {
        try {
            const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 2)
                return null;
            // BSE derivatives bhavcopy columns (approximate):
            // SC_CODE, SC_NAME, EXPIRY_DATE, STRIKE_PRICE, OPTION_TYPE, OPEN, HIGH, LOW, CLOSE, LAST, SETTLE, TOT_TRD_QTY, TURNOVER_LACS, OPEN_INT, CHG_IN_OI, TIMESTAMP
            const header = lines[0].split(',').map(h => h.trim().toUpperCase());
            const iScripCode = header.indexOf('SC_CODE');
            const iExpiry = header.findIndex(h => h.includes('EXPIRY'));
            const iStrike = header.findIndex(h => h.includes('STRIKE'));
            const iOptType = header.findIndex(h => h.includes('OPTION'));
            const iLast = header.findIndex(h => h === 'LAST' || h === 'CLOSE' || h === 'SETTLE_PR');
            const iOI = header.findIndex(h => h === 'OPEN_INT' || h.includes('OPEN_INT'));
            const iOIChg = header.findIndex(h => h.includes('CHG_IN_OI'));
            const iVol = header.findIndex(h => h === 'TOT_TRD_QTY' || h === 'CONTRACTS');
            const scripCode = BSE_SCRIP_CODES[symbol];
            const expirySet = new Set();
            const strikeMap = new Map();
            let totalCallOI = 0, totalPutOI = 0;
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',').map(c => c.trim());
                if (iScripCode >= 0 && cells[iScripCode] !== scripCode)
                    continue;
                const expiry = iExpiry >= 0 ? cells[iExpiry] : '';
                const sp = iStrike >= 0 ? +(cells[iStrike]) : 0;
                const optType = iOptType >= 0 ? cells[iOptType].toUpperCase() : '';
                const ltp = iLast >= 0 ? +(cells[iLast]) : 0;
                const oi = iOI >= 0 ? +(cells[iOI]) : 0;
                const oiChg = iOIChg >= 0 ? +(cells[iOIChg]) : 0;
                const vol = iVol >= 0 ? +(cells[iVol]) : 0;
                if (sp <= 0)
                    continue;
                if (expiry)
                    expirySet.add(expiry);
                if (!strikeMap.has(sp)) {
                    strikeMap.set(sp, { strikePrice: sp, callOI: 0, callOIChangeTotal: 0, callLtp: 0, callVolume: 0, putOI: 0, putOIChangeTotal: 0, putLtp: 0, putVolume: 0 });
                }
                const e = strikeMap.get(sp);
                if (optType === 'CE' || optType === 'CA' || optType === 'C') {
                    e.callOI = oi;
                    e.callLtp = ltp;
                    e.callVolume = vol;
                    e.callOIChangeTotal = oiChg;
                    totalCallOI += oi;
                }
                else if (optType === 'PE' || optType === 'PA' || optType === 'P') {
                    e.putOI = oi;
                    e.putLtp = ltp;
                    e.putVolume = vol;
                    e.putOIChangeTotal = oiChg;
                    totalPutOI += oi;
                }
            }
            const expiryDates = Array.from(expirySet).sort();
            const selectedExpiry = requestedExpiry && expiryDates.includes(requestedExpiry)
                ? requestedExpiry : (expiryDates[0] || '');
            const strikes = Array.from(strikeMap.values())
                .filter(s => s.callOI > 0 || s.putOI > 0)
                .sort((a, b) => a.strikePrice - b.strikePrice);
            if (strikes.length === 0)
                return null;
            const entry = globalIndicesService.getIndices().find(i => (symbol === 'SENSEX' && i.name?.toLowerCase().includes('sensex')) ||
                (symbol === 'BANKEX' && i.name?.toLowerCase().includes('bankex')));
            const spotPrice = entry?.price || 0;
            return { symbol, spotPrice, spotChange: 0, spotPctChange: 0, strikes, expiryDates, selectedExpiry, totalCallOI, totalPutOI };
        }
        catch (err) {
            console.warn(`[BSE] CSV parse error for ${symbol}:`, err.message);
            return null;
        }
    }
    /**
     * Clears all cached OI data and session cookies.
     * Called at market open (9:15 AM IST) so the next request fetches fresh live data.
     */
    clearCache() {
        this.cache.clear();
        this.bseCookies = '';
        this.bseCookieTs = 0;
        console.log('[BSE] Cache cleared for market open.');
    }
}
export const bseService = new BseService();
