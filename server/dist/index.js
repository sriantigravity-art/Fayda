import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { OIEngine } from './engine/oiEngine.js';
import { nseService } from './services/nseService.js';
import { fyersService } from './services/fyersService.js';
import { dhanService } from './services/dhanService.js';
import { brokerManager } from './services/brokerManager.js';
import { newsService } from './services/newsService.js';
import { globalIndicesService } from './services/globalIndicesService.js';
import { globalMarketFeedService } from './services/globalMarketFeedService.js';
import { mcxOfflineService, McxOfflineService } from './services/mcxOfflineService.js';
import { signalLedgerService } from './services/signalLedgerService.js';
import { subscriberService } from './services/subscriberService.js';
import { subscriptionPlanService } from './services/subscriptionPlanService.js';
import { subscriptionHistoryService } from './services/subscriptionHistoryService.js';
import { notificationService } from './services/notificationService.js';
import { bseService } from './services/bseService.js';
import { ALL_SYMBOLS_CONFIG } from './types.js';
const app = express();
const PORT = process.env.PORT || 3001;
// Admin authentication key for mutating configuration and broker management
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'fayda-terminal-admin-2026';
const requireAdminAuth = (req, res, next) => {
    const providedKey = req.headers['x-admin-key'];
    // Strict check if running in production with explicit secret configured
    if (process.env.NODE_ENV === 'production' && process.env.ADMIN_SECRET_KEY) {
        if (providedKey !== process.env.ADMIN_SECRET_KEY) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid administrative authorization key.' });
        }
        return next();
    }
    // Allow if valid admin key is supplied
    if (providedKey === ADMIN_KEY) {
        return next();
    }
    // In local development / intranet, allow requests from localhost
    const origin = (req.headers.origin || req.headers.host || '');
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized: Administrative operations require an authorization key.' });
};
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'https://fayda-alpha.vercel.app'];
// Security Headers via Helmet
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
// Whitelist CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-admin-key']
}));
// Rate limiting: General API endpoints
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this client, please slow down.' }
});
app.use('/api/', apiLimiter);
// Sensitive endpoints limiter (broker auth, switches)
const brokerAuthLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many broker requests. Please wait a minute.' }
});
app.use('/api/fyers/', brokerAuthLimiter);
app.use('/api/dhan/', brokerAuthLimiter);
app.use('/api/broker/', brokerAuthLimiter);
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
// Cache of already flashed high-probability trade IDs to avoid duplicate flash popups
const flashedHighProbTipIds = new Set();
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
// Hook FyersService connection & token callbacks — activate FYERS streaming and broadcast state
fyersService.onConnected = () => {
    console.log('[Fyers] Connected / Credentials loaded — activating FYERS streaming...');
    brokerManager.setActiveBroker('FYERS');
    currentDataSource = 'FYERS_LIVE';
    startFyersPolling();
    broadcast({
        type: 'BROKER_UPDATE',
        fyersConfig: fyersService.getPublicConfig(),
        dhanConfig: dhanService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
        dataSource: currentDataSource,
        isMarketOpen: isNseMarketOpen(),
        timestamp: new Date().toISOString()
    });
};
fyersService.onTokenRenewed = () => {
    console.log('[Fyers] Broadcasting auto-renewed token state to all clients...');
    brokerManager.setActiveBroker('FYERS');
    broadcast({
        type: 'BROKER_UPDATE',
        fyersConfig: fyersService.getPublicConfig(),
        dhanConfig: dhanService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
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
        fyersConfig: fyersService.getPublicConfig(),
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
        const effective = brokerManager.getEffectiveLiveBroker();
        if (effective === 'DHAN') {
            res = await dhanService.fetchOptionChain(symConfig.symbol, chosenExp);
            if (res && res.strikes && res.strikes.length > 0) {
                usedSource = 'DHAN_LIVE';
            }
        }
        else if (effective === 'FYERS' || currentDataSource === 'FYERS_LIVE') {
            res = await fyersService.fetchOptionChain(symConfig.symbol, chosenExp);
            if (res && res.strikes && res.strikes.length > 0) {
                usedSource = 'FYERS_LIVE';
            }
            else {
                // If Fyers returned null / rate-limited, use cached chain if available
                const cachedChain = fyersService.getCachedOptionChain(symConfig.symbol);
                if (cachedChain && cachedChain.strikes && cachedChain.strikes.length > 0) {
                    res = cachedChain;
                    usedSource = 'FYERS_LIVE';
                }
                else {
                    // Instant calibrated structure around live spot with 0ms timeout (never hang on NSE)
                    const spotQuote = await globalIndicesService.getSpotForSymbol(symConfig.symbol);
                    if (spotQuote && spotQuote.spot > 0) {
                        const calRes = nseService.buildCalibratedStructure(symConfig.symbol, chosenExp);
                        calRes.spotPrice = spotQuote.spot;
                        calRes.spotChange = spotQuote.change;
                        calRes.spotPctChange = spotQuote.pctChange;
                        res = calRes;
                        usedSource = 'FYERS_LIVE';
                    }
                }
            }
        }
        // Seamless fallback to Official Exchange data ONLY IF NO BROKER IS CONNECTED
        if ((!res || !res.strikes || res.strikes.length === 0) && !effective) {
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
            // Purge ghost 84.80 delta across all assets
            if (typeof spotChange === 'number' && Math.abs(spotChange - 84.80) < 0.05) {
                spotChange = 0;
                spotPctChange = 0;
            }
            // Zero out change values if market is closed for this symbol
            const isOpen = isMarketOpenForSymbol(symConfig.symbol);
            if (!isOpen) {
                spotChange = 0;
                spotPctChange = 0;
            }
            // ── Sticky change: if market is open but new poll returned change=0,
            //    keep the last known non-zero value from cache to prevent flickering.
            //    Fyers options-chain v3 sometimes returns ltpch=null on the first
            //    fetch or when data is partially populated, causing a brief 0 flash.
            if (isOpen && spotChange === 0 && spotPctChange === 0) {
                const prev = cachedIndexStates.get(symConfig.symbol);
                if (prev && typeof prev.change === 'number' && prev.change !== 0 && Math.abs(prev.change - 84.80) >= 0.05) {
                    spotChange = prev.change;
                    spotPctChange = prev.pctChange ?? 0;
                }
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
            // Apply institutional quality gating:
            // 1. Cooling period: avoid opening auction noise before 09:25 AM IST
            // 2. High-conviction threshold: confluenceScore >= 80
            // 3. Minimum premium floor: avoids illiquid penny strikes prone to instant stop-outs
            // 4. VWAP / Trend alignment check: prevents counter-trend trap entries
            const nowUtc = Date.now();
            const istMinutes = Math.floor(((nowUtc + (5.5 * 3600 * 1000)) % 86400000) / 60000);
            const isPastOpeningNoise = istMinutes >= (9 * 60 + 25); // After 09:25 AM IST
            if (isOpen && isPastOpeningNoise && indexState.unifiedTipsPackage && indexState.unifiedTipsPackage.currentSession !== 'OFF_MARKET') {
                const utp = indexState.unifiedTipsPackage;
                const minEntryPrice = symConfig.isIndex ? 15 : 2.5;
                if (utp.primaryTrade && utp.primaryTrade.confluenceScore >= 80 && utp.primaryTrade.entryPrice >= minEntryPrice) {
                    const tech = indexState.technicalIndicators;
                    const spot = indexState.spotPrice;
                    const vwap = tech?.vwap?.value;
                    const isCall = utp.primaryTrade.action === 'BUY_CALL';
                    const isPut = utp.primaryTrade.action === 'BUY_PUT';
                    let isTrendAligned = true;
                    if (vwap && spot) {
                        if (isCall && spot < vwap * 0.997)
                            isTrendAligned = false; // Spot below VWAP: reject Call
                        if (isPut && spot > vwap * 1.003)
                            isTrendAligned = false; // Spot above VWAP: reject Put
                    }
                    if (isTrendAligned) {
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
                }
                if (utp.gammaTrade && utp.gammaTrade.confluenceScore >= 80 && utp.gammaTrade.entryPrice >= minEntryPrice) {
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
                // Broadcast dedicated High-Probability Flash when new Top Call / Put triggers
                if (isOpen && utp.topCallTrade && utp.topCallTrade.confluenceScore >= 85 && !flashedHighProbTipIds.has(utp.topCallTrade.id)) {
                    flashedHighProbTipIds.add(utp.topCallTrade.id);
                    broadcast({
                        type: 'HIGH_PROB_FLASH',
                        highProbFlash: {
                            id: utp.topCallTrade.id,
                            symbol: symConfig.symbol,
                            tip: utp.topCallTrade,
                            direction: 'CALL',
                            timestamp: new Date().toISOString()
                        },
                        isMarketOpen: isNseMarketOpen(),
                        timestamp: new Date().toISOString()
                    });
                }
                if (isOpen && utp.topPutTrade && utp.topPutTrade.confluenceScore >= 85 && !flashedHighProbTipIds.has(utp.topPutTrade.id)) {
                    flashedHighProbTipIds.add(utp.topPutTrade.id);
                    broadcast({
                        type: 'HIGH_PROB_FLASH',
                        highProbFlash: {
                            id: utp.topPutTrade.id,
                            symbol: symConfig.symbol,
                            tip: utp.topPutTrade,
                            direction: 'PUT',
                            timestamp: new Date().toISOString()
                        },
                        isMarketOpen: isNseMarketOpen(),
                        timestamp: new Date().toISOString()
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
        console.warn(`[Poll] Error for ${symConfig.symbol}:`, err.stack || err.message);
    }
};
// ── FAST-LANE WORKER (2.5s): Priority streaming for screen-active symbol ───────
const pollFastLane = async () => {
    if (isFastLaneBusy)
        return;
    isFastLaneBusy = true;
    try {
        const targetSym = activeSymbol || 'NIFTY';
        const config = getSymbolConfig(targetSym);
        await fetchSymbolSnapshot(config);
    }
    catch (err) {
        console.warn('[FastLane] Error:', err.message);
    }
    finally {
        isFastLaneBusy = false;
    }
};
// ── BATCH QUOTES WORKER (2.0s): Multi-symbol tick streaming across all watchlists ──
const pollBatchQuotes = async () => {
    if (isBatchQuotesBusy)
        return;
    const effective = brokerManager.getEffectiveLiveBroker();
    if (currentDataSource !== 'FYERS_LIVE' && effective !== 'FYERS')
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
                if (typeof q.change === 'number' && Math.abs(q.change - 84.80) < 0.05) {
                    q.change = 0;
                    q.pctChange = 0;
                }
                const cached = cachedIndexStates.get(q.symbol);
                if (cached) {
                    const isOpen = isMarketOpenForSymbol(q.symbol);
                    cached.spotPrice = q.price;
                    // Sticky change: if market is open but quotes returned change=0, keep last known value
                    if (isOpen && q.change !== 0 && Math.abs(q.change - 84.80) >= 0.05) {
                        cached.change = q.change;
                        cached.pctChange = q.pctChange;
                    }
                    else if (!isOpen) {
                        cached.change = 0;
                        cached.pctChange = 0;
                    }
                    // If isOpen && q.change === 0: leave cached.change as-is (sticky)
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
    // 1. Fast-lane active symbol loop (2.5s during market, 5s off-market)
    const fastInterval = isNseMarketOpen() ? 2500 : 5000;
    fastLaneTimer = setInterval(pollFastLane, fastInterval);
    // 2. High-speed batch quotes loop (2.0s during market, 5s off-market)
    const quotesInterval = isNseMarketOpen() ? 2000 : 5000;
    batchQuotesTimer = setInterval(pollBatchQuotes, quotesInterval);
    // 3. Staggered background option chains (9s)
    bgPollTimer = setInterval(pollBackgroundChains, 9000);
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
    brokerManager.setActiveBroker('FYERS');
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
        fyersConfig: fyersService.getPublicConfig(),
        dhanConfig: dhanService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
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
        if (st && typeof st.change === 'number' && Math.abs(st.change - 84.80) < 0.05) {
            obj[sym] = { ...st, change: 0, pctChange: 0 };
        }
        else {
            obj[sym] = st;
        }
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
// ── Admin: Reset all cached tips & ledger — forces fresh re-evaluation ──────
app.post('/api/admin/reset-session', requireAdminAuth, (req, res) => {
    try {
        // 1. Clear in-memory index state cache (holds yesterday's unifiedTipsPackage)
        cachedIndexStates.clear();
        flashedHighProbTipIds.clear();
        // 2. Clear the signals ledger (in-memory + file)
        signalLedgerService.clearAll();
        console.log('[Admin] Session reset: cleared cachedIndexStates, flashedHighProbTipIds, and signals ledger.');
        res.json({ success: true, message: 'Session reset complete. Fresh tips will generate on next market poll.' });
    }
    catch (err) {
        console.error('[Admin] Reset failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/datasource', requireAdminAuth, (req, res) => {
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
// ── SUBSCRIBER AUTH ENDPOINTS ─────────────────────────────────────────────────
/** JWT middleware for protected subscriber routes */
const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token)
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    const payload = subscriberService.verifyToken(token);
    if (!payload)
        return res.status(401).json({ success: false, error: 'Invalid or expired session. Please sign in again.' });
    req.authPayload = payload;
    next();
};
const requireSuperAdmin = (req, res, next) => {
    const payload = req.authPayload;
    if (!payload || payload.role !== 'SUPERADMIN')
        return res.status(403).json({ success: false, error: 'SuperAdmin access required.' });
    next();
};
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, mobile, password, plan } = req.body;
        if (!fullName || !email || !mobile || !password) {
            return res.status(400).json({ success: false, error: 'Full name, email, mobile, and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
        }
        const result = await subscriberService.register({ fullName, email, mobile, password, plan });
        if (!result.success)
            return res.status(409).json(result);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { emailOrMobile, password } = req.body;
        if (!emailOrMobile || !password) {
            return res.status(400).json({ success: false, error: 'Email/mobile and password are required.' });
        }
        const result = await subscriberService.login(emailOrMobile, password);
        if (!result.success)
            return res.status(401).json(result);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/auth/me — fetch own profile
app.get('/api/auth/me', requireAuth, (req, res) => {
    const payload = req.authPayload;
    const sub = subscriberService.getById(payload.subscriberId);
    if (!sub)
        return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, subscriber: sub });
});
// PATCH /api/auth/me — update own profile (name, optins)
app.patch('/api/auth/me', requireAuth, (req, res) => {
    const payload = req.authPayload;
    const { fullName, emailOptIn, whatsappOptIn, smsOptIn } = req.body;
    const updated = subscriberService.update(payload.subscriberId, { fullName, emailOptIn, whatsappOptIn, smsOptIn });
    if (!updated)
        return res.status(404).json({ success: false, error: 'User not found.' });
    res.json({ success: true, subscriber: updated });
});
// POST /api/auth/change-password — update own password with current password verification
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const payload = req.authPayload;
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
        }
        const result = await subscriberService.changePassword(payload.subscriberId, currentPassword, newPassword);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json({ success: true, message: 'Password updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ── SUBSCRIPTION ENGINE ENDPOINTS (PUBLIC & AUTHENTICATED) ──────────────────
// GET /api/subscriptions/plans — active plans for user selection
app.get('/api/subscriptions/plans', (_req, res) => {
    try {
        const plans = subscriptionPlanService.getActivePlans();
        res.json({ success: true, plans });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/subscriptions/subscribe-fast — ultra-low-friction signup/checkout
app.post('/api/subscriptions/subscribe-fast', async (req, res) => {
    try {
        const { fullName, email, mobile, plan, billingCycle, autoLogin, paymentMethod } = req.body;
        if (!email && !mobile) {
            return res.status(400).json({ success: false, error: 'Mobile or Email is required.' });
        }
        const result = await subscriberService.subscribeFast({
            fullName,
            email,
            mobile,
            plan,
            billingCycle,
            autoLogin: autoLogin !== false,
            paymentMethod,
        });
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/subscriptions/upgrade-renew — 1-click upgrade/renew for authenticated user or recognized subscriber
app.post('/api/subscriptions/upgrade-renew', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        let targetSubscriberId = null;
        let targetSub = null;
        if (token) {
            const payload = subscriberService.verifyToken(token);
            if (payload) {
                targetSubscriberId = payload.subscriberId;
                targetSub = subscriberService.getById(targetSubscriberId);
            }
        }
        // If token not provided or expired, check body email/mobile/subscriberId/userId
        if (!targetSubscriberId) {
            const identifier = req.body.email || req.body.mobile || req.body.subscriberId || req.body.userId;
            if (identifier) {
                targetSub = subscriberService.findByIdOrContact(identifier);
                if (targetSub) {
                    targetSubscriberId = targetSub.id;
                }
            }
        }
        const { plan, billingCycle, paymentMethod, fullName, email, mobile } = req.body;
        if (!plan) {
            return res.status(400).json({ success: false, error: 'Target plan is required.' });
        }
        // If still no subscriber could be matched, forward seamlessly to subscribeFast
        if (!targetSubscriberId) {
            if (email || mobile) {
                const fastResult = await subscriberService.subscribeFast({
                    fullName,
                    email,
                    mobile,
                    plan,
                    billingCycle,
                    paymentMethod,
                    autoLogin: true
                });
                return res.json(fastResult);
            }
            return res.status(401).json({ success: false, error: 'Authentication required. Please sign in or provide email/mobile.' });
        }
        const result = await subscriberService.upgradeOrRenew(targetSubscriberId, {
            plan,
            billingCycle,
            paymentMethod,
        });
        if (!result.success) {
            return res.status(400).json(result);
        }
        // Also issue a fresh token so client session stays active
        const fullSub = subscriberService.findByIdOrContact(targetSubscriberId);
        const newToken = fullSub ? subscriberService.issueToken(fullSub) : undefined;
        res.json({
            ...result,
            token: newToken
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/subscriptions/my-subscription — current user's plan, days remaining, history
app.get('/api/subscriptions/my-subscription', requireAuth, (req, res) => {
    try {
        const payload = req.authPayload;
        const sub = subscriberService.getById(payload.subscriberId);
        if (!sub)
            return res.status(404).json({ success: false, error: 'Subscriber not found.' });
        const plan = subscriptionPlanService.getPlanById(sub.plan);
        const history = subscriptionHistoryService.getBySubscriberId(sub.id);
        const daysRemaining = sub.planExpiry ? Math.max(0, Math.ceil((new Date(sub.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
        res.json({
            success: true,
            subscriber: sub,
            planDetails: plan,
            daysRemaining,
            history,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// PATCH /api/auth/extended-profile — optional post-subscription profile completion
app.patch('/api/auth/extended-profile', requireAuth, (req, res) => {
    try {
        const payload = req.authPayload;
        const updated = subscriberService.updateExtendedProfile(payload.subscriberId, req.body);
        if (!updated)
            return res.status(404).json({ success: false, error: 'Subscriber not found.' });
        res.json({
            success: true,
            subscriber: updated,
            profileCompletionPct: subscriberService.calculateProfileCompletion(updated),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ── SUPERADMIN: SUBSCRIBER MANAGEMENT ────────────────────────────────────────
// GET /api/admin/subscribers — list all
app.get('/api/admin/subscribers', requireAuth, requireSuperAdmin, (req, res) => {
    res.json({ success: true, subscribers: subscriberService.getAll(), stats: subscriberService.getStats() });
});
// PATCH /api/admin/subscribers/:id — update any field
app.patch('/api/admin/subscribers/:id', requireAuth, requireSuperAdmin, (req, res) => {
    const updated = subscriberService.update(req.params.id, req.body);
    if (!updated)
        return res.status(404).json({ success: false, error: 'Subscriber not found.' });
    res.json({ success: true, subscriber: updated });
});
// POST /api/admin/subscribers/:id/reset-password
app.post('/api/admin/subscribers/:id/reset-password', requireAuth, requireSuperAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
    }
    const ok = await subscriberService.resetPassword(req.params.id, newPassword);
    if (!ok)
        return res.status(404).json({ success: false, error: 'Subscriber not found.' });
    res.json({ success: true, message: 'Password reset successfully.' });
});
// DELETE /api/admin/subscribers/:id
app.delete('/api/admin/subscribers/:id', requireAuth, requireSuperAdmin, (req, res) => {
    const ok = subscriberService.delete(req.params.id);
    if (!ok)
        return res.status(400).json({ success: false, error: 'Cannot delete this subscriber.' });
    res.json({ success: true });
});
// GET /api/admin/subscription-plans — list all plan configs
app.get('/api/admin/subscription-plans', requireAuth, requireSuperAdmin, (_req, res) => {
    res.json({ success: true, plans: subscriptionPlanService.getAllPlans() });
});
// PUT /api/admin/subscription-plans/:planId — edit plan config (pricing, features, status)
app.put('/api/admin/subscription-plans/:planId', requireAuth, requireSuperAdmin, (req, res) => {
    try {
        const updated = subscriptionPlanService.updatePlan(req.params.planId, req.body);
        if (!updated)
            return res.status(404).json({ success: false, error: 'Plan not found.' });
        res.json({ success: true, plan: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/admin/subscription-history — audit trail
app.get('/api/admin/subscription-history', requireAuth, requireSuperAdmin, (req, res) => {
    const subscriberId = req.query.subscriberId;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    if (subscriberId) {
        res.json({ success: true, history: subscriptionHistoryService.getBySubscriberId(subscriberId) });
    }
    else {
        res.json({ success: true, history: subscriptionHistoryService.getAll(limit) });
    }
});
// POST /api/admin/subscribers/:id/manual-subscription — manual plan override/extend
app.post('/api/admin/subscribers/:id/manual-subscription', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { plan, billingCycle, expiryDate, subscriptionStatus, notes } = req.body;
        const sub = subscriberService.getById(req.params.id);
        if (!sub)
            return res.status(404).json({ success: false, error: 'Subscriber not found.' });
        const updateData = {};
        if (plan)
            updateData.plan = plan;
        if (billingCycle)
            updateData.billingCycle = billingCycle;
        if (expiryDate)
            updateData.planExpiry = expiryDate;
        if (subscriptionStatus)
            updateData.subscriptionStatus = subscriptionStatus;
        const updated = subscriberService.update(req.params.id, updateData);
        if (updated) {
            subscriptionHistoryService.record({
                subscriberId: updated.subscriberId,
                userId: updated.id,
                action: 'ADMIN_OVERRIDE',
                oldPlan: sub.plan,
                newPlan: updated.plan,
                billingCycle: updated.billingCycle || 'MONTHLY',
                amount: 0,
                taxAmount: 0,
                paymentReference: 'ADMIN_MANUAL_OVERRIDE',
                performedBy: req.authPayload?.subscriberId || 'SUPERADMIN',
                notes: notes || 'Admin manual subscription adjustment',
            });
        }
        res.json({ success: true, subscriber: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ── SUPERADMIN: SIGNAL MANAGEMENT ─────────────────────────────────────────────
// GET /api/admin/signals
app.get('/api/admin/signals', requireAuth, requireSuperAdmin, (req, res) => {
    const date = req.query.date;
    const signals = signalLedgerService.getAllSignals(date);
    res.json({ success: true, signals });
});
// DELETE /api/admin/signal/:id
app.delete('/api/admin/signal/:id', requireAuth, requireSuperAdmin, (req, res) => {
    const ok = signalLedgerService.deleteSignal(req.params.id);
    if (!ok)
        return res.status(404).json({ success: false, error: 'Signal not found.' });
    broadcast({ type: 'SIGNAL_DELETED', signalId: req.params.id, timestamp: new Date().toISOString() });
    res.json({ success: true });
});
// PATCH /api/admin/signal/:id/action
app.patch('/api/admin/signal/:id/action', requireAuth, requireSuperAdmin, (req, res) => {
    const { action, exitPrice, adminNotes } = req.body;
    if (!action)
        return res.status(400).json({ success: false, error: 'Action is required.' });
    const updated = signalLedgerService.applyAdminAction(req.params.id, action, exitPrice, adminNotes);
    if (!updated)
        return res.status(404).json({ success: false, error: 'Signal not found.' });
    broadcast({ type: 'SIGNAL_UPDATED', signal: updated, timestamp: new Date().toISOString() });
    res.json({ success: true, signal: updated });
});
// ── BROADCAST ─────────────────────────────────────────────────────────────────
// POST /api/admin/broadcast
app.post('/api/admin/broadcast', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const payload = req.body;
        if (!payload.channels || payload.channels.length === 0) {
            return res.status(400).json({ success: false, error: 'Select at least one broadcast channel.' });
        }
        // Fetch signal if signalId provided
        let signal = {};
        if (payload.signalId) {
            const signals = signalLedgerService.getAllSignals();
            signal = signals.find(s => s.id === payload.signalId) || {};
        }
        // Override toNumbers from subscriber opt-in list
        const config = notificationService.getConfig();
        const planFilter = payload.planFilter && payload.planFilter.length > 0 ? payload.planFilter : undefined;
        if (payload.channels.includes('WHATSAPP')) {
            const waSubscribers = subscriberService.getOptedIn('WHATSAPP', planFilter);
            config.whatsapp = { ...config.whatsapp, phoneNumberId: config.whatsapp?.phoneNumberId || '', accessToken: config.whatsapp?.accessToken || '', toNumbers: waSubscribers.map(s => s.mobile) };
        }
        if (payload.channels.includes('SMS')) {
            const smsSubscribers = subscriberService.getOptedIn('SMS', planFilter);
            config.twilio = { ...config.twilio, accountSid: config.twilio?.accountSid || '', authToken: config.twilio?.authToken || '', fromNumber: config.twilio?.fromNumber || '', toNumbers: smsSubscribers.map(s => s.mobile) };
        }
        if (payload.channels.includes('EMAIL')) {
            const emailSubs = subscriberService.getOptedIn('EMAIL', planFilter);
            config.emailRecipients = emailSubs.map(s => s.email);
        }
        // Temporarily merge subscriber recipient lists
        notificationService.saveConfig(config);
        const results = await notificationService.broadcast(payload, signal);
        res.json({ success: true, results });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET/POST /api/admin/notification-config
app.get('/api/admin/notification-config', requireAuth, requireSuperAdmin, (req, res) => {
    const cfg = notificationService.getConfig();
    // Mask sensitive fields before sending to client
    const masked = {
        smtp: cfg.smtp ? { host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.secure, user: cfg.smtp.user, pass: cfg.smtp.pass ? '••••••••' : '', fromName: cfg.smtp.fromName, fromEmail: cfg.smtp.fromEmail } : null,
        twilio: cfg.twilio ? { accountSid: cfg.twilio.accountSid, authToken: cfg.twilio.authToken ? '••••••••' : '', fromNumber: cfg.twilio.fromNumber } : null,
        whatsapp: cfg.whatsapp ? { phoneNumberId: cfg.whatsapp.phoneNumberId, accessToken: cfg.whatsapp.accessToken ? '••••••••' : '' } : null,
        emailRecipients: cfg.emailRecipients ?? []
    };
    res.json({ success: true, config: masked });
});
app.post('/api/admin/notification-config', requireAuth, requireSuperAdmin, (req, res) => {
    try {
        const { smtp, twilio, whatsapp, emailRecipients } = req.body;
        // Only update fields that are not masked (i.e. not '••••••••')
        const patch = {};
        if (smtp) {
            patch.smtp = { ...notificationService.getConfig().smtp, ...smtp };
            if (smtp.pass === '••••••••')
                patch.smtp.pass = notificationService.getConfig().smtp?.pass;
        }
        if (twilio) {
            patch.twilio = { ...notificationService.getConfig().twilio, ...twilio };
            if (twilio.authToken === '••••••••')
                patch.twilio.authToken = notificationService.getConfig().twilio?.authToken;
        }
        if (whatsapp) {
            patch.whatsapp = { ...notificationService.getConfig().whatsapp, ...whatsapp };
            if (whatsapp.accessToken === '••••••••')
                patch.whatsapp.accessToken = notificationService.getConfig().whatsapp?.accessToken;
        }
        if (emailRecipients)
            patch.emailRecipients = emailRecipients;
        notificationService.saveConfig(patch);
        res.json({ success: true, message: 'Notification config saved.' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/admin/notification-config/test-sms — send a test SMS to verify Twilio config
app.post('/api/admin/notification-config/test-sms', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const { toNumber } = req.body;
        if (!toNumber)
            return res.status(400).json({ success: false, error: 'toNumber required for test.' });
        const cfg = notificationService.getConfig();
        if (!cfg.twilio?.accountSid)
            return res.status(400).json({ success: false, error: 'Twilio not configured.' });
        // Temporarily override toNumbers for this test
        const testConfig = { ...cfg, twilio: { ...cfg.twilio, toNumbers: [toNumber] } };
        notificationService.saveConfig(testConfig);
        const result = await notificationService.sendSms({ subject: 'Test', message: '✅ Fayda Pro: SMS notification test successful! Your Twilio integration is working.', channels: ['SMS'] }, { action: 'BOOK_PROFIT', signal: {} });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ── DHAN API ENDPOINTS ───────────────────────────────────────────────────────
app.post('/api/dhan/connect', requireAdminAuth, async (req, res) => {
    const { clientId, accessToken } = req.body;
    if (!clientId || !accessToken) {
        return res.status(400).json({ success: false, message: 'Dhan Client ID and Access Token are required' });
    }
    dhanService.setConfig(clientId, accessToken);
    const result = await dhanService.validateConnection();
    if (result.success) {
        brokerManager.setActiveBroker('DHAN');
        currentDataSource = 'DHAN_LIVE';
    }
    broadcast({
        type: 'BROKER_UPDATE',
        dhanConfig: dhanService.getPublicConfig(),
        fyersConfig: fyersService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
        dataSource: currentDataSource,
        timestamp: new Date().toISOString()
    });
    res.json({ success: result.success, message: result.message, config: dhanService.getPublicConfig() });
});
app.get('/api/dhan/status', (req, res) => {
    res.json({
        config: dhanService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker()
    });
});
app.post('/api/dhan/disconnect', requireAdminAuth, (req, res) => {
    dhanService.clearConfig();
    if (brokerManager.getActiveBroker() === 'DHAN') {
        brokerManager.setActiveBroker(fyersService.getConfig().isConnected ? 'FYERS' : 'SIMULATOR');
    }
    broadcast({
        type: 'BROKER_UPDATE',
        dhanConfig: dhanService.getPublicConfig(),
        fyersConfig: fyersService.getPublicConfig(),
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
        dataSource: currentDataSource,
        timestamp: new Date().toISOString()
    });
    res.json({ success: true, message: 'Disconnected from Dhan' });
});
// ── UNIFIED BROKER SWITCHER ENDPOINTS ─────────────────────────────────────────
app.post('/api/broker/select', requireAdminAuth, (req, res) => {
    const { broker } = req.body;
    if (broker === 'DHAN' || broker === 'FYERS' || broker === 'SIMULATOR') {
        brokerManager.setActiveBroker(broker);
        if (broker === 'DHAN' && dhanService.getConfig().isConnected) {
            currentDataSource = dhanService.hasDataApi() ? 'DHAN_LIVE' : 'NSE_LIVE';
        }
        else if (broker === 'FYERS' && fyersService.getConfig().isConnected) {
            currentDataSource = 'FYERS_LIVE';
        }
        else {
            currentDataSource = 'NSE_LIVE';
        }
        broadcast({
            type: 'BROKER_UPDATE',
            dhanConfig: dhanService.getPublicConfig(),
            fyersConfig: fyersService.getPublicConfig(),
            activeBroker: brokerManager.getActiveBroker(),
            effectiveBroker: brokerManager.getEffectiveLiveBroker(),
            dataSource: currentDataSource,
            timestamp: new Date().toISOString()
        });
        return res.json({ success: true, activeBroker: broker });
    }
    res.status(400).json({ success: false, message: 'Invalid broker. Choose DHAN, FYERS, or SIMULATOR' });
});
app.get('/api/broker/status', (req, res) => {
    res.json({
        activeBroker: brokerManager.getActiveBroker(),
        effectiveBroker: brokerManager.getEffectiveLiveBroker(),
        dhan: dhanService.getPublicConfig(),
        fyers: fyersService.getPublicConfig()
    });
});
// Fyers Connection Endpoint
app.post('/api/fyers/connect', requireAdminAuth, async (req, res) => {
    const { appId, accessToken, secretKey } = req.body;
    if (!appId || !accessToken) {
        return res.status(400).json({ error: 'Missing appId or accessToken' });
    }
    fyersService.setConfig(appId, accessToken, secretKey);
    const result = await fyersService.validateConnection();
    if (result.success) {
        brokerManager.setActiveBroker('FYERS');
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'BROKER_UPDATE',
            fyersConfig: fyersService.getPublicConfig(),
            dhanConfig: dhanService.getPublicConfig(),
            activeBroker: brokerManager.getActiveBroker(),
            effectiveBroker: brokerManager.getEffectiveLiveBroker(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json({ success: result.success, message: result.message, config: fyersService.getPublicConfig() });
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
        return res.redirect(`/?fyers_auth_code=${encodeURIComponent(authCode)}`);
    }
    const result = await fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        brokerManager.setActiveBroker('FYERS');
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'BROKER_UPDATE',
            fyersConfig: fyersService.getPublicConfig(),
            dhanConfig: dhanService.getPublicConfig(),
            activeBroker: brokerManager.getActiveBroker(),
            effectiveBroker: brokerManager.getEffectiveLiveBroker(),
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
// Fyers Auth Code Exchanger Endpoint
app.post('/api/fyers/exchange-authcode', requireAdminAuth, async (req, res) => {
    const { appId, secretKey, authCode } = req.body;
    if (!appId || !secretKey || !authCode) {
        return res.status(400).json({ success: false, message: 'Missing appId, secretKey, or authCode' });
    }
    const result = await fyersService.exchangeAuthCode(appId, secretKey, authCode);
    if (result.success) {
        brokerManager.setActiveBroker('FYERS');
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        broadcast({
            type: 'BROKER_UPDATE',
            fyersConfig: fyersService.getPublicConfig(),
            dhanConfig: dhanService.getPublicConfig(),
            activeBroker: brokerManager.getActiveBroker(),
            effectiveBroker: brokerManager.getEffectiveLiveBroker(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json({ success: result.success, message: result.message, config: fyersService.getPublicConfig() });
});
// Unified Fyers Refresh Token Trigger / Renewal Endpoint
app.post('/api/fyers/refresh-token', requireAdminAuth, async (req, res) => {
    const { pin } = req.body || {};
    const result = await fyersService.refreshAccessToken(pin);
    if (result.success) {
        brokerManager.setActiveBroker('FYERS');
        currentDataSource = 'FYERS_LIVE';
        startFyersPolling();
        fyersService.scheduleNextDailyRenewal();
        broadcast({
            type: 'BROKER_UPDATE',
            fyersConfig: fyersService.getPublicConfig(),
            dhanConfig: dhanService.getPublicConfig(),
            activeBroker: brokerManager.getActiveBroker(),
            effectiveBroker: brokerManager.getEffectiveLiveBroker(),
            dataSource: currentDataSource,
            isMarketOpen: isNseMarketOpen(),
            timestamp: new Date().toISOString()
        });
    }
    res.json({ success: result.success, message: result.message, config: fyersService.getPublicConfig() });
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
// Centralized Express error handler
app.use((err, _req, res, _next) => {
    if (err.message && err.message.includes('CORS policy')) {
        return res.status(403).json({ error: 'Forbidden: CORS policy restriction' });
    }
    console.error('[API Error]:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
});
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`⚡ 100% Live Options OI Surge Radar Server listening on port ${PORT} (0.0.0.0)`);
    console.log(`📡 WebSocket stream active at ws://localhost:${PORT}/ws`);
    console.log(`📊 Data source: ${currentDataSource}`);
    // After services have had time to auto-connect (async), resolve the true active broker
    // and broadcast an authoritative BROKER_UPDATE to all connected clients.
    brokerManager.initPostServices().then(() => {
        const resolvedBroker = brokerManager.getActiveBroker();
        const effectiveBroker = brokerManager.getEffectiveLiveBroker();
        // Sync currentDataSource with the resolved broker
        if (resolvedBroker === 'FYERS' && fyersService.getConfig().isConnected) {
            if (currentDataSource !== 'FYERS_LIVE') {
                currentDataSource = 'FYERS_LIVE';
                startFyersPolling();
            }
        }
        else if (resolvedBroker === 'DHAN' && dhanService.getConfig().isConnected) {
            if (currentDataSource !== 'DHAN_LIVE') {
                currentDataSource = dhanService.hasDataApi() ? 'DHAN_LIVE' : 'NSE_LIVE';
            }
        }
        console.log(`[BrokerManager] Post-init resolved broker: ${resolvedBroker} (effective: ${effectiveBroker})`);
        // Broadcast to any clients that connected before this resolved
        broadcast({
            type: 'BROKER_UPDATE',
            fyersConfig: fyersService.getPublicConfig(),
            dhanConfig: dhanService.getPublicConfig(),
            activeBroker: resolvedBroker,
            effectiveBroker,
            dataSource: currentDataSource,
            timestamp: new Date().toISOString()
        });
    }).catch((err) => {
        console.error('[BrokerManager] initPostServices error:', err);
    });
});
// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
});
