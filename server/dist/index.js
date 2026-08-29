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
const types_js_1 = require("./types.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now; restrict after confirming Vercel URL
    },
    credentials: true
}));
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
        // Seamless fallback to Official Exchange EOD data if Fyers is not logged in or offline
        if (!res || !res.strikes || res.strikes.length === 0) {
            res = await nseService_js_1.nseService.fetchOptionChain(symConfig.symbol, chosenExp);
            usedSource = 'NSE_LIVE';
        }
        if (res && res.strikes.length > 0) {
            const { indexState, newSurges } = engine.processSnapshot(symConfig.symbol, res.spotPrice, res.spotChange ?? 0, res.spotPctChange ?? 0, res.strikes, symConfig.step, symConfig.lot, symConfig.defaultRange, usedSource, res.expiryDates, res.selectedExpiry, res.totalCallOI, res.totalPutOI);
            cachedIndexStates.set(symConfig.symbol, indexState);
            broadcast({
                type: 'INDEX_UPDATE',
                symbol: symConfig.symbol,
                indexState,
                newSurges: newSurges,
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
    for (const sym of Array.from(watchedSymbols)) {
        const config = getSymbolConfig(sym);
        await fetchSymbolSnapshot(config);
        await new Promise(r => setTimeout(r, 120));
    }
};
const startFyersPolling = () => {
    if (fyersPollTimer)
        clearInterval(fyersPollTimer);
    if (nsePollTimer)
        clearInterval(nsePollTimer);
    pollLiveFyers();
    const interval = (0, exports.isNseMarketOpen)() ? 3000 : 30000;
    fyersPollTimer = setInterval(pollLiveFyers, interval);
};
// Live NSE Polling Worker
const pollLiveNse = async () => {
    if (currentDataSource !== 'NSE_LIVE')
        return;
    for (const sym of Array.from(watchedSymbols)) {
        const config = getSymbolConfig(sym);
        await fetchSymbolSnapshot(config);
    }
};
const startNsePolling = () => {
    if (nsePollTimer)
        clearInterval(nsePollTimer);
    if (fyersPollTimer)
        clearInterval(fyersPollTimer);
    pollLiveNse();
    nsePollTimer = setInterval(pollLiveNse, 15000);
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
server.listen(PORT, () => {
    console.log(`⚡ 100% Live Options OI Surge Radar Server listening on port ${PORT}`);
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
