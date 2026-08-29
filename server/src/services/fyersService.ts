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
    } catch (err) {
      console.warn('[Fyers] Config load error:', err);
    }
  }

  private savePersistedConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.warn('[Fyers] Config save error:', err);
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
  ): Promise<{ success: boolean; message: string; userName?: string; accessToken?: string }> {
    let cleanAppId = appId.trim();
    if (cleanAppId && !cleanAppId.includes('-')) {
      cleanAppId = `${cleanAppId}-100`;
    }
    const cleanSecret = secretKey.trim();
    const cleanAuthCode = authCode.trim();

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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          appIdHash,
          code: cleanAuthCode
        })
      });

      const json: any = await response.json();
      if (json.s === 'ok' && json.access_token) {
        this.config.appId = cleanAppId;
        this.config.secretKey = cleanSecret;
        this.config.accessToken = json.access_token;

        const validateRes = await this.validateConnection();
        if (validateRes.success) {
          this.savePersistedConfig();
          return {
            success: true,
            message: `Authenticated successfully as ${validateRes.userName}!`,
            userName: validateRes.userName,
            accessToken: json.access_token
          };
        } else {
          return {
            success: false,
            message: `Token obtained but profile validation failed: ${validateRes.message}`
          };
        }
      } else {
        const errorMsg = json.message || `Fyers Error (${json.code || 'unknown'}): Failed to exchange auth code.`;
        return {
          success: false,
          message: errorMsg
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error exchanging auth code with Fyers API.'
      };
    }
  }

  public async validateConnection(): Promise<{ success: boolean; message: string; userName?: string }> {
    if (!this.config.appId || !this.config.accessToken) {
      this.config.isConnected = false;
      return { success: false, message: 'App ID or Access Token is missing' };
    }

    // Auto-normalize appId with -100 if missing
    if (!this.config.appId.includes('-')) {
      this.config.appId = `${this.config.appId}-100`;
    }

    try {
      const authHeader = `${this.config.appId}:${this.config.accessToken}`;
      const response = await fetch('https://api-t1.fyers.in/api/v3/profile', {
        headers: {
          'Authorization': authHeader
        }
      });

      const json: any = await response.json();
      if (json.s === 'ok' && json.data) {
        this.config.isConnected = true;
        const rawName = json.data.name || json.data.fy_id || '';
        this.config.userName = 'SRS';
        this.config.lastConnected = new Date().toISOString();
        this.savePersistedConfig();
        return {
          success: true,
          message: `Connected successfully as SRS`,
          userName: 'SRS'
        };
      } else {
        this.config.isConnected = false;
        return {
          success: false,
          message: json.message || 'Authentication failed. Please check App ID and Access Token.'
        };
      }
    } catch (err: any) {
      this.config.isConnected = false;
      return { success: false, message: err.message || 'Network error connecting to Fyers API' };
    }
  }

  public async fetchOptionChain(symbol: IndexSymbol, expiryTimestamp?: string): Promise<FyersOptionChainResult | null> {
    if (!this.config.isConnected || !this.config.accessToken) {
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

      const json: any = await response.json();
      if (json.s !== 'ok' || !json.data) {
        return null;
      }

      const data = json.data;
      const optionsData = data.optionsChain || [];

      // Find spot record (strike_price: -1)
      const spotRecord = optionsData.find((item: any) => item.strike_price === -1);
      const spotPrice = spotRecord ? spotRecord.ltp : (data.underlyingValue || 0);
      const spotChange = spotRecord ? spotRecord.ltpch : 0;
      const spotPctChange = spotRecord ? spotRecord.ltpchp : 0;

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
}

export const fyersService = new FyersService();
