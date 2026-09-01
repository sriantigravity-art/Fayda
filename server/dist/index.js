"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNseMarketOpen = exports.isMarketOpenForSymbol = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const oiEngine_js_1 = require("./engine/oiEngine.js");
const nseService_js_1 = require("./services/nseService.js");
const fyersService_js_1 = require("./services/fyersService.js");
const newsService_js_1 = require("./services/newsService.js");
const globalIndicesService_js_1 = require("./services/globalIndicesService.js");
const globalMarketFeedService_js_1 = require("./services/globalMarketFeedService.js");
const mcxOfflineService_js_1 = require("./services/mcxOfflineService.js");
const signalLedgerService_js_1 = require("./services/signalLedgerService.js");
const types_js_1 = require("./types.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));
app.options('*', (0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
const engine = new oiEngine_js_1.OIEngine();
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
const isMarketOpenForSymbol = (symbol) => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6)
        return false;
    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const cfg = types_js_1.ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
    if (isCommodity) {
        return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
};
exports.isMarketOpenForSymbol = isMarketOpenForSymbol;
const isNseMarketOpen = () => (0, exports.isMarketOpenForSymbol)('NIFTY');
exports.isNseMarketOpen = isNseMarketOpen;
// Broadcast function to all active WS clients
const broadcast = (data) => {
    const payload = JSON.stringify(data);
    for (const client of activeClients) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    }
};
// Hook NewsService Callback to Broadcast Breaking Flash News to all clients
newsService_js_1.newsService.setCallback((newsItem) => {
    broadcast({
        type: 'FLASH_NEWS',
        newsItem,
        timestamp: new Date().toISOString()
    });
});
// Hook GlobalIndicesService Callback to Broadcast Live International & Indian Quotes
globalIndicesService_js_1.globalIndicesService.setCallback((globalIndices) => {
    broadcast({
        type: 'GLOBAL_INDICES_UPDATE',
        globalIndices,
        timestamp: new Date().toISOString()
    });
});
// Hook GlobalMarketFeedService Callback to Broadcast Global Risk & Macro Updates
globalMarketFeedService_js_1.globalMarketFeedService.onUpdate((globalMarketContext) => {
    broadcast({
        type: 'GLOBAL_MARKET_CONTEXT_UPDATE',
        globalMarketContext,
        timestamp: new Date().toISOString()
    });
});
const getSymbolConfig = (symbol) => {
    const found = types_js_1.ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
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
// Fetch single symbol snapshot
const fetchSymbolSnapshot = async (symConfig) => {
    try {
        const chosenExp = selectedExpiries.get(symConfig.symbol);
        let res = null;
        let usedSource = currentDataSource;
        if (currentDataSource === 'FYERS_LIVE') {
            res = await fyersService_js_1.fyersService.fetchOptionChain(symConfig.symbol, chosenExp);
        }
        // Seamless fallback to Official Exchange data if Fyers is not logged in or offline
        if (!res || !res.strikes || res.strikes.length === 0) {
            res = await nseService_js_1.nseService.fetchOptionChain(symConfig.symbol, chosenExp);
            usedSource = 'NSE_LIVE';
        }
        if (res && res.strikes.length > 0) {
            // Reconcile spot price & net change with official NSE/BSE quotes if missing or zero
            let spotPrice = res.spotPrice;
            let spotChange = res.spotChange ?? 0;
            let spotPctChange = res.spotPctChange ?? 0;
            if (spotPrice <= 0 || (spotChange === 0 && spotPctChange === 0)) {
                const officialQuote = await globalIndicesService_js_1.globalIndicesService.getSpotForSymbol(symConfig.symbol);
                if (officialQuote && officialQuote.spot > 0) {
                    if (spotPrice <= 0)
                        spotPrice = officialQuote.spot;
                    if (spotChange === 0)
                        spotChange = officialQuote.change;
                    if (spotPctChange === 0)
                        spotPctChange = officialQuote.pctChange;
                }
            }
            // Resolve India VIX: prefer Fyers feed, then globalIndicesService (NSE allIndices / Yahoo)
            let indiaVix = res.indiaVix && res.indiaVix > 0 ? res.indiaVix : undefined;
            if (!indiaVix) {
                const vixEntry = globalIndicesService_js_1.globalIndicesService.getIndices().find(i => i.id === 'INDIA_VIX');
                if (vixEntry && vixEntry.price > 0)
                    indiaVix = vixEntry.price;
            }
            const { indexState, newSurges } = engine.processSnapshot(symConfig.symbol, spotPrice, spotChange, spotPctChange, res.strikes, symConfig.step, symConfig.lot, symConfig.defaultRange, usedSource, res.expiryDates, res.selectedExpiry, res.totalCallOI, res.totalPutOI, indiaVix);
            cachedIndexStates.set(symConfig.symbol, indexState);
            // Track & update live LTP and target nearness in Signal Ledger
            signalLedgerService_js_1.signalLedgerService.updateLivePrices(symConfig.symbol, res.strikes);
            // Auto-record high-confluence trade recommendations during market hours
            const isOpen = (0, exports.isMarketOpenForSymbol)(symConfig.symbol);
            if (isOpen && newSurges && newSurges.length > 0) {
                for (const s of newSurges) {
                    if (s.surgeLevel === 'EXTREME' || s.surgeLevel === 'STRONG') {
                        const entryVal = typeof s.suggestedContract?.ltp === 'number' ? s.suggestedContract.ltp : s.ltp;
                        const targetVal = parseFloat(String(s.suggestedContract?.target || '').replace(/[^0-9.]/g, '')) || (entryVal * 1.35);
                        const slVal = parseFloat(String(s.suggestedContract?.stoploss || '').replace(/[^0-9.]/g, '')) || (entryVal * 0.82);
                        if (entryVal > 0 && targetVal > entryVal) {
                            signalLedgerService_js_1.signalLedgerService.recordSignal({
                                symbol: symConfig.symbol,
                                strikePrice: s.strikePrice,
                                optionType: s.optionType,
                                action: s.tradeAction === 'BUY_CALL' ? 'BUY_CALL' : 'BUY_PUT',
                                signalSource: 'OI_SURGE',
                                entryPrice: entryVal,
                                target1Price: targetVal,
                                stoplossPrice: slVal,
                                riskReward: s.suggestedContract?.riskReward || '1:2.4',
                                notes: s.actionDescription
                            });
                        }
                    }
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
                isMarketOpen: (0, exports.isNseMarketOpen)(),
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (err) {
        console.warn(`[Poll] Error for ${symConfig.symbol}:`, err.message);
    }
};
// Live Fyers Fetch / Stream Worker
const pollLiveFyers = async () => {
    if (currentDataSource !== 'FYERS_LIVE')
        return;
    const symbols = Array.from(watchedSymbols);
    for (const sym of symbols) {
        if (currentDataSource !== 'FYERS_LIVE')
            break;
        const config = getSymbolConfig(sym);
        await fetchSymbolSnapshot(config);
        await new Promise(r => setTimeout(r, 600));
    }
};
const startFyersPolling = () => {
    if (fyersPollTimer)
        clearInterval(fyersPollTimer);
    if (nsePollTimer)
        clearInterval(nsePollTimer);
    pollLiveFyers();
    const interval = (0, exports.isNseMarketOpen)() ? 5000 : 15000;
    fyersPollTimer = setInterval(pollLiveFyers, interval);
};
// Live NSE Polling Worker
const pollLiveNse = async () => {
    if (currentDataSource !== 'NSE_LIVE')
        return;
    for (const sym of Array.from(watchedSymbols)) {
        const config = getSymbolConfig(sym);
        await fetchSymbolSnapshot(config);
        await new Promise(r => setTimeout(r, 80));
    }
};
const startNsePolling = () => {
    if (nsePollTimer)
        clearInterval(nsePollTimer);
    if (fyersPollTimer)
        clearInterval(fyersPollTimer);
    pollLiveNse();
    const interval = (0, exports.isNseMarketOpen)() ? 4000 : 8000;
    nsePollTimer = setInterval(pollLiveNse, interval);
};
// Start polling — use Fyers if configured, otherwise fall back to NSE
const hasFyersConfig = !!fyersService_js_1.fyersService.getConfig().appId && !!fyersService_js_1.fyersService.getConfig().accessToken;
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
    console.log(`[WS] Client connected. Total active: ${activeClients.size}`);
    ws.send(JSON.stringify({
        type: 'INITIAL_STATE',
        recentSurges: engine.getRecentSurges(30),
        recentNews: newsService_js_1.newsService.getRecentNews(25),
        globalIndices: globalIndicesService_js_1.globalIndicesService.getIndices(),
        globalMarketContext: globalMarketFeedService_js_1.globalMarketFeedService.getGlobalContext(),
        dataSource: currentDataSource,
        fyersConfig: fyersService_js_1.fyersService.getConfig(),
        isMarketOpen: (0, exports.isNseMarketOpen)(),
        allSymbolsConfig: types_js_1.ALL_SYMBOLS_CONFIG,
        timestamp: new Date().toISOString()
    }));
    // If cached states are not yet populated, populate NIFTY immediately
    if (cachedIndexStates.size === 0) {
        await fetchSymbolSnapshot(getSymbolConfig('NIFTY'));
    }
    // Immediately push all cached snapshots to the newly connected client
    for (const [symbol, indexState] of cachedIndexStates.entries()) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'INDEX_UPDATE',
                symbol,
                indexState,
                newSurges: [],
                dataSource: currentDataSource,
                isMarketOpen: (0, exports.isNseMarketOpen)(),
                timestamp: new Date().toISOString()
            }));
        }
    }
    ws.on('close', () => {
        activeClients.delete(ws);
        console.log(`[WS] Client disconnected. Total active: ${activeClients.size}`);
    });
    ws.on('error', (err) => {
        console.error('[WS] Error:', err);
        activeClients.delete(ws);
    });
});
// REST Endpoints
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        activeConnections: activeClients.size,
        dataSource: currentDataSource,
        isMarketOpen: (0, exports.isNseMarketOpen)(),
        fyers: fyersService_js_1.fyersService.getConfig()
    });
});
app.get('/api/symbols', (req, res) => {
    res.json(types_js_1.ALL_SYMBOLS_CONFIG);
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
    res.json(newsService_js_1.newsService.getRecentNews(limit));
});
app.get('/api/surges', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    res.json(engine.getRecentSurges(limit));
});
app.get('/api/global-indices', (req, res) => {
    res.json(globalIndicesService_js_1.globalIndicesService.getIndices());
});
app.get('/api/global-market-context', (req, res) => {
    res.json(globalMarketFeedService_js_1.globalMarketFeedService.getGlobalContext());
});
// MCX Market Status Endpoint
app.get('/api/mcx-status', (req, res) => {
    const { isOpen, status } = mcxOfflineService_js_1.McxOfflineService.getMcxStatus();
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
        const data = await mcxOfflineService_js_1.mcxOfflineService.getOfflineData();
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
        const dates = signalLedgerService_js_1.signalLedgerService.getAvailableDates();
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
        const report = signalLedgerService_js_1.signalLedgerService.getReport(date, category, symbol, status);
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
        const recorded = signalLedgerService_js_1.signalLedgerService.recordSignal({
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
            globalIndices: globalIndicesService_js_1.globalIndicesService.getIndices(),
            isMarketOpen: (0, exports.isNseMarketOpen)(),
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
            isMarketOpen: (0, exports.isNseMarketOpen)(),
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
    fyersService_js_1.fyersService.setConfig(appId, accessToken, secretKey);
    const result = await fyersService_js_1.fyersService.validateConnection();
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService_js_1.fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: (0, exports.isNseMarketOpen)(),
            timestamp: new Date().toISOString()
        });
    }
    res.json(result);
});
// Fyers 1-Click OAuth Callback Endpoint (Auto-Capture & Exchange)
app.get('/api/fyers/callback', async (req, res) => {
    const authCode = (req.query.auth_code || req.query.code || req.query['auth-code']);
    const cfg = fyersService_js_1.fyersService.getConfig();
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
    const result = await fyersService_js_1.fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService_js_1.fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: (0, exports.isNseMarketOpen)(),
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
// Fyers Auth Code Exchanger Endpoint
app.post('/api/fyers/exchange-authcode', async (req, res) => {
    const { appId, secretKey, authCode } = req.body;
    if (!appId || !secretKey || !authCode) {
        return res.status(400).json({ success: false, message: 'Missing appId, secretKey, or authCode' });
    }
    const result = await fyersService_js_1.fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'FYERS_STATUS',
            fyersConfig: fyersService_js_1.fyersService.getConfig(),
            dataSource: currentDataSource,
            isMarketOpen: (0, exports.isNseMarketOpen)(),
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
