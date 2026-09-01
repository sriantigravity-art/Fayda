"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fyersService = exports.FyersService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const types_js_1 = require("../types.js");
const nseExpiryService_js_1 = require("./nseExpiryService.js");
const findConfigPath = () => {
    const p1 = path_1.default.resolve(process.cwd(), 'fyersConfig.json');
    if (fs_1.default.existsSync(p1))
        return p1;
    const p2 = path_1.default.resolve(process.cwd(), 'server', 'fyersConfig.json');
    if (fs_1.default.existsSync(p2))
        return p2;
    return p1;
};
const CONFIG_PATH = findConfigPath();
class FyersService {
    config = {
        appId: '',
        secretKey: '',
        accessToken: '',
        isConnected: false
    };
    symbolMap = {
        NIFTY: 'NSE:NIFTY50-INDEX',
        BANKNIFTY: 'NSE:NIFTYBANK-INDEX',
        SENSEX: 'BSE:SENSEX-INDEX',
        BANKEX: 'BSE:BANKEX-INDEX',
        FINNIFTY: 'NSE:FINNIFTY-INDEX',
        MIDCPNIFTY: 'NSE:MIDCPNIFTY-INDEX',
        NIFTYNXT50: 'NSE:NIFTYNXT50-INDEX',
        CRUDEOIL: 'MCX:CRUDEOIL26SEPFUT',
        NATURALGAS: 'MCX:NATURALGAS26SEPFUT',
        GOLD: 'MCX:GOLD26OCTFUT',
        SILVER: 'MCX:SILVER26DECFUT',
        COPPER: 'MCX:COPPER26SEPFUT',
        ZINC: 'MCX:ZINC26SEPFUT'
    };
    constructor() {
        this.loadPersistedConfig();
    }
    loadPersistedConfig() {
        try {
            if (fs_1.default.existsSync(CONFIG_PATH)) {
                const raw = fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.appId && parsed.accessToken) {
                    this.config = {
                        appId: parsed.appId,
                        secretKey: parsed.secretKey || '',
                        accessToken: parsed.accessToken,
                        isConnected: false,
                        userName: parsed.userName,
                        lastConnected: parsed.lastConnected
                    };
                    // Auto-validate persisted token
                    this.validateConnection().then((res) => {
                        if (res.success) {
                            console.log(`[Fyers] Auto-connected to Fyers as ${res.userName}`);
                        }
                    });
                }
            }
        }
        catch (err) {
            console.warn('[Fyers] Config load error:', err);
        }
    }
    savePersistedConfig() {
        try {
            fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
        }
        catch (err) {
            console.warn('[Fyers] Config save error:', err);
        }
    }
    setConfig(appId, accessToken, secretKey) {
        let cleanAppId = appId.trim();
        if (cleanAppId && !cleanAppId.includes('-')) {
            cleanAppId = `${cleanAppId}-100`;
        }
        this.config.appId = cleanAppId;
        this.config.accessToken = accessToken.trim();
        if (secretKey !== undefined) {
            this.config.secretKey = secretKey.trim();
        }
    }
    getConfig() {
        return this.config;
    }
    async exchangeAuthCode(appId, secretKey, authCode) {
        let cleanAppId = appId.trim();
        if (cleanAppId && !cleanAppId.includes('-')) {
            cleanAppId = `${cleanAppId}-100`;
        }
        const cleanSecret = secretKey.trim();
        let cleanAuthCode = authCode.trim();
        if (cleanAuthCode.includes('auth_code=')) {
            try {
                const match = cleanAuthCode.match(/auth_code=([^&]+)/);
                if (match && match[1]) {
                    cleanAuthCode = decodeURIComponent(match[1]);
                }
            }
            catch { }
        }
        if (!cleanAppId || !cleanSecret || !cleanAuthCode) {
            return { success: false, message: 'App ID, Secret Key, and Auth Code are all required.' };
        }
        try {
            const hashInput = `${cleanAppId}:${cleanSecret}`;
            const appIdHash = crypto_1.default.createHash('sha256').update(hashInput).digest('hex');
            console.log(`[Fyers] Exchanging auth code for appId: ${cleanAppId}...`);
            const response = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    appIdHash,
                    code: cleanAuthCode
                })
            });
            let json = null;
            try {
                const text = await response.text();
                json = JSON.parse(text);
            }
            catch {
                return {
                    success: false,
                    message: `Fyers returned HTTP ${response.status}. Please generate a new Auth Code (each code is valid for 2 minutes and can only be used once).`
                };
            }
            if (json && json.s === 'ok' && json.access_token) {
                this.config.appId = cleanAppId;
                this.config.secretKey = cleanSecret;
                this.config.accessToken = json.access_token;
                this.config.isConnected = true;
                this.config.lastConnected = new Date().toISOString();
                const validateRes = await this.validateConnection();
                const userName = validateRes.userName || this.config.userName || 'SRS';
                this.config.userName = userName;
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Authenticated successfully as ${userName}!`,
                    userName,
                    accessToken: json.access_token
                };
            }
            else {
                const errorMsg = json?.message || `Fyers Error (${json?.code || response.status}): Failed to exchange auth code. Auth codes expire in 2 minutes and can only be used once.`;
                return {
                    success: false,
                    message: errorMsg
                };
            }
        }
        catch (err) {
            return {
                success: false,
                message: err.message || 'Network error exchanging auth code with Fyers API.'
            };
        }
    }
    rateLimitUntil = 0;
    async validateConnection() {
        if (!this.config.appId || !this.config.accessToken) {
            this.config.isConnected = false;
            return { success: false, message: 'App ID or Access Token is missing' };
        }
        // Auto-normalize appId with -100 if missing
        if (!this.config.appId.includes('-')) {
            this.config.appId = `${this.config.appId}-100`;
        }
        // Validate JWT expiry if standard format
        try {
            const parts = this.config.accessToken.split('.');
            if (parts.length >= 2) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                if (payload.exp && (Date.now() / 1000) > payload.exp) {
                    this.config.isConnected = false;
                    return { success: false, message: 'Fyers Access Token has expired. Please generate a fresh token.' };
                }
            }
        }
        catch { }
        try {
            const authHeader = `${this.config.appId}:${this.config.accessToken}`;
            const response = await fetch('https://api-t1.fyers.in/api/v3/profile', {
                headers: {
                    'Authorization': authHeader
                }
            });
            if (!response.ok) {
                if (response.status === 429) {
                    // Cloudflare rate limit cooldown: retain existing valid token
                    this.config.isConnected = true;
                    this.config.userName = this.config.userName || 'SRS';
                    this.config.lastConnected = new Date().toISOString();
                    this.savePersistedConfig();
                    return {
                        success: true,
                        message: `Connected successfully (Broker rate limit active, session retained)`,
                        userName: this.config.userName
                    };
                }
                this.config.isConnected = false;
                return {
                    success: false,
                    message: `Fyers authentication failed (HTTP ${response.status}).`
                };
            }
            const json = await response.json();
            if (json.s === 'ok' && json.data) {
                this.config.isConnected = true;
                const rawName = json.data.name || json.data.fy_id || 'SRS';
                this.config.userName = rawName;
                this.config.lastConnected = new Date().toISOString();
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Connected successfully as ${rawName}`,
                    userName: rawName
                };
            }
            else {
                this.config.isConnected = false;
                return {
                    success: false,
                    message: json.message || 'Authentication failed. Please check App ID and Access Token.'
                };
            }
        }
        catch (err) {
            // If network glitch but valid JWT, keep session
            return { success: false, message: err.message || 'Network error connecting to Fyers API' };
        }
    }
    async fetchOptionChain(symbol, expiryTimestamp) {
        if (!this.config.isConnected || !this.config.accessToken) {
            return null;
        }
        if (Date.now() < this.rateLimitUntil) {
            return null;
        }
        try {
            const cfg = types_js_1.ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
            const fyersSymbol = cfg ? cfg.fyersSymbol : (this.symbolMap[symbol] || `NSE:${symbol}-EQ`);
            const authHeader = `${this.config.appId}:${this.config.accessToken}`;
            let url = `https://api-t1.fyers.in/data/options-chain-v3?symbol=${encodeURIComponent(fyersSymbol)}&strikecount=30`;
            if (expiryTimestamp) {
                let epochSec = 0;
                if (/^\d+$/.test(expiryTimestamp)) {
                    epochSec = parseInt(expiryTimestamp, 10);
                }
                else {
                    const d = nseExpiryService_js_1.NseExpiryService.parseDate(expiryTimestamp);
                    epochSec = Math.floor(d.getTime() / 1000);
                }
                if (epochSec > 0) {
                    url += `&timestamp=${epochSec}`;
                }
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader
                }
            });
            if (!response.ok) {
                if (response.status === 429) {
                    this.rateLimitUntil = Date.now() + 15000;
                }
                return null;
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return null;
            }
            const json = await response.json();
            if (json.s !== 'ok' || !json.data) {
                return null;
            }
            const data = json.data;
            const optionsData = data.optionsChain || [];
            // Find spot record (strike_price: -1)
            const spotRecord = optionsData.find((item) => item.strike_price === -1);
            const spotPrice = spotRecord ? spotRecord.ltp : (data.underlyingValue || 0);
            const spotChange = spotRecord ? spotRecord.ltpch : 0;
            const spotPctChange = spotRecord ? spotRecord.ltpchp : 0;
            // Extract expiry dates in format DD-MMM-YYYY directly from Fyers exchange data
            const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const rawExpiryList = data.expiryData || [];
            const expiryDates = [];
            for (const exp of rawExpiryList) {
                if (exp.date) {
                    const parts = exp.date.split('-');
                    if (parts.length === 3) {
                        const day = parts[0];
                        const mIdx = parseInt(parts[1], 10) - 1;
                        const yr = parts[2];
                        expiryDates.push(`${day}-${MONTHS[mIdx]}-${yr}`);
                    }
                    else {
                        expiryDates.push(exp.date);
                    }
                }
            }
            const selectedExpiry = expiryTimestamp || expiryDates[0] || '';
            // Group into Call and Put pairs by strike_price
            const strikeMap = new Map();
            for (const item of optionsData) {
                const sp = item.strike_price;
                if (sp <= 0)
                    continue; // Skip index record
                if (!strikeMap.has(sp)) {
                    strikeMap.set(sp, {
                        callOI: 0,
                        callOIChangeTotal: 0,
                        callLtp: 0,
                        callVolume: 0,
                        putOI: 0,
                        putOIChangeTotal: 0,
                        putLtp: 0,
                        putVolume: 0
                    });
                }
                const entry = strikeMap.get(sp);
                if (item.option_type === 'CE') {
                    entry.callOI = item.oi || 0;
                    entry.callOIChangeTotal = item.oich || 0;
                    entry.callLtp = item.ltp || 0;
                    entry.callVolume = item.volume || 0;
                }
                else if (item.option_type === 'PE') {
                    entry.putOI = item.oi || 0;
                    entry.putOIChangeTotal = item.oich || 0;
                    entry.putLtp = item.ltp || 0;
                    entry.putVolume = item.volume || 0;
                }
            }
            const strikes = Array.from(strikeMap.entries())
                .map(([strikePrice, val]) => ({
                strikePrice,
                ...val
            }))
                .sort((a, b) => a.strikePrice - b.strikePrice);
            return {
                symbol,
                spotPrice,
                spotChange,
                spotPctChange,
                strikes,
                expiryDates,
                selectedExpiry,
                totalCallOI: data.callOi || 0,
                totalPutOI: data.putOi || 0,
                indiaVix: data.indiavixData?.ltp || 0
            };
        }
        catch (err) {
            console.warn(`[Fyers] Fetch error for ${symbol}:`, err.message);
            return null;
        }
    }
    async fetchQuotes(symbols) {
        if (!this.config.appId || !this.config.accessToken)
            return [];
        try {
            const symList = symbols.join(',');
            const response = await fetch(`https://api-t1.fyers.in/data/quotes?symbols=${encodeURIComponent(symList)}`, {
                headers: {
                    'Authorization': `${this.config.appId}:${this.config.accessToken}`
                }
            });
            if (!response.ok)
                return [];
            const json = await response.json();
            if (json && json.s === 'ok' && Array.isArray(json.d)) {
                return json.d;
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async fetchIndiaVix() {
        const quotes = await this.fetchQuotes(['NSE:INDIAVIX-INDEX']);
        if (quotes && quotes.length > 0) {
            const q = quotes[0]?.v;
            if (q && q.lp > 0) {
                return {
                    price: q.lp,
                    change: q.ch ?? 0,
                    pctChange: q.chp ?? 0
                };
            }
        }
        return null;
    }
}
exports.FyersService = FyersService;
exports.fyersService = new FyersService();
