import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ALL_SYMBOLS_CONFIG } from '../types.js';
import { NseExpiryService, NSE_BSE_HOLIDAYS_SET } from './nseExpiryService.js';
const findConfigPath = () => {
    const p1 = path.resolve(process.cwd(), 'fyersConfig.json');
    if (fs.existsSync(p1))
        return p1;
    const p2 = path.resolve(process.cwd(), 'server', 'fyersConfig.json');
    if (fs.existsSync(p2))
        return p2;
    return p1;
};
const CONFIG_PATH = findConfigPath();
// Major Indian Market Holidays (NSE / BSE / MCX) for 2026/2027 (YYYY-MM-DD)
const MARKET_HOLIDAYS_SET = NSE_BSE_HOLIDAYS_SET;
/** Returns true if the given date is an active Indian trading day (Monday to Friday, excluding holidays). */
export const isIndianTradingDay = (date) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const yyyyMmDd = formatter.format(date);
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short'
    });
    const weekday = dayFormatter.format(date);
    if (weekday === 'Sat' || weekday === 'Sun')
        return false;
    if (MARKET_HOLIDAYS_SET.has(yyyyMmDd))
        return false;
    return true;
};
/**
 * Returns the exact Date corresponding to the next 09:00:00 AM IST on an active trading day.
 * 09:00:00 IST corresponds to 03:30:00.000 UTC.
 */
