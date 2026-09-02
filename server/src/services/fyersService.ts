import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IndexSymbol, FyersConfig, ALL_SYMBOLS_CONFIG } from '../types.js';
import { NseExpiryService } from './nseExpiryService.js';

const findConfigPath = (): string => {
  const p1 = path.resolve(process.cwd(), 'fyersConfig.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'server', 'fyersConfig.json');
  if (fs.existsSync(p2)) return p2;
  return p1;
};

const CONFIG_PATH = findConfigPath();

interface RawStrikeSnapshot {
  strikePrice: number;
  callOI: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putLtp: number;
  putVolume: number;
}

export interface FyersOptionChainResult {
  symbol: IndexSymbol;
  spotPrice: number;
  spotChange: number;
  spotPctChange: number;
  strikes: RawStrikeSnapshot[];
  expiryDates: string[];
  selectedExpiry: string;
  totalCallOI?: number;
  totalPutOI?: number;
  indiaVix?: number;
}

export class FyersService {
  private config: FyersConfig = {
    appId: '',
    secretKey: '',
    accessToken: '',
    isConnected: false
  };

  private symbolMap: Record<IndexSymbol, string> = {
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

  private loadPersistedConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.appId && parsed.accessToken) {
          this.config = {
            appId:                parsed.appId,
            secretKey:            parsed.secretKey || '',
            accessToken:          parsed.accessToken,
            isConnected:          false,
            userName:             parsed.userName,
            lastConnected:        parsed.lastConnected,
            refreshToken:         parsed.refreshToken,
            tokenRefreshedAt:     parsed.tokenRefreshedAt,
            refreshTokenExpiresAt: parsed.refreshTokenExpiresAt,
          };

          // Check if access token is already expired — try auto-refresh first
          const isExpired = this.isAccessTokenExpired();
          if (isExpired && this.config.refreshToken) {
            console.log('[Fyers] Access token expired. Attempting auto-refresh via refresh_token...');
            this.refreshAccessToken().then(res => {
              if (res.success) {
                console.log(`[Fyers] ✅ Auto-refresh succeeded — connected as ${res.userName}`);
                this.scheduleNextDailyRenewal();
              } else {
                console.warn(`[Fyers] ⚠️ Auto-refresh failed: ${res.message}. Will retry on next token use.`);
              }
            });
          } else {
            // Access token looks valid — validate it
            this.validateConnection().then(res => {
              if (res.success) {
                console.log(`[Fyers] Auto-connected as ${res.userName}`);
                this.scheduleNextDailyRenewal();
              } else if (this.config.refreshToken) {
                // Validation failed (maybe just expired) — try refresh
                this.refreshAccessToken().then(r => {
                  if (r.success) {
                    console.log(`[Fyers] ✅ Auto-refresh after failed validation — connected as ${r.userName}`);
                    this.scheduleNextDailyRenewal();
                  }
                });
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Fyers] Config load error:', err);
    }
  }

  private savePersistedConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        appId:                this.config.appId,
        secretKey:            this.config.secretKey,
        accessToken:          this.config.accessToken,
        isConnected:          this.config.isConnected,
        userName:             this.config.userName,
        lastConnected:        this.config.lastConnected,
        refreshToken:         this.config.refreshToken,
        tokenRefreshedAt:     this.config.tokenRefreshedAt,
        refreshTokenExpiresAt: this.config.refreshTokenExpiresAt,
      }, null, 2));
    } catch (err) {
      console.warn('[Fyers] Config save error:', err);
    }
  }

  // ── Token expiry helpers ──────────────────────────────────────────────────────

  /** Returns true if the current access token's JWT `exp` claim has passed. */
  public isAccessTokenExpired(): boolean {
    try {
      const parts = this.config.accessToken?.split('.');
      if (parts && parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.exp) return (Date.now() / 1000) > payload.exp;
      }
    } catch {}
    return false;
  }

  /** Returns true if the stored refresh_token is still within its 15-day window. */
  public isRefreshTokenValid(): boolean {
    if (!this.config.refreshToken) return false;
    if (!this.config.refreshTokenExpiresAt) return true; // assume valid if no expiry recorded
    return Date.now() < new Date(this.config.refreshTokenExpiresAt).getTime();
  }

  // ── Daily auto-renewal scheduler ─────────────────────────────────────────────

  private dailyRenewalTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Schedules the next 6:30 AM IST access token renewal.
   * Called after every successful connection (initial or refresh).
   * Fyers invalidates all access tokens between 6:00–6:30 AM IST daily.
   */
  public scheduleNextDailyRenewal() {
    if (this.dailyRenewalTimer) clearTimeout(this.dailyRenewalTimer);
    if (!this.isRefreshTokenValid()) return; // nothing to schedule with

    const msUntilRenewal = this.msUntilNextFyersReset();
    const minutesUntil   = Math.round(msUntilRenewal / 60000);
    console.log(`[Fyers] Daily token renewal scheduled in ${minutesUntil} minutes (at 6:30 AM IST)`);

    this.dailyRenewalTimer = setTimeout(async () => {
      console.log('[Fyers] ⏰ 6:30 AM IST — running scheduled daily token renewal...');
      const res = await this.refreshAccessToken();
      if (res.success) {
        console.log(`[Fyers] ✅ Scheduled renewal succeeded — active as ${res.userName}`);
        this.scheduleNextDailyRenewal(); // schedule tomorrow's renewal
        // Notify any active broadcast listeners via callback
        this.onTokenRenewed?.(this.config);
      } else {
        console.warn(`[Fyers] ❌ Scheduled renewal failed: ${res.message}`);
        this.scheduleNextDailyRenewal(); // retry same slot tomorrow anyway
      }
    }, msUntilRenewal);
  }

  /** Callback invoked after a successful auto-renewal (server index.ts wires this up) */
  public onTokenRenewed: ((config: FyersConfig) => void) | null = null;

  /** Returns milliseconds until the next 6:30 AM IST. */
  private msUntilNextFyersReset(): number {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 3600000 * 5.5);

    // Next 6:30 AM IST (could be today if not yet passed, otherwise tomorrow)
    const next630 = new Date(ist);
    next630.setHours(6, 32, 0, 0); // 6:32 AM for safety margin (not 6:30)
    if (ist >= next630) next630.setDate(next630.getDate() + 1); // already past — use tomorrow

    // Convert back to UTC ms
    const next630Utc = next630.getTime() - 3600000 * 5.5;
    return Math.max(next630Utc - Date.now(), 60000); // minimum 1 min
  }

  // ── Refresh Token Exchange ────────────────────────────────────────────────────

  /**
   * Uses the stored Fyers refresh_token to obtain a fresh access_token.
   * No browser interaction required. Refresh tokens are valid for 15 days.
   *
   * Fyers endpoint: POST https://api-t1.fyers.in/api/v3/validate-refresh-token
   * Body: { grant_type, appIdHash, refresh_token }
   */
  public async refreshAccessToken(): Promise<{ success: boolean; message: string; userName?: string }> {
    if (!this.config.refreshToken) {
      return { success: false, message: 'No refresh token stored. Please login via auth code first.' };
    }
    if (!this.config.appId || !this.config.secretKey) {
      return { success: false, message: 'App ID and Secret Key are required for token refresh.' };
    }
    if (!this.isRefreshTokenValid()) {
      return { success: false, message: 'Refresh token has expired (15-day limit). Please login via auth code to get a new refresh token.' };
    }

    try {
      const hashInput = `${this.config.appId}:${this.config.secretKey}`;
      const appIdHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      console.log(`[Fyers] Refreshing access token for appId: ${this.config.appId}...`);

      const response = await fetch('https://api-t1.fyers.in/api/v3/validate-refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type:    'refresh_token',
          appIdHash,
          refresh_token: this.config.refreshToken
        })
      });

      let json: any = null;
      try {
        const text = await response.text();
        json = JSON.parse(text);
      } catch {
        return { success: false, message: `Fyers refresh endpoint returned HTTP ${response.status}.` };
      }

      if (json?.s === 'ok' && json.access_token) {
        this.config.accessToken      = json.access_token;
        // Fyers may rotate the refresh token on renewal — capture if returned
        if (json.refresh_token) {
          this.config.refreshToken = json.refresh_token;
        }
        this.config.isConnected      = true;
        this.config.tokenRefreshedAt = new Date().toISOString();
        this.config.lastConnected    = new Date().toISOString();

        const validateRes = await this.validateConnection();
        const userName = validateRes.userName || this.config.userName || 'SRS';
        this.config.userName = userName;
        this.savePersistedConfig();

        console.log(`[Fyers] ✅ Token refreshed successfully. Access token valid until tomorrow 6:30 AM IST.`);
        return { success: true, message: `Token refreshed. Connected as ${userName}.`, userName };
      } else {
        const msg = json?.message || `Fyers refresh failed (code: ${json?.code || response.status})`;
        // Refresh token itself might have expired
        if (json?.code === 16 || json?.message?.toLowerCase().includes('expired')) {
          this.config.refreshToken = undefined; // clear invalid refresh token
          this.savePersistedConfig();
          return { success: false, message: 'Refresh token expired (15-day limit reached). Please login via auth code to renew.' };
        }
        return { success: false, message: msg };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during token refresh.' };
    }
  }

  public setConfig(appId: string, accessToken: string, secretKey?: string) {
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

  public getConfig(): FyersConfig {
    return this.config;
  }

  public async exchangeAuthCode(
    appId: string,
    secretKey: string,
    authCode: string
  ): Promise<{ success: boolean; message: string; userName?: string; accessToken?: string; refreshToken?: string }> {
    let cleanAppId = appId.trim();
    if (cleanAppId && !cleanAppId.includes('-')) {
      cleanAppId = `${cleanAppId}-100`;
    }
    const cleanSecret = secretKey.trim();
    let cleanAuthCode = authCode.trim();
    if (cleanAuthCode.includes('auth_code=')) {
      try {
        const match = cleanAuthCode.match(/auth_code=([^&]+)/);
        if (match && match[1]) cleanAuthCode = decodeURIComponent(match[1]);
      } catch {}
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', appIdHash, code: cleanAuthCode })
      });

      let json: any = null;
      try {
        const text = await response.text();
        json = JSON.parse(text);
      } catch {
        return {
          success: false,
          message: `Fyers returned HTTP ${response.status}. Please generate a new Auth Code (each code is valid for 2 minutes and can only be used once).`
        };
      }

      if (json && json.s === 'ok' && json.access_token) {
        this.config.appId        = cleanAppId;
        this.config.secretKey    = cleanSecret;
        this.config.accessToken  = json.access_token;
        this.config.isConnected  = true;
        this.config.lastConnected = new Date().toISOString();

        // ── Capture refresh_token (valid 15 days, enables daily auto-renewal) ──
        if (json.refresh_token) {
          this.config.refreshToken = json.refresh_token;
          // Refresh token expires 15 days from now at 6:30 AM IST
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 14); // conservative: 14 days
          this.config.refreshTokenExpiresAt = expiry.toISOString();
          console.log(`[Fyers] Refresh token captured — valid until ${expiry.toLocaleDateString('en-IN')}`);
        }

        const validateRes = await this.validateConnection();
        const userName = validateRes.userName || this.config.userName || 'SRS';
        this.config.userName = userName;
        this.savePersistedConfig();

        // Start the daily auto-renewal scheduler
        this.scheduleNextDailyRenewal();

        return {
          success: true,
          message: json.refresh_token
            ? `Authenticated successfully as ${userName}! Daily auto-renewal active (15-day refresh token captured).`
            : `Authenticated successfully as ${userName}!`,
          userName,
          accessToken:  json.access_token,
          refreshToken: json.refresh_token
        };
      } else {
        const errorMsg = json?.message || `Fyers Error (${json?.code || response.status}): Failed to exchange auth code. Auth codes expire in 2 minutes and can only be used once.`;
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error exchanging auth code with Fyers API.' };
    }
  }

  private rateLimitUntil: number = 0;

  public async validateConnection(): Promise<{ success: boolean; message: string; userName?: string }> {
    if (!this.config.appId || !this.config.accessToken) {
      this.config.isConnected = false;
      return { success: false, message: 'App ID or Access Token is missing' };
    }

    // Auto-normalize appId with -100 if missing
    if (!this.config.appId.includes('-')) {
      this.config.appId = `${this.config.appId}-100`;
    }

    // ── JWT expiry check: if expired + have refresh_token → auto-refresh ─────
    try {
      const parts = this.config.accessToken.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.exp && (Date.now() / 1000) > payload.exp) {
          // Access token expired — try refresh_token auto-renewal first
          if (this.config.refreshToken && this.isRefreshTokenValid()) {
            console.log('[Fyers] Access token expired — attempting silent auto-refresh...');
            const refreshRes = await this.refreshAccessToken();
            if (refreshRes.success) {
              return { success: true, message: refreshRes.message, userName: refreshRes.userName };
            }
          }
          this.config.isConnected = false;
          return { success: false, message: 'Fyers Access Token has expired. Please generate a fresh token or use refresh token.' };
        }
      }
    } catch {}

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

      const json: any = await response.json();
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
      } else {
        this.config.isConnected = false;
        return {
          success: false,
          message: json.message || 'Authentication failed. Please check App ID and Access Token.'
        };
      }
    } catch (err: any) {
      // If network glitch but valid JWT, keep session
      return { success: false, message: err.message || 'Network error connecting to Fyers API' };
    }
  }

  public async fetchOptionChain(symbol: IndexSymbol, expiryTimestamp?: string): Promise<FyersOptionChainResult | null> {
    if (!this.config.isConnected || !this.config.accessToken) {
      return null;
    }

    if (Date.now() < this.rateLimitUntil) {
      return null;
    }

    try {
      const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
      const fyersSymbol = cfg ? cfg.fyersSymbol : (this.symbolMap[symbol] || `NSE:${symbol}-EQ`);
      const authHeader = `${this.config.appId}:${this.config.accessToken}`;
      
      let url = `https://api-t1.fyers.in/data/options-chain-v3?symbol=${encodeURIComponent(fyersSymbol)}&strikecount=30`;
      if (expiryTimestamp) {
        let epochSec = 0;
        if (/^\d+$/.test(expiryTimestamp)) {
          epochSec = parseInt(expiryTimestamp, 10);
        } else {
          const d = NseExpiryService.parseDate(expiryTimestamp);
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

      const json: any = await response.json();
      if (json.s !== 'ok' || !json.data) {
        return null;
      }

      const data = json.data;
      const optionsData = data.optionsChain || [];

      // Find spot record (strike_price: -1)
      const spotRecord = optionsData.find((item: any) => item.strike_price === -1);
      const spotPrice = spotRecord ? spotRecord.ltp : (data.underlyingValue || 0);
      const prevClose = spotRecord?.prev_close_price || (spotPrice - (spotRecord?.ltpch ?? 0));
      const spotChange = spotRecord && typeof spotRecord.ltpch === 'number'
        ? spotRecord.ltpch
        : (prevClose > 0 && spotPrice > 0 ? +(spotPrice - prevClose).toFixed(2) : 0);
      const spotPctChange = spotRecord && typeof spotRecord.ltpchp === 'number'
        ? spotRecord.ltpchp
        : (prevClose > 0 ? +((spotChange / prevClose) * 100).toFixed(2) : 0);

      // Extract expiry dates in format DD-MMM-YYYY directly from Fyers exchange data
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const rawExpiryList = data.expiryData || [];
      const expiryDates: string[] = [];

      for (const exp of rawExpiryList) {
        if (exp.date) {
          const parts = exp.date.split('-');
          if (parts.length === 3) {
            const day = parts[0];
            const mIdx = parseInt(parts[1], 10) - 1;
            const yr = parts[2];
            expiryDates.push(`${day}-${MONTHS[mIdx]}-${yr}`);
          } else {
            expiryDates.push(exp.date);
          }
        }
      }

      const selectedExpiry = expiryTimestamp || expiryDates[0] || '';

      // Group into Call and Put pairs by strike_price
      const strikeMap = new Map<number, {
        callOI: number;
        callOIChangeTotal: number;
        callLtp: number;
        callVolume: number;
        putOI: number;
        putOIChangeTotal: number;
        putLtp: number;
        putVolume: number;
      }>();

      for (const item of optionsData) {
        const sp = item.strike_price;
        if (sp <= 0) continue; // Skip index record

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

        const entry = strikeMap.get(sp)!;
        if (item.option_type === 'CE') {
          entry.callOI = item.oi || 0;
          entry.callOIChangeTotal = item.oich || 0;
          entry.callLtp = item.ltp || 0;
          entry.callVolume = item.volume || 0;
        } else if (item.option_type === 'PE') {
          entry.putOI = item.oi || 0;
          entry.putOIChangeTotal = item.oich || 0;
          entry.putLtp = item.ltp || 0;
          entry.putVolume = item.volume || 0;
        }
      }

      const strikes: RawStrikeSnapshot[] = Array.from(strikeMap.entries())
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
    } catch (err: any) {
      console.warn(`[Fyers] Fetch error for ${symbol}:`, err.message);
      return null;
    }
  }

  public async fetchQuotes(symbols: string[]): Promise<any[]> {
    if (!this.config.appId || !this.config.accessToken) return [];
    try {
      const symList = symbols.join(',');
      const response = await fetch(`https://api-t1.fyers.in/data/quotes?symbols=${encodeURIComponent(symList)}`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });
      if (!response.ok) return [];
      const json = await response.json();
      if (json && json.s === 'ok' && Array.isArray(json.d)) {
        return json.d;
      }
      return [];
    } catch {
      return [];
    }
  }

  public async fetchBatchQuotes(symbolConfigs: { symbol: string; fyersSymbol: string }[]): Promise<Map<string, FyersQuoteItem>> {
    const resultMap = new Map<string, FyersQuoteItem>();
    if (!this.config.appId || !this.config.accessToken || symbolConfigs.length === 0) return resultMap;

    try {
      const fyersMap = new Map<string, string>(); // fyersSymbol -> appSymbol
      const fyersList: string[] = [];
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
          const change = typeof v.ch === 'number' ? v.ch : +(v.lp - prevClose).toFixed(2);
          const pctChange = typeof v.chp === 'number' ? v.chp : (prevClose > 0 ? +((change / prevClose) * 100).toFixed(2) : 0);

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
    } catch (err: any) {
      console.warn('[Fyers] fetchBatchQuotes error:', err.message);
    }

    return resultMap;
  }

  public async fetchIndiaVix(): Promise<{ price: number; change: number; pctChange: number } | null> {
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

export interface FyersQuoteItem {
  symbol: string;
  fyersSymbol: string;
  price: number;
  change: number;
  pctChange: number;
  high?: number;
  low?: number;
  open?: number;
  prevClose?: number;
  volume?: number;
}

export const fyersService = new FyersService();
