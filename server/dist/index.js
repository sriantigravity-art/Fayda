import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { OIEngine } from './engine/oiEngine.js';
import { nseService } from './services/nseService.js';
import { fyersService } from './services/fyersService.js';
import { newsService } from './services/newsService.js';
import { globalIndicesService } from './services/globalIndicesService.js';
import { globalMarketFeedService } from './services/globalMarketFeedService.js';
import { mcxOfflineService, McxOfflineService } from './services/mcxOfflineService.js';
import { signalLedgerService } from './services/signalLedgerService.js';
import { bseService } from './services/bseService.js';
import { ALL_SYMBOLS_CONFIG } from './types.js';
const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', server: 'Fayda Terminal', timestamp: new Date().toISOString() });
});
app.get('/api/status', (_req, res) => {
    res.json({
        status: 'ONLINE',
        dataSource: currentDataSource,
        activeWsClients: activeClients.size,
        timestamp: new Date().toISOString()
    });
});
const engine = new OIEngine();
const activeClients = new Set();
let currentDataSource = 'NSE_LIVE'; // Default to NSE on Railway (no Fyers credentials)
let nsePollTimer = null;
let fyersPollTimer = null;
const selectedExpiries = new Map();
// Watched symbols set (Major indices + MCX commodities + key Nifty 50 stocks)
const watchedSymbols = new Set([
    'NIFTY', 'BANKNIFTY', 'SENSEX', 'BANKEX', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50',
    'CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER',
    'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS'
]);
// Cache of the latest / last-closing index state for each symbol
const cachedIndexStates = new Map();
// Check market hours: NSE/BSE Equity (09:15 - 15:40 IST) vs MCX Commodities (09:00 - 23:30 IST)
export const isMarketOpenForSymbol = (symbol) => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6)
        return false;
    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
    if (isCommodity) {
        return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
};
export const isNseMarketOpen = () => isMarketOpenForSymbol('NIFTY');
// Broadcast function to all active WS clients
const broadcast = (data) => {
    const payload = JSON.stringify(data);
    for (const client of activeClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
};
// Hook NewsService Callback to Broadcast Breaking Flash News to all clients
newsService.setCallback((newsItem) => {
    broadcast({
        type: 'FLASH_NEWS',
        newsItem,
        timestamp: new Date().toISOString()
    });
});
// Hook GlobalIndicesService Callback to Broadcast Live International & Indian Quotes
globalIndicesService.setCallback((globalIndices) => {
    broadcast({
        type: 'GLOBAL_INDICES_UPDATE',
        globalIndices,
        timestamp: new Date().toISOString()
    });
});
// Hook GlobalMarketFeedService Callback to Broadcast Global Risk & Macro Updates
globalMarketFeedService.onUpdate((globalMarketContext) => {
    broadcast({
        type: 'GLOBAL_MARKET_CONTEXT_UPDATE',
        globalMarketContext,
        timestamp: new Date().toISOString()
    });
});
// Hook FyersService auto-renewal callback — broadcast new token state to all clients
fyersService.onTokenRenewed = (newConfig) => {
    console.log('[Fyers] Broadcasting auto-renewed token state to all clients...');
    broadcast({
        type: 'FYERS_STATUS',
        fyersConfig: newConfig,
        dataSource: currentDataSource,
        isMarketOpen: isNseMarketOpen(),
        timestamp: new Date().toISOString()
    });
};
// ── Market Open at 9:15 AM IST: clear all stale caches and notify clients ──
globalIndicesService.onMarketOpen = () => {
    console.log('[Market] 🔔 9:15 AM IST — market opened. Clearing all stale caches...');
    // 1. Clear BSE OI option-chain cache
    bseService.clearCache();
    // 2. Force NSE service to drop any stale state
    nseService.onMarketOpen?.();
    // 3. Broadcast MARKET_OPEN to all WebSocket clients
    broadcast({
        type: 'MARKET_OPEN',
        message: 'NSE market opened at 9:15 AM IST — live data active, stale cache cleared.',
        isMarketOpen: true,
        timestamp: new Date().toISOString()
    });
    // 4. Also push a fresh FYERS_STATUS so header bar updates immediately
    broadcast({
        type: 'FYERS_STATUS',
        fyersConfig: fyersService.getConfig(),
        dataSource: currentDataSource,
        isMarketOpen: true,
        timestamp: new Date().toISOString()
    });
};
const getSymbolConfig = (symbol) => {
    const found = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    if (found)
        return found;
    return {
        symbol,
        name: symbol,
        category: 'NIFTY50_STOCKS',
        step: 10,
        lot: 500,
        defaultRange: 100,
        fyersSymbol: `NSE:${symbol}-EQ`,
        isIndex: false
    };
};
let activeSymbol = 'NIFTY';
const clientActiveSymbols = new Map();
let fastLaneTimer = null;
let batchQuotesTimer = null;
let bgPollTimer = null;
let isFastLaneBusy = false;
let isBatchQuotesBusy = false;
let isBgPollBusy = false;
// Fetch single symbol snapshot
const fetchSymbolSnapshot = async (symConfig) => {
    try {
        const chosenExp = selectedExpiries.get(symConfig.symbol);
        let res = null;
        let usedSource = currentDataSource;
        if (currentDataSource === 'FYERS_LIVE') {
            res = await fyersService.fetchOptionChain(symConfig.symbol, chosenExp);
        }
        // Seamless fallback to Official Exchange data if Fyers is not logged in or offline
        if (!res || !res.strikes || res.strikes.length === 0) {
            res = await nseService.fetchOptionChain(symConfig.symbol, chosenExp);
            usedSource = 'NSE_LIVE';
        }
        if (res && res.strikes.length > 0) {
            let spotPrice = res.spotPrice;
            let spotChange = res.spotChange ?? 0;
            let spotPctChange = res.spotPctChange ?? 0;
            // Only query secondary quotes if Fyers/NSE returned an invalid/zero spot price
            if (spotPrice <= 0) {
                const liveQuote = await globalIndicesService.getSpotForSymbol(symConfig.symbol);
                if (liveQuote && liveQuote.spot > 0) {
                    spotPrice = liveQuote.spot;
                    spotChange = liveQuote.change;
                    spotPctChange = liveQuote.pctChange;
                }
            }
            // Zero out change values if market is closed for this symbol
            const isOpen = isMarketOpenForSymbol(symConfig.symbol);
            if (!isOpen) {
                spotChange = 0;
                spotPctChange = 0;
            }
            // Resolve India VIX: prefer Fyers feed, then globalIndicesService (NSE allIndices / Yahoo)
            let indiaVix = res.indiaVix && res.indiaVix > 0 ? res.indiaVix : undefined;
            if (!indiaVix) {
                const vixEntry = globalIndicesService.getIndices().find(i => i.id === 'INDIA_VIX');
                if (vixEntry && vixEntry.price > 0)
                    indiaVix = vixEntry.price;
            }
            const { indexState, newSurges } = engine.processSnapshot(symConfig.symbol, spotPrice, spotChange, spotPctChange, res.strikes, symConfig.step, symConfig.lot, symConfig.defaultRange, usedSource, res.expiryDates, res.selectedExpiry, res.totalCallOI, res.totalPutOI, indiaVix);
            cachedIndexStates.set(symConfig.symbol, indexState);
            // Track & update live LTP and target nearness in Signal Ledger
            signalLedgerService.updateLivePrices(symConfig.symbol, res.strikes);
            // Auto-record high-conviction curated cockpit trades into Signal Ledger during market hours
            if (isOpen && indexState.unifiedTipsPackage && indexState.unifiedTipsPackage.currentSession !== 'OFF_MARKET') {
                const utp = indexState.unifiedTipsPackage;
                if (utp.primaryTrade && utp.primaryTrade.confluenceScore >= 70 && utp.primaryTrade.entryPrice > 0) {
                    signalLedgerService.recordSignal({
                        symbol: symConfig.symbol,
                        strikePrice: utp.primaryTrade.strikePrice,
                        optionType: (utp.primaryTrade.optionType === 'SPREAD' ? 'CE' : utp.primaryTrade.optionType),
                        action: utp.primaryTrade.action,
                        signalSource: 'CONFLUENCE',
                        entryPrice: utp.primaryTrade.entryPrice,
                        target1Price: utp.primaryTrade.target1Price,
                        target2Price: utp.primaryTrade.target2Price,
                        stoplossPrice: utp.primaryTrade.stoplossPrice,
                        riskReward: utp.primaryTrade.riskReward,
                        notes: utp.primaryTrade.strategyTag
                    });
                }
                if (utp.gammaTrade && utp.gammaTrade.confluenceScore >= 80 && utp.gammaTrade.entryPrice > 0) {
                    signalLedgerService.recordSignal({
                        symbol: symConfig.symbol,
                        strikePrice: utp.gammaTrade.strikePrice,
                        optionType: (utp.gammaTrade.optionType === 'SPREAD' ? 'CE' : utp.gammaTrade.optionType),
                        action: utp.gammaTrade.action,
                        signalSource: 'HERO_ZERO',
                        entryPrice: utp.gammaTrade.entryPrice,
                        target1Price: utp.gammaTrade.target1Price,
                        target2Price: utp.gammaTrade.target2Price,
                        stoplossPrice: utp.gammaTrade.stoplossPrice,
                        riskReward: utp.gammaTrade.riskReward,
                        notes: utp.gammaTrade.strategyTag
                    });
                }
            }
            // If market is closed for this symbol, suppress active flash surge popups
            const broadcastSurges = isOpen ? newSurges : [];
            broadcast({
                type: 'INDEX_UPDATE',
                symbol: symConfig.symbol,
                indexState,
                newSurges: broadcastSurges,
                dataSource: usedSource,
                isMarketOpen: isNseMarketOpen(),
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (err) {
        console.warn(`[Poll] Error for ${symConfig.symbol}:`, err.message);
    }
};
// ── FAST-LANE WORKER (1.5s): Priority streaming for screen-active symbol(s) ───────
const pollFastLane = async () => {
    if (isFastLaneBusy)
        return;
    isFastLaneBusy = true;
    try {
        const targets = new Set();
        if (activeClients.size > 0) {
            for (const s of clientActiveSymbols.values()) {
                if (s)
                    targets.add(s);
            }
        }
        if (targets.size === 0) {
            targets.add(activeSymbol || 'NIFTY');
        }
        // Limit fast-lane concurrent symbols to at most 3 to protect broker rate limits
        const priorityList = Array.from(targets).slice(0, 3);
        for (const sym of priorityList) {
            const config = getSymbolConfig(sym);
            await fetchSymbolSnapshot(config);
        }
    }
    catch (err) {
        console.warn('[FastLane] Error:', err.message);
    }
    finally {
        isFastLaneBusy = false;
    }
};
// ── BATCH QUOTES WORKER (1.5s): Multi-symbol tick streaming across all watchlists ──
const pollBatchQuotes = async () => {
    if (isBatchQuotesBusy)
        return;
    if (currentDataSource !== 'FYERS_LIVE')
        return;
    isBatchQuotesBusy = true;
    try {
        const configs = Array.from(watchedSymbols).map(sym => getSymbolConfig(sym));
        const quotesMap = await fyersService.fetchBatchQuotes(configs);
        if (quotesMap.size > 0) {
            const quotesList = Array.from(quotesMap.values());
            broadcast({
                type: 'QUOTES_UPDATE',
                quotes: quotesList,
                timestamp: new Date().toISOString()
            });
            // Update spot prices and timestamps in cached states
            for (const q of quotesList) {
                const cached = cachedIndexStates.get(q.symbol);
                if (cached) {
                    const isOpen = isMarketOpenForSymbol(q.symbol);
                    cached.spotPrice = q.price;
                    cached.change = isOpen ? q.change : 0;
                    cached.pctChange = isOpen ? q.pctChange : 0;
                    cached.updatedAtIso = new Date().toISOString();
                }
            }
        }
    }
    catch (err) {
        console.warn('[BatchQuotes] Error:', err.message);
    }
    finally {
        isBatchQuotesBusy = false;
    }
};
// ── BACKGROUND WORKER (6-8s): Staggered round-robin for inactive symbols ─────────
let bgSymbolCursor = 0;
const pollBackgroundChains = async () => {
    if (isBgPollBusy)
        return;
    isBgPollBusy = true;
    try {
        const allSyms = Array.from(watchedSymbols);
        const activeSet = new Set(clientActiveSymbols.values());
        activeSet.add(activeSymbol);
        const bgSymbols = allSyms.filter(s => !activeSet.has(s));
        if (bgSymbols.length === 0)
            return;
        // Pick 2 background symbols per cycle
        const batchCount = Math.min(2, bgSymbols.length);
        for (let i = 0; i < batchCount; i++) {
            const idx = (bgSymbolCursor + i) % bgSymbols.length;
            const sym = bgSymbols[idx];
            const config = getSymbolConfig(sym);
            await fetchSymbolSnapshot(config);
            await new Promise(r => setTimeout(r, 350));
        }
        bgSymbolCursor = (bgSymbolCursor + batchCount) % bgSymbols.length;
    }
    catch (err) {
        console.warn('[BgPoll] Error:', err.message);
    }
    finally {
        isBgPollBusy = false;
    }
};
const stopAllPolling = () => {
    if (fastLaneTimer)
        clearInterval(fastLaneTimer);
    if (batchQuotesTimer)
        clearInterval(batchQuotesTimer);
    if (bgPollTimer)
        clearInterval(bgPollTimer);
    if (nsePollTimer)
        clearInterval(nsePollTimer);
    if (fyersPollTimer)
        clearInterval(fyersPollTimer);
    fastLaneTimer = null;
    batchQuotesTimer = null;
    bgPollTimer = null;
    nsePollTimer = null;
    fyersPollTimer = null;
};
const startFyersPolling = () => {
    stopAllPolling();
    console.log('[Stream] ⚡ Starting High-Speed Dual-Tier Fyers Stream (2.0s Fast-Lane + Batch Quotes)...');
    // Immediate initial run
    pollFastLane();
    pollBatchQuotes();
    // 1. Fast-lane active symbol loop (2.0s during market, 5s off-market)
    const fastInterval = isNseMarketOpen() ? 2000 : 5000;
    fastLaneTimer = setInterval(pollFastLane, fastInterval);
    // 2. High-speed batch quotes loop (2.0s during market, 6s off-market)
    const quotesInterval = isNseMarketOpen() ? 2000 : 6000;
    batchQuotesTimer = setInterval(pollBatchQuotes, quotesInterval);
    // 3. Staggered background option chains (8s)
    bgPollTimer = setInterval(pollBackgroundChains, 8000);
};
const startNsePolling = () => {
    stopAllPolling();
    console.log('[Stream] Starting NSE Polling (3.0s Active + 8s Background)...');
    pollFastLane();
    const fastInterval = isNseMarketOpen() ? 3000 : 7000;
    fastLaneTimer = setInterval(pollFastLane, fastInterval);
    bgPollTimer = setInterval(pollBackgroundChains, 8500);
};
// Start polling — use Fyers if configured, otherwise fall back to NSE
const hasFyersConfig = !!fyersService.getConfig().appId && !!fyersService.getConfig().accessToken;
if (hasFyersConfig) {
    currentDataSource = 'FYERS_LIVE';
    startFyersPolling();
}
else {
    currentDataSource = 'NSE_LIVE';
    startNsePolling();
}
// WebSocket connection lifecycle
wss.on('connection', async (ws) => {
    activeClients.add(ws);
    clientActiveSymbols.set(ws, activeSymbol);
    console.log(`[WS] Client connected. Total active: ${activeClients.size}`);
    ws.send(JSON.stringify({
        type: 'INITIAL_STATE',
        recentSurges: engine.getRecentSurges(30),
        recentNews: newsService.getRecentNews(25),
        globalIndices: globalIndicesService.getIndices(),
        globalMarketContext: globalMarketFeedService.getGlobalContext(),
        dataSource: currentDataSource,
        fyersConfig: fyersService.getConfig(),
        isMarketOpen: isNseMarketOpen(),
        allSymbolsConfig: ALL_SYMBOLS_CONFIG,
        timestamp: new Date().toISOString()
    }));
    // Only push cached states that are genuinely fresh (< 20s old).
    const now = Date.now();
    for (const [symbol, indexState] of cachedIndexStates.entries()) {
        if (ws.readyState !== WebSocket.OPEN)
            break;
        const ageMs = indexState?.updatedAtIso
            ? now - new Date(indexState.updatedAtIso).getTime()
            : Infinity;
        if (ageMs <= 20000) {
            ws.send(JSON.stringify({
                type: 'INDEX_UPDATE',
                symbol,
                indexState,
                newSurges: [],
                dataSource: currentDataSource,
                isMarketOpen: isNseMarketOpen(),
                timestamp: new Date().toISOString()
            }));
        }
    }
    // Handle incoming messages from clients (active symbol subscription, ping, etc.)
    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'SET_ACTIVE_SYMBOL' || msg.type === 'SUBSCRIBE_SYMBOL') {
                const sym = msg.symbol;
                if (sym && typeof sym === 'string') {
                    activeSymbol = sym;
                    clientActiveSymbols.set(ws, sym);
                    watchedSymbols.add(sym);
                    // Instantly fetch and push snapshot for newly selected symbol
                    const cfg = getSymbolConfig(sym);
                    await fetchSymbolSnapshot(cfg);
                }
            }
        }
        catch { }
    });
    // Immediately refresh active symbol for the new client
    (async () => {
        try {
            await fetchSymbolSnapshot(getSymbolConfig(activeSymbol));
        }
        catch { }
    })();
    ws.on('close', () => {
        activeClients.delete(ws);
        clientActiveSymbols.delete(ws);
        console.log(`[WS] Client disconnected. Total active: ${activeClients.size}`);
    });
    ws.on('error', (err) => {
        console.error('[WS] Error:', err);
        activeClients.delete(ws);
        clientActiveSymbols.delete(ws);
    });
});
// REST Endpoints
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        activeConnections: activeClients.size,
        dataSource: currentDataSource,
        isMarketOpen: isNseMarketOpen(),
        fyers: fyersService.getConfig()
    });
});
app.get('/api/symbols', (req, res) => {
    res.json(ALL_SYMBOLS_CONFIG);
});
app.get('/api/index-state', async (req, res) => {
    const symbol = req.query.symbol || 'NIFTY';
    let state = cachedIndexStates.get(symbol);
    if (!state) {
        const cfg = getSymbolConfig(symbol);
        await fetchSymbolSnapshot(cfg);
        state = cachedIndexStates.get(symbol);
    }
    res.json(state || null);
});
app.get('/api/index-states', (req, res) => {
    const obj = {};
    for (const [sym, st] of cachedIndexStates.entries()) {
        obj[sym] = st;
    }
    res.json(obj);
});
app.post('/api/symbol/watch', async (req, res) => {
    const { symbol } = req.body;
    if (!symbol)
        return res.status(400).json({ error: 'Missing symbol' });
    watchedSymbols.add(symbol);
    const cfg = getSymbolConfig(symbol);
    await fetchSymbolSnapshot(cfg);
    res.json({ success: true, symbol, state: cachedIndexStates.get(symbol) || null });
});
app.get('/api/news', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    res.json(newsService.getRecentNews(limit));
});
app.get('/api/surges', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    res.json(engine.getRecentSurges(limit));
});
app.get('/api/global-indices', (req, res) => {
    res.json(globalIndicesService.getIndices());
});
app.get('/api/global-market-context', (req, res) => {
    res.json(globalMarketFeedService.getGlobalContext());
});
// MCX Market Status Endpoint
app.get('/api/mcx-status', (req, res) => {
    const { isOpen, status } = McxOfflineService.getMcxStatus();
    res.json({
        isOpen,
        status, // 'OPEN' | 'CLOSED' | 'HOLIDAY' | 'PRE_OPEN'
        timestamp: new Date().toISOString()
    });
});
// MCX Offline Data Endpoint — after-hours settlement/closing prices
// Returns Gold, Silver, CrudeOil etc. from mcxindia.com / IBJA when market is closed
app.get('/api/mcx-offline', async (req, res) => {
    try {
        const data = await mcxOfflineService.getOfflineData();
        res.json(data);
    }
    catch (err) {
        console.error('[MCX-Offline] API error:', err.message);
        res.status(500).json({ error: 'Failed to fetch MCX offline data' });
    }
});
// =========================================================================
// TRADE JOURNAL & DATE-WISE PREDICTION REPORT API ENDPOINTS
// =========================================================================
// List of all recorded trading dates
app.get('/api/journal/dates', (req, res) => {
    try {
        const dates = signalLedgerService.getAvailableDates();
        res.json({ dates });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Full performance report with filters (date, asset category, symbol, status)
app.get('/api/journal/report', (req, res) => {
    try {
        const date = req.query.date;
        const category = req.query.category || 'ALL';
        const symbol = req.query.symbol;
        const status = req.query.status;
        const report = signalLedgerService.getReport(date, category, symbol, status);
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Record a trade call / prediction
app.post('/api/journal/record', (req, res) => {
    try {
        const { symbol, strikePrice, optionType, action, signalSource, entryPrice, target1Price, target2Price, stoplossPrice, riskReward, notes } = req.body;
        if (!symbol || !entryPrice || !target1Price || !stoplossPrice) {
            return res.status(400).json({ error: 'Missing required parameters for trade record' });
        }
        const recorded = signalLedgerService.recordSignal({
            symbol,
            strikePrice: strikePrice || 0,
            optionType: optionType || 'CE',
            action: action || 'BUY_CALL',
            signalSource: signalSource || 'CONFLUENCE',
            entryPrice: parseFloat(entryPrice),
            target1Price: parseFloat(target1Price),
            target2Price: target2Price ? parseFloat(target2Price) : undefined,
            stoplossPrice: parseFloat(stoplossPrice),
            riskReward,
            notes
        });
        res.json({ success: true, call: recorded });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Periodic broadcast of Global International Indices updates
setInterval(() => {
    if (activeClients.size > 0) {
        broadcast({
            type: 'GLOBAL_INDICES_UPDATE',
            globalIndices: globalIndicesService.getIndices(),
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
}, 4000);
app.post('/api/datasource', (req, res) => {
    const { mode } = req.body;
    if (mode === 'NSE_LIVE' || mode === 'FYERS_LIVE') {
        currentDataSource = mode;
        console.log(`[DataSource] Switched to ${mode}`);
        if (mode === 'NSE_LIVE') {
            startNsePolling();
        }
        else if (mode === 'FYERS_LIVE') {
            startFyersPolling();
        }
        broadcast({
            type: 'DATA_SOURCE_UPDATE',
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
        res.json({ success: true, dataSource: currentDataSource });
    }
    else {
        res.status(400).json({ error: 'Invalid mode. Use NSE_LIVE or FYERS_LIVE' });
    }
});
// Fyers Connection Endpoint
app.post('/api/fyers/connect', async (req, res) => {
    const { appId, accessToken, secretKey } = req.body;
    if (!appId || !accessToken) {
        return res.status(400).json({ error: 'Missing appId or accessToken' });
    }
    fyersService.setConfig(appId, accessToken, secretKey);
    const result = await fyersService.validateConnection();
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json(result);
});
// Fyers 1-Click OAuth Callback Endpoint (Auto-Capture & Exchange)
app.get('/api/fyers/callback', async (req, res) => {
    const authCode = (req.query.auth_code || req.query.code || req.query['auth-code']);
    const cfg = fyersService.getConfig();
    const appId = req.query.app_id || cfg.appId || 'KMSSMU5OGR-100';
    const secretKey = req.query.secret_key || cfg.secretKey || '';
    if (!authCode) {
        return res.status(400).send(`
      <html>
        <body style="background:#0b0e14;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:2rem;background:#151a24;border-radius:12px;border:1px solid #2d3748;max-width:450px;">
            <h2 style="margin-top:0;">⚠️ No Auth Code Found</h2>
            <p style="color:#94a3b8;font-size:14px;">Fyers did not pass an authorization code in the redirect URL.</p>
            <a href="/" style="color:#00e5ff;text-decoration:none;font-weight:bold;display:inline-block;margin-top:1rem;padding:8px 16px;background:rgba(0,229,255,0.1);border-radius:8px;border:1px solid rgba(0,229,255,0.3);">Back to Terminal</a>
          </div>
        </body>
      </html>
    `);
    }
    if (!secretKey) {
        // If secret key is not in server memory, redirect to frontend with auth_code query param so modal can auto-fill
        return res.redirect(`/?fyers_auth_code=${encodeURIComponent(authCode)}`);
    }
    const result = await fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
        return res.send(`
      <html>
        <head><title>Fyers Connected</title></head>
        <body style="background:#0b0e14;color:#00e5ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:2.5rem;background:#151a24;border-radius:16px;border:1px solid rgba(0,229,255,0.3);box-shadow:0 0 30px rgba(0,229,255,0.15);max-width:480px;">
            <div style="font-size:40px;margin-bottom:12px;">⚡</div>
            <h2 style="margin:0 0 8px;color:#fff;">Fyers Connected Successfully!</h2>
            <p style="color:#10b981;font-weight:bold;font-size:14px;margin:0 0 16px;">Welcome ${result.userName || 'Trader'} — Live Stream Active</p>
            <p style="color:#94a3b8;font-size:12px;margin:0 0 20px;">Your token has been exchanged and live exchange data is streaming.</p>
            <a href="/" style="display:inline-block;padding:10px 24px;background:#00e5ff;color:#0b0e14;font-weight:bold;font-size:13px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">Return to Dashboard &rarr;</a>
            <script>setTimeout(function(){ window.location.href = '/?fyers_connected=true'; }, 1500);</script>
          </div>
        </body>
      </html>
    `);
    }
    else {
        return res.status(400).send(`
      <html>
        <body style="background:#0b0e14;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:2rem;background:#151a24;border-radius:12px;border:1px solid #ef4444;max-width:480px;">
            <h2 style="margin-top:0;">❌ Fyers Auth Failed</h2>
            <p style="color:#cbd5e1;font-size:13px;">${result.message}</p>
            <a href="/" style="color:#00e5ff;text-decoration:none;font-weight:bold;display:inline-block;margin-top:1rem;padding:8px 16px;background:rgba(0,229,255,0.1);border-radius:8px;border:1px solid rgba(0,229,255,0.3);">Try Again</a>
          </div>
        </body>
      </html>
    `);
    }
});
// Manual Fyers Token Refresh Endpoint (uses stored refresh_token — no browser login needed)
app.post('/api/fyers/refresh-token', async (req, res) => {
    const result = await fyersService.refreshAccessToken();
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        fyersService.scheduleNextDailyRenewal();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json(result);
});
// Fyers Auth Code Exchanger Endpoint
app.post('/api/fyers/exchange-authcode', async (req, res) => {
    const { appId, secretKey, authCode } = req.body;
    if (!appId || !secretKey || !authCode) {
        return res.status(400).json({ success: false, message: 'Missing appId, secretKey, or authCode' });
    }
    const result = await fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json(result);
});
app.post('/api/expiry', (req, res) => {
    const { symbol, expiry } = req.body;
    if (symbol && expiry) {
        selectedExpiries.set(symbol, expiry);
        const cfg = getSymbolConfig(symbol);
        fetchSymbolSnapshot(cfg);
        res.json({ success: true, symbol, expiry });
    }
    else {
        res.status(400).json({ error: 'Missing symbol or expiry' });
    }
});
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`⚡ 100% Live Options OI Surge Radar Server listening on port ${PORT} (0.0.0.0)`);
    console.log(`📡 WebSocket stream active at ws://localhost:${PORT}/ws`);
    console.log(`📊 Data source: ${currentDataSource}`);
});
// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
});