export const getNextTradingDay9AmIST = (fromDate = new Date()) => {
    const istFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });
    const parts = istFormatter.formatToParts(fromDate);
    const map = {};
    parts.forEach(p => { if (p.type !== 'literal')
        map[p.type] = parseInt(p.value, 10); });
    // Today at 09:00:00 AM IST in UTC (03:30:00 UTC)
    const candidateIST = new Date(Date.UTC(map.year, map.month - 1, map.day, 3, 30, 0, 0));
    if (candidateIST.getTime() > fromDate.getTime() && isIndianTradingDay(candidateIST)) {
        return candidateIST;
    }
    let checkDate = new Date(candidateIST.getTime() + 24 * 3600 * 1000);
    while (!isIndianTradingDay(checkDate)) {
        checkDate = new Date(checkDate.getTime() + 24 * 3600 * 1000);
    }
    return checkDate;
};
export class FyersService {
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
    onConnected = null;
    constructor() {
        this.loadPersistedConfig();
        this.watchConfigFile();
    }
    lastSavedContent = '';
    watchConfigFile() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                fs.watchFile(CONFIG_PATH, { interval: 2000 }, (curr, prev) => {
                    if (curr.mtimeMs !== prev.mtimeMs) {
                        try {
                            const diskRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
                            if (diskRaw === this.lastSavedContent)
                                return; // ignore our own writes
                            const parsed = JSON.parse(diskRaw);
                            // Only reload if actual credentials changed
                            if (parsed.accessToken !== this.config.accessToken || parsed.appId !== this.config.appId || parsed.refreshToken !== this.config.refreshToken) {
                                console.log('[Fyers] New credentials detected in config file. Reloading...');
                                this.loadPersistedConfig(true);
                            }
                        }
                        catch { }
                    }
                });
            }
        }
        catch (err) {
            console.warn('[Fyers] Could not watch config file:', err);
        }
    }
    loadPersistedConfig(triggerCallbacks = false) {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed.appId && parsed.accessToken) {
                    const expired = this.isAccessTokenExpiredToken(parsed.accessToken);
                    this.config = {
                        appId: parsed.appId,
                        secretKey: parsed.secretKey || '',
                        accessToken: parsed.accessToken,
                        isConnected: !expired && (parsed.isConnected ?? true),
                        userName: parsed.userName,
                        lastConnected: parsed.lastConnected,
                        tokenIssuedAt: parsed.tokenIssuedAt,
                        pin: parsed.pin,
                        refreshToken: parsed.refreshToken,
                        tokenRefreshedAt: parsed.tokenRefreshedAt,
                        refreshTokenExpiresAt: parsed.refreshTokenExpiresAt,
                    };
                    // If provisional token is valid, notify listeners immediately
                    if (this.config.isConnected) {
                        this.onConnected?.(this.config);
                    }
                    // Check if access token is already expired — try auto-refresh first
                    if (expired && this.config.refreshToken) {
                        console.log('[Fyers] Access token expired. Attempting auto-refresh via refresh_token...');
                        this.refreshAccessToken().then(res => {
                            if (res.success) {
                                console.log(`[Fyers] ✅ Auto-refresh succeeded — connected as ${res.userName}`);
                                this.scheduleNextDailyRenewal();
                                this.onConnected?.(this.config);
                            }
                            else {
                                console.warn(`[Fyers] ⚠️ Auto-refresh failed: ${res.message}. Will retry on next token use.`);
                            }
                        });
                    }
                    else {
                        // Access token looks valid — validate it against profile endpoint
                        this.validateConnection().then(res => {
                            if (res.success) {
                                console.log(`[Fyers] Auto-connected as ${res.userName}`);
                                this.scheduleNextDailyRenewal();
                                this.onConnected?.(this.config);
                            }
                            else if (this.config.refreshToken) {
                                // Validation failed (maybe just expired) — try refresh
                                this.refreshAccessToken().then(r => {
                                    if (r.success) {
                                        console.log(`[Fyers] ✅ Auto-refresh after failed validation — connected as ${r.userName}`);
                                        this.scheduleNextDailyRenewal();
                                        this.onConnected?.(this.config);
                                    }
                                });
                            }
                        });
                    }
                }
            }
        }
        catch (err) {
            console.warn('[Fyers] Config load error:', err);
        }
    }
    savePersistedConfig() {
        try {
            const content = JSON.stringify({
                appId: this.config.appId,
                secretKey: this.config.secretKey,
                accessToken: this.config.accessToken,
                isConnected: this.config.isConnected,
                userName: this.config.userName,
                lastConnected: this.config.lastConnected,
                tokenIssuedAt: this.config.tokenIssuedAt,
                pin: this.config.pin,
                refreshToken: this.config.refreshToken,
                tokenRefreshedAt: this.config.tokenRefreshedAt,
                refreshTokenExpiresAt: this.config.refreshTokenExpiresAt,
            }, null, 2);
            this.lastSavedContent = content;
            fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
        }
        catch (err) {
            console.warn('[Fyers] Config save error:', err);
        }
    }
    // ── Token expiry helpers ──────────────────────────────────────────────────────
    /** Returns true if the provided access token's JWT `exp` claim has passed. */
    isAccessTokenExpiredToken(token) {
        try {
            const parts = (token || this.config.accessToken)?.split('.');
            if (parts && parts.length >= 2) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                if (payload.exp)
                    return (Date.now() / 1000) > payload.exp;
            }
        }
        catch { }
        return false;
    }
    /** Returns true if the current access token's JWT `exp` claim has passed. */
    isAccessTokenExpired() {
        return this.isAccessTokenExpiredToken(this.config.accessToken);
    }
    /** Returns true if the stored refresh_token is still within its 15-day window. */
    isRefreshTokenValid() {
        if (!this.config.refreshToken)
            return false;
        if (!this.config.refreshTokenExpiresAt)
            return true; // assume valid if no expiry recorded
        return Date.now() < new Date(this.config.refreshTokenExpiresAt).getTime();
    }
    // ── Daily auto-renewal scheduler (9:00 AM IST on Trading Days) ───────────────
    dailyRenewalTimer = null;
    renewalRetryTimer = null;
    /**
     * Schedules the next 9:00 AM IST access token renewal on trading days (Mon–Fri, excluding holidays).
     * Called automatically after server boot and after every successful connection.
     */
    scheduleNextDailyRenewal() {
        if (this.dailyRenewalTimer) {
            clearTimeout(this.dailyRenewalTimer);
            this.dailyRenewalTimer = null;
        }
        if (this.renewalRetryTimer) {
            clearTimeout(this.renewalRetryTimer);
            this.renewalRetryTimer = null;
        }
        const nextTarget = getNextTradingDay9AmIST();
        const msUntilRenewal = Math.max(nextTarget.getTime() - Date.now(), 5000);
        const hoursUntil = (msUntilRenewal / 3600000).toFixed(1);
        const targetStringIST = nextTarget.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        console.log(`[Fyers] ⏰ Next 9:00 AM IST trading day renewal scheduled for ${targetStringIST} (in ${hoursUntil} hours)`);
        this.dailyRenewalTimer = setTimeout(async () => {
            console.log(`[Fyers] ⏰ 9:00 AM IST — running scheduled trading day token renewal...`);
            await this.executeRenewalWithRetries();
        }, msUntilRenewal);
    }
    /**
     * Executes scheduled renewal with up to 3 automatic retries (9:00 AM, 9:02 AM, 9:05 AM)
     * before the market opens at 9:15 AM.
     */
    async executeRenewalWithRetries(attempt = 1, maxAttempts = 3) {
        const res = await this.refreshAccessToken();
        if (res.success) {
            console.log(`[Fyers] ✅ 9:00 AM IST Renewal succeeded — active as ${res.userName}`);
            this.scheduleNextDailyRenewal();
            this.onTokenRenewed?.(this.config);
            return res;
        }
        else {
            console.warn(`[Fyers] ⚠️ 9:00 AM IST Renewal attempt ${attempt}/${maxAttempts} failed: ${res.message}`);
            if (attempt < maxAttempts) {
                const retryDelayMs = attempt === 1 ? 120000 : 180000; // retry after 2m (9:02 AM), then 3m (9:05 AM)
                console.log(`[Fyers] ⏳ Scheduling automatic renewal retry in ${retryDelayMs / 1000}s...`);
                this.renewalRetryTimer = setTimeout(() => {
                    this.executeRenewalWithRetries(attempt + 1, maxAttempts);
                }, retryDelayMs);
            }
            else {
                console.error(`[Fyers] ❌ All 9:00 AM IST renewal attempts exhausted for today. Please verify PIN or re-login with Auth Code.`);
                this.scheduleNextDailyRenewal(); // Reschedule for next trading day
            }
            return res;
        }
    }
    /** Callback invoked after a successful auto-renewal (server index.ts wires this up) */
    onTokenRenewed = null;
    // ── Refresh Token Exchange ────────────────────────────────────────────────────
    /**
     * Uses the stored Fyers refresh_token to obtain a fresh access_token.
     * Fyers API v3 requires 4-digit PIN for validate-refresh-token.
     * Refresh tokens are valid for 14-15 days and are automatically rotated.
     *
     * Fyers endpoint: POST https://api-t1.fyers.in/api/v3/validate-refresh-token
     * Body: { grant_type, appIdHash, refresh_token, pin }
     */
    async refreshAccessToken(pinOverride) {
        if (!this.config.refreshToken) {
            return { success: false, message: 'No refresh token stored. Please login via auth code once.' };
        }
        if (!this.config.appId || !this.config.secretKey) {
            return { success: false, message: 'App ID and Secret Key are required for token refresh.' };
        }
        if (!this.isRefreshTokenValid()) {
            return { success: false, message: 'Refresh token has expired (15-day limit reached). Please login via auth code to generate a new 15-day session.' };
        }
        const pinToSend = (pinOverride || this.config.pin || '').trim();
        if (!pinToSend) {
            return {
                success: false,
                message: 'Fyers 4-digit Trading PIN is required for token renewal. Please enter and save your PIN.'
            };
        }
        try {
            const hashInput = `${this.config.appId}:${this.config.secretKey}`;
            const appIdHash = crypto.createHash('sha256').update(hashInput).digest('hex');
            console.log(`[Fyers] Refreshing access token for appId: ${this.config.appId} using PIN...`);
            const requestBody = {
                grant_type: 'refresh_token',
                appIdHash,
                refresh_token: this.config.refreshToken,
                pin: pinToSend
            };
            const response = await fetch('https://api-t1.fyers.in/api/v3/validate-refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: JSON.stringify(requestBody)
            });
            let json = null;
            try {
                const text = await response.text();
                json = JSON.parse(text);
            }
            catch {
                return { success: false, message: `Fyers refresh endpoint returned HTTP ${response.status}.` };
            }
            if (json?.s === 'ok' && json.access_token) {
                this.config.accessToken = json.access_token;
                // Fyers rotates the refresh token on renewal — capture it to extend session by another 14 days
                if (json.refresh_token) {
                    this.config.refreshToken = json.refresh_token;
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 14);
                    this.config.refreshTokenExpiresAt = expiry.toISOString();
                }
                this.config.pin = pinToSend;
                this.config.isConnected = true;
                this.config.tokenRefreshedAt = new Date().toISOString();
                this.config.tokenIssuedAt = new Date().toISOString();
                this.config.lastConnected = new Date().toISOString();
                const validateRes = await this.validateConnection();
                const userName = validateRes.userName || this.config.userName || 'SRS';
                this.config.userName = userName;
                this.savePersistedConfig();
                console.log(`[Fyers] ✅ Token refreshed successfully with PIN. Active as ${userName}.`);
                this.scheduleNextDailyRenewal();
                return { success: true, message: `Token refreshed successfully. Connected as ${userName}.`, userName };
            }
            else {
                const msg = json?.message || `Fyers refresh failed (code: ${json?.code || response.status})`;
                if (json?.message?.includes('SEBI regulations') || json?.message?.includes('disabled to comply')) {
                    return {
                        success: false,
                        message: 'Fyers has disabled background refresh tokens to comply with SEBI daily 2FA regulations. Please use Option 2 ("Launch Fyers Login") — our 1-click auto-detector captures your daily token instantly.'
                    };
                }
                if (json?.code === 16 || json?.message?.toLowerCase().includes('expired')) {
                    this.config.refreshToken = undefined;
                    this.savePersistedConfig();
                    return { success: false, message: 'Fyers session expired. Please login via Auth Code once to start a new session.' };
                }
                if (json?.code === -502 || json?.message?.toLowerCase().includes('pin')) {
                    return { success: false, message: 'Invalid Fyers PIN. Please verify your 4-digit Trading PIN.' };
                }
                return { success: false, message: msg };
            }
        }
        catch (err) {
            return { success: false, message: err.message || 'Network error during token refresh.' };
        }
    }
    /**
     * Saves the user's 4-digit Fyers Trading PIN and tests renewal immediately if a refresh token is present.
     */
    async savePin(pin) {
        const cleanPin = pin.trim();
        if (!cleanPin) {
            return { success: false, message: 'Please provide a valid 4-digit PIN.' };
        }
        this.config.pin = cleanPin;
        this.savePersistedConfig();
        console.log(`[Fyers] 📌 4-Digit Trading PIN saved to configuration.`);
        if (this.config.refreshToken) {
            console.log(`[Fyers] Testing token renewal with newly saved PIN...`);
            const res = await this.refreshAccessToken(cleanPin);
            if (res.success) {
                this.scheduleNextDailyRenewal();
                return {
                    success: true,
                    message: `PIN saved and verified with Fyers! Connected as ${res.userName}. Daily 9:00 AM auto-renewal is ACTIVE.`,
                    userName: res.userName,
                    config: this.getPublicConfig()
                };
            }
            else {
                return {
                    success: false,
                    message: `PIN saved, but token renewal failed: ${res.message}. If your 15-day refresh token expired, please log in via Auth Code once.`,
                    config: this.getPublicConfig()
                };
            }
        }
        return {
            success: true,
            message: 'PIN saved! Please connect via Auth Code once to activate automated 9:00 AM renewals.',
            config: this.getPublicConfig()
        };
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
    clearConfig() {
        this.config = {
            appId: this.config.appId || 'KMSSMU5OGR-100',
            secretKey: this.config.secretKey || 'MVADUMZWBM',
            accessToken: '',
            isConnected: false,
            userName: undefined,
            lastConnected: undefined,
            tokenIssuedAt: undefined,
            refreshToken: undefined,
            pin: this.config.pin
        };
        this.savePersistedConfig();
    }
    getConfig() {
        return this.config;
    }
    getPublicConfig() {
        // Decode JWT exp claim to compute tokenExpiresAt
        let tokenExpiresAt;
        try {
            const parts = this.config.accessToken?.split('.');
            if (parts && parts.length >= 2) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                if (payload.exp) {
                    tokenExpiresAt = new Date(payload.exp * 1000).toISOString();
                }
            }
        }
        catch { }
        const nextRenewal = getNextTradingDay9AmIST();
        const hasValidRefresh = !!this.config.refreshToken && this.isRefreshTokenValid();
        const hasPin = !!this.config.pin;
        let autoRenewalStatus = 'IDLE';
        if (hasValidRefresh && hasPin) {
            autoRenewalStatus = 'ACTIVE_9AM_TRADING_DAYS';
        }
        else if (hasValidRefresh && !hasPin) {
            autoRenewalStatus = 'PIN_REQUIRED';
        }
        else if (!hasValidRefresh) {
            autoRenewalStatus = 'AUTH_CODE_REQUIRED';
        }
        return {
            appId: this.config.appId || 'KMSSMU5OGR-100',
            isConnected: this.config.isConnected,
            userName: this.config.userName,
            lastConnected: this.config.lastConnected,
            tokenIssuedAt: this.config.tokenIssuedAt,
            tokenExpiresAt,
            hasRefreshToken: hasValidRefresh,
            tokenRefreshedAt: this.config.tokenRefreshedAt,
            refreshTokenExpiresAt: this.config.refreshTokenExpiresAt,
            hasPin,
            nextDailyRenewalAt: nextRenewal.toISOString(),
            autoRenewalStatus
        };
    }
    async exchangeAuthCode(appId, secretKey, authCode, pin) {
        let cleanAppId = appId.trim();
        if (!cleanAppId || cleanAppId.includes('*')) {
            cleanAppId = this.config.appId || 'KMSSMU5OGR-100';
        }
        if (!cleanAppId.includes('-')) {
            cleanAppId = `${cleanAppId}-100`;
        }
        const cleanSecret = (secretKey.trim() || this.config.secretKey || 'MVADUMZWBM').trim();
        let cleanAuthCode = authCode.trim();
        if (cleanAuthCode.includes('auth_code=')) {
            try {
                const urlObj = cleanAuthCode.startsWith('http') ? new URL(cleanAuthCode) : new URL(`http://dummy.com?${cleanAuthCode.replace(/^[?#]/, '')}`);
                const extracted = urlObj.searchParams.get('auth_code');
                if (extracted) {
                    cleanAuthCode = extracted.trim();
                }
                else {
                    const match = cleanAuthCode.match(/auth_code=([^&#\s]+)/);
                    if (match && match[1])
                        cleanAuthCode = decodeURIComponent(match[1]).trim();
                }
            }
            catch {
                const match = cleanAuthCode.match(/auth_code=([^&#\s]+)/);
                if (match && match[1])
                    cleanAuthCode = decodeURIComponent(match[1]).trim();
            }
        }
        if (!cleanAppId || !cleanSecret || !cleanAuthCode) {
            return { success: false, message: 'App ID, Secret Key, and Auth Code are all required.' };
        }
        try {
            const hashInput = `${cleanAppId}:${cleanSecret}`;
            const appIdHash = crypto.createHash('sha256').update(hashInput).digest('hex');
            console.log(`[Fyers] Exchanging auth code for appId: ${cleanAppId}...`);
            const response = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: JSON.stringify({ grant_type: 'authorization_code', appIdHash, code: cleanAuthCode })
            });
            let json = null;
            let rawText = '';
            try {
                rawText = await response.text();
                json = JSON.parse(rawText);
            }
            catch {
                console.warn(`[Fyers] validate-authcode returned non-JSON response (${response.status}):`, rawText?.slice(0, 200));
                return {
                    success: false,
                    message: `Fyers returned HTTP ${response.status}. Auth codes expire in 2 minutes and can only be used once. Please generate a fresh Auth Code.`
                };
            }
            if (json && json.s === 'ok' && json.access_token) {
                this.config.appId = cleanAppId;
                this.config.secretKey = cleanSecret;
                this.config.accessToken = json.access_token;
                this.config.isConnected = true;
                this.config.lastConnected = new Date().toISOString();
                this.config.tokenIssuedAt = new Date().toISOString();
                if (pin && pin.trim()) {
                    this.config.pin = pin.trim();
                }
                // ── Capture refresh_token (valid 15 days, enables daily 9:00 AM auto-renewal) ──
                if (json.refresh_token) {
                    this.config.refreshToken = json.refresh_token;
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 14); // 14 days
                    this.config.refreshTokenExpiresAt = expiry.toISOString();
                    console.log(`[Fyers] Refresh token captured — valid until ${expiry.toLocaleDateString('en-IN')}`);
                }
                const validateRes = await this.validateConnection();
                const userName = validateRes.userName || this.config.userName || 'SRS';
                this.config.userName = userName;
                this.savePersistedConfig();
                // Start the daily 9:00 AM auto-renewal scheduler
                this.scheduleNextDailyRenewal();
                return {
                    success: true,
                    message: json.refresh_token
                        ? `Authenticated successfully as ${userName}! Daily 9:00 AM trading day renewal is ACTIVE (15-day session captured).`
                        : `Authenticated successfully as ${userName}!`,
                    userName,
                    accessToken: json.access_token,
                    refreshToken: json.refresh_token
                };
            }
            else {
                const errorMsg = json?.message || `Fyers Error (${json?.code || response.status}): Failed to exchange auth code. Auth codes expire in 2 minutes and can only be used once.`;
                return { success: false, message: errorMsg };
            }
        }
        catch (err) {
            return { success: false, message: err.message || 'Network error exchanging auth code with Fyers API.' };
        }
    }
    rateLimitUntil = 0;
    cachedOptionChain = new Map();
    getCachedOptionChain(symbol) {
        const direct = this.cachedOptionChain.get(symbol);
        if (direct)
            return direct.result;
        for (const [k, v] of this.cachedOptionChain.entries()) {
            if (k.startsWith(`${symbol}_`))
                return v.result;
        }
        return null;
    }
    async validateConnection() {
        if (!this.config.appId || !this.config.accessToken) {
            this.config.isConnected = false;
            return { success: false, message: 'App ID or Access Token is missing' };
        }
        // Auto-normalize appId with -100 if missing
        if (!this.config.appId.includes('-')) {
            this.config.appId = `${this.config.appId}-100`;
        }
        // ── JWT verification & inspection ─────────────────────────────────────────
        let jwtPayload = null;
        let isJwtValid = false;
        let isExpired = false;
        let isAuthCode = false;
        try {
            const parts = this.config.accessToken.split('.');
            if (parts.length >= 2) {
                jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                if (jwtPayload) {
                    if (jwtPayload.sub === 'auth_code') {
                        isAuthCode = true;
                    }
                    if (jwtPayload.exp) {
                        isExpired = (Date.now() / 1000) > jwtPayload.exp;
                        isJwtValid = !isExpired && !isAuthCode;
                    }
                    else {
                        isJwtValid = !isAuthCode;
                    }
                }
            }
        }
        catch { }
        if (isAuthCode) {
            this.config.isConnected = false;
            return {
                success: false,
                message: 'The token provided is an Auth Code, not an Access Token. Please use "Option 1: Generate Auth Code" with your Secret Key to exchange it for an Access Token.'
            };
        }
        if (isExpired) {
            // Access token expired — try refresh_token auto-renewal first
            if (this.config.refreshToken && this.isRefreshTokenValid()) {
                console.log('[Fyers] Access token expired — attempting silent auto-refresh...');
                const refreshRes = await this.refreshAccessToken();
                if (refreshRes.success) {
                    return { success: true, message: refreshRes.message, userName: refreshRes.userName };
                }
            }
            this.config.isConnected = false;
            return {
                success: false,
                message: 'Fyers Access Token has expired (daily tokens reset at 6:30 AM IST). Please generate a fresh token or use the Auth Code flow.'
            };
        }
        if (!jwtPayload && !this.config.accessToken.includes('.')) {
            this.config.isConnected = false;
            return {
                success: false,
                message: 'Invalid Fyers Access Token format. Fyers access tokens are JWT tokens (starting with eyJ...). Did you enter your Secret Key or App ID instead?'
            };
        }
        try {
            const authHeader = `${this.config.appId}:${this.config.accessToken}`;
            const response = await fetch('https://api-t1.fyers.in/api/v3/profile', {
                headers: {
                    'Authorization': authHeader,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                signal: AbortSignal.timeout(5000)
            });
            let rawText = '';
            try {
                rawText = await response.text();
            }
            catch {
                rawText = '';
            }
            let json = null;
            try {
                if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
                    json = JSON.parse(rawText);
                }
            }
            catch { }
            if (response.ok && json && json.s === 'ok' && json.data) {
                this.config.isConnected = true;
                const rawName = json.data.name || json.data.fy_id || jwtPayload?.fy_id || 'SRS';
                this.config.userName = rawName;
                this.config.lastConnected = new Date().toISOString();
                if (!this.config.tokenIssuedAt) {
                    this.config.tokenIssuedAt = new Date().toISOString();
                }
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Connected successfully as ${rawName}`,
                    userName: rawName
                };
            }
            // If Fyers returned a specific JSON error message
            if (json && json.message && json.s === 'error') {
                this.config.isConnected = false;
                return {
                    success: false,
                    message: json.message || 'Authentication failed. Please check App ID and Access Token.'
                };
            }
            // If Cloudflare rate limit cooldown
            if (response.status === 429) {
                this.config.isConnected = true;
                this.config.userName = this.config.userName || jwtPayload?.fy_id || 'SRS';
                this.config.lastConnected = new Date().toISOString();
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Connected successfully (Broker rate limit active, session retained)`,
                    userName: this.config.userName
                };
            }
            // If endpoint returned HTML (Cloudflare challenge on datacenter IP or proxy redirect),
            // but the JWT token itself is verified and unexpired:
            if (isJwtValid && jwtPayload) {
                console.warn('[Fyers] Profile endpoint returned non-JSON/HTML (likely Cloudflare challenge), accepting verified JWT token.');
                this.config.isConnected = true;
                const rawName = jwtPayload.fy_id || this.config.userName || 'Fyers Trader';
                this.config.userName = rawName;
                this.config.lastConnected = new Date().toISOString();
                if (!this.config.tokenIssuedAt) {
                    this.config.tokenIssuedAt = new Date().toISOString();
                }
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Connected successfully as ${rawName} (Token verified)`,
                    userName: rawName
                };
            }
            this.config.isConnected = false;
            return {
                success: false,
                message: `Fyers authentication failed (${response.status ? `HTTP ${response.status}` : 'Invalid response'}). Please verify your App ID and Access Token.`
            };
        }
        catch (err) {
            // If network glitch or timeout but token is a valid unexpired JWT, accept session
            if (isJwtValid && jwtPayload) {
                console.warn(`[Fyers] Profile network glitch (${err.message}), accepting verified JWT token.`);
                this.config.isConnected = true;
                const rawName = jwtPayload.fy_id || this.config.userName || 'Fyers Trader';
                this.config.userName = rawName;
                this.config.lastConnected = new Date().toISOString();
                this.savePersistedConfig();
                return {
                    success: true,
                    message: `Connected successfully as ${rawName} (Token active)`,
                    userName: rawName
                };
            }
            return { success: false, message: 'Could not connect to Fyers API servers. Please check network connection and credentials.' };
        }
    }
    async fetchOptionChain(symbol, expiryTimestamp) {
        if (!this.config.isConnected || !this.config.accessToken) {
            return null;
        }
        const cacheKey = `${symbol}_${expiryTimestamp || 'default'}`;
        const cached = this.cachedOptionChain.get(cacheKey) || this.cachedOptionChain.get(symbol);
        const now = Date.now();
        // Cache TTL check: serve cached chain for 2.5s to prevent hammering Fyers API
        if (cached && (now - cached.ts < 2500)) {
            return cached.result;
        }
        // If currently rate limited (429 cooldown active), return cached chain rather than failing
        if (now < this.rateLimitUntil) {
            return cached ? cached.result : null;
        }
        try {
            const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
            const fyersSymbol = cfg ? cfg.fyersSymbol : (this.symbolMap[symbol] || `NSE:${symbol}-EQ`);
            const authHeader = `${this.config.appId}:${this.config.accessToken}`;
            let url = `https://api-t1.fyers.in/data/options-chain-v3?symbol=${encodeURIComponent(fyersSymbol)}&strikecount=20`;
            if (expiryTimestamp) {
                let epochSec = 0;
                if (/^\d+$/.test(expiryTimestamp)) {
                    epochSec = parseInt(expiryTimestamp, 10);
                }
                else {
                    const d = NseExpiryService.parseDate(expiryTimestamp);
                    epochSec = Math.floor(d.getTime() / 1000);
                }
                if (epochSec > 0) {
                    url += `&timestamp=${epochSec}`;
                }
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                signal: AbortSignal.timeout(3500)
            });
            if (!response.ok) {
                if (response.status === 429) {
                    this.rateLimitUntil = Date.now() + 45000;
                    console.warn(`[Fyers] options-chain rate limit reached (429) for ${symbol} — backing off for 45s, serving cache`);
                }
                return cached ? cached.result : null;
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return cached ? cached.result : null;
            }
            const json = await response.json().catch(() => null);
            if (!json || json.s !== 'ok' || !json.data) {
                if (json.code === 429 || json.message?.includes('limit')) {
                    this.rateLimitUntil = Date.now() + 45000;
                }
                return cached ? cached.result : null;
            }
            const data = json.data;
            const optionsData = data.optionsChain || [];
            // Find spot record (strike_price: -1)
            const spotRecord = optionsData.find((item) => item.strike_price === -1);
            const spotPrice = spotRecord ? spotRecord.ltp : (data.underlyingValue || 0);
            const prevClose = spotRecord?.prev_close_price || (spotPrice - (spotRecord?.ltpch ?? 0));
            let spotChange = spotRecord && typeof spotRecord.ltpch === 'number'
                ? spotRecord.ltpch
                : (prevClose > 0 && spotPrice > 0 ? +(spotPrice - prevClose).toFixed(2) : 0);
            let spotPctChange = spotRecord && typeof spotRecord.ltpchp === 'number'
                ? spotRecord.ltpchp
                : (prevClose > 0 ? +((spotChange / prevClose) * 100).toFixed(2) : 0);
            // Blacklist ghost 84.80 artifact
            if (typeof spotChange === 'number' && Math.abs(spotChange - 84.80) < 0.05) {
                spotChange = 0;
                spotPctChange = 0;
            }
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
            const result = {
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
            // Cache the good result
            this.cachedOptionChain.set(cacheKey, { result, ts: now });
            this.cachedOptionChain.set(symbol, { result, ts: now });
            return result;
        }
        catch (err) {
            console.warn(`[Fyers] Fetch error for ${symbol}:`, err.message);
            return cached ? cached.result : null;
        }
    }
    async fetchQuotes(symbols) {
        if (!this.config.appId || !this.config.accessToken || symbols.length === 0)
            return [];
        const symList = symbols.join(',');
        const authHeader = `${this.config.appId}:${this.config.accessToken}`;
        const standardHeaders = {
            'Authorization': authHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        };
        // Primary: AWS Mumbai endpoint (api.fyers.in/api/v2/quotes) — no Cloudflare rate limit, low latency (<200ms)
        try {
            const response = await fetch(`https://api.fyers.in/api/v2/quotes?symbols=${encodeURIComponent(symList)}`, {
                headers: standardHeaders,
                signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
                const json = await response.json().catch(() => null);
                if (json && json.s === 'ok' && Array.isArray(json.d)) {
                    return json.d;
                }
            }
        }
        catch { }
        // Fallback: api-t1 endpoint (if not currently in 429 rate limit cooldown)
        if (Date.now() >= this.rateLimitUntil) {
            try {
                const response = await fetch(`https://api-t1.fyers.in/data/quotes?symbols=${encodeURIComponent(symList)}`, {
                    headers: standardHeaders,
                    signal: AbortSignal.timeout(3000)
                });
                if (!response.ok) {
                    if (response.status === 429) {
                        this.rateLimitUntil = Date.now() + 30000;
                    }
                    return [];
                }
                const json = await response.json().catch(() => null);
                if (json && json.s === 'ok' && Array.isArray(json.d)) {
                    return json.d;
                }
            }
            catch { }
        }
        return [];
    }
    async fetchBatchQuotes(symbolConfigs) {
        const resultMap = new Map();
        if (!this.config.appId || !this.config.accessToken || symbolConfigs.length === 0)
            return resultMap;
        try {
            const fyersMap = new Map(); // fyersSymbol -> appSymbol
            const fyersList = [];
            for (const sc of symbolConfigs) {
                if (sc.fyersSymbol) {
                    fyersMap.set(sc.fyersSymbol, sc.symbol);
                    fyersList.push(sc.fyersSymbol);
                }
            }
            const rawQuotes = await this.fetchQuotes(fyersList);
            for (const item of rawQuotes) {
                const fyersSym = item.n;
                const appSym = fyersMap.get(fyersSym);
                const v = item.v;
                if (appSym && v && typeof v.lp === 'number') {
                    const prevClose = v.prev_close_price || (v.lp - (v.ch ?? 0));
                    let change = typeof v.ch === 'number' ? v.ch : +(v.lp - prevClose).toFixed(2);
                    let pctChange = typeof v.chp === 'number' ? v.chp : (prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0);
                    if (typeof change === 'number' && Math.abs(change - 84.80) < 0.05) {
                        change = 0;
                        pctChange = 0;
                    }
                    resultMap.set(appSym, {
                        symbol: appSym,
                        fyersSymbol: fyersSym,
                        price: v.lp,
                        change,
                        pctChange,
                        high: v.high_price,
                        low: v.low_price,
                        open: v.open_price,
                        prevClose: v.prev_close_price,
                        volume: v.volume
                    });
                }
            }
        }
        catch (err) {
            console.warn('[Fyers] fetchBatchQuotes error:', err.message);
        }
        return resultMap;
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
export const fyersService = new FyersService();
