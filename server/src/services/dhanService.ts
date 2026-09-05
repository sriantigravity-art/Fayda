import fs from 'fs';
import path from 'path';
import { IndexSymbol, DhanConfig, ALL_SYMBOLS_CONFIG } from '../types.js';
import { NseExpiryService } from './nseExpiryService.js';
import type { FyersOptionChainResult } from './fyersService.js';

const findConfigPath = (): string => {
  const p1 = path.resolve(process.cwd(), 'dhanConfig.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'server', 'dhanConfig.json');
  if (fs.existsSync(p2)) return p2;
  return p1;
};

const CONFIG_PATH = findConfigPath();

export interface DhanOptionChainStrike {
  strikePrice: number;
  callOI: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putLtp: number;
  putVolume: number;
}

export class DhanService {
  private config: DhanConfig = {
    clientId: '',
    accessToken: '',
    isConnected: false
  };

  private underlyingMap: Record<IndexSymbol, { scripCode: number; segment: string }> = {
    NIFTY: { scripCode: 13, segment: 'IDX_I' },
    BANKNIFTY: { scripCode: 25, segment: 'IDX_I' },
    FINNIFTY: { scripCode: 27, segment: 'IDX_I' },
    MIDCPNIFTY: { scripCode: 442, segment: 'IDX_I' },
    SENSEX: { scripCode: 51, segment: 'IDX_I' },
    BANKEX: { scripCode: 52, segment: 'IDX_I' },
    NIFTYNXT50: { scripCode: 14, segment: 'IDX_I' },
    CRUDEOIL: { scripCode: 100, segment: 'MCX_COMM' },
    NATURALGAS: { scripCode: 101, segment: 'MCX_COMM' },
    GOLD: { scripCode: 102, segment: 'MCX_COMM' },
    SILVER: { scripCode: 103, segment: 'MCX_COMM' },
    COPPER: { scripCode: 104, segment: 'MCX_COMM' },
    ZINC: { scripCode: 105, segment: 'MCX_COMM' }
  };

  constructor() {
    this.loadPersistedConfig();
  }

  private loadPersistedConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.clientId && parsed.accessToken) {
          this.config = {
            clientId: parsed.clientId,
            accessToken: parsed.accessToken,
            isConnected: false,
            userName: parsed.userName,
            lastConnected: parsed.lastConnected,
            tokenExpiresAt: parsed.tokenExpiresAt
          };

          // Validate token asynchronously on startup
          this.validateConnection().then(res => {
            if (res.success) {
              console.log(`[Dhan] ✅ Auto-connected to DhanHQ as ${res.userName || parsed.clientId}`);
            } else {
              console.log(`[Dhan] Stored token invalid or expired: ${res.message}`);
            }
          });
        }
      }
    } catch (err) {
      console.warn('[Dhan] Error reading persisted config:', err);
    }
  }

  private persistConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Dhan] Error saving config:', err);
    }
  }

  public getConfig(): DhanConfig {
    return { ...this.config };
  }

  public setConfig(clientId: string, accessToken: string) {
    this.config = {
      clientId: clientId.trim(),
      accessToken: accessToken.trim(),
      isConnected: false
    };
    this.persistConfig();
  }

  public clearConfig() {
    this.config = {
      clientId: '',
      accessToken: '',
      isConnected: false
    };
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Validate connection to Dhan by hitting Fund Limit or Profile API
   */
  public async validateConnection(): Promise<{ success: boolean; message: string; userName?: string }> {
    if (!this.config.clientId || !this.config.accessToken) {
      this.config.isConnected = false;
      return { success: false, message: 'Dhan Client ID and Access Token are required' };
    }

    try {
      // Dhan Fund Limit endpoint: GET https://api.dhan.co/v2/fundlimit
      const resp = await fetch('https://api.dhan.co/v2/fundlimit', {
        headers: {
          'client-id': this.config.clientId,
          'access-token': this.config.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        this.config.isConnected = true;
        this.config.lastConnected = new Date().toISOString();
        this.config.userName = this.config.userName || `Dhan Trader (${this.config.clientId})`;
        this.persistConfig();
        return {
          success: true,
          message: 'Connected to DhanHQ successfully',
          userName: this.config.userName
        };
      } else {
        const status = resp.status;
        const errText = await resp.text().catch(() => '');
        this.config.isConnected = false;
        return {
          success: false,
          message: status === 401 
            ? 'Invalid or expired Dhan Access Token. Please generate a fresh token from Dhan Web Portal.' 
            : `Dhan API error (${status}): ${errText.slice(0, 100)}`
        };
      }
    } catch (error: any) {
      this.config.isConnected = false;
      return {
        success: false,
        message: `Network error connecting to Dhan API: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch live option chain for a given symbol and expiry
   */
  public async fetchOptionChain(symbol: IndexSymbol, expiry?: string): Promise<FyersOptionChainResult | null> {
    if (!this.config.isConnected && !this.config.accessToken) {
      return null;
    }

    const mapping = this.underlyingMap[symbol];
    if (!mapping) {
      console.warn(`[Dhan] No scrip mapping for symbol ${symbol}`);
      return null;
    }

    try {
      // Step 1: Determine target expiry date
      let chosenExpiry = expiry;
      if (!chosenExpiry) {
        chosenExpiry = await this.getNearestExpiry(symbol, mapping);
      }

      // Step 2: Query Dhan Option Chain API: POST https://api.dhan.co/v2/optionchain
      const requestPayload: any = {
        UnderlyingScrip: mapping.scripCode,
        UnderlyingSeg: mapping.segment
      };

      if (chosenExpiry) {
        requestPayload.Expiry = chosenExpiry;
      }

      const resp = await fetch('https://api.dhan.co/v2/optionchain', {
        method: 'POST',
        headers: {
          'client-id': this.config.clientId,
          'access-token': this.config.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!resp.ok) {
        console.warn(`[Dhan] fetchOptionChain error ${resp.status} for ${symbol}`);
        return null;
      }

      const json: any = await resp.json();
      return this.normalizeDhanOptionChain(symbol, json, chosenExpiry || '');
    } catch (err) {
      console.error(`[Dhan] Exception fetching option chain for ${symbol}:`, err);
      return null;
    }
  }

  /**
   * Normalize Dhan's Option Chain response into Fayda's standard FyersOptionChainResult
   */
  private normalizeDhanOptionChain(symbol: IndexSymbol, data: any, selectedExpiry: string): FyersOptionChainResult | null {
    if (!data) return null;

    const ocData = data.data || data;
    const spotPrice = Number(ocData.last_price || ocData.spot_price || ocData.spotPrice || 0);

    const strikesMap: Record<number, DhanOptionChainStrike> = {};
    let totalCallOI = 0;
    let totalPutOI = 0;

    // Dhan format A: { oc: { "24500.00": { ce: {...}, pe: {...} } } }
    if (ocData.oc && typeof ocData.oc === 'object') {
      for (const [strikeStr, strikeObj] of Object.entries(ocData.oc as Record<string, any>)) {
        const strikePrice = parseFloat(strikeStr);
        if (isNaN(strikePrice)) continue;

        const ce = strikeObj.ce || {};
        const pe = strikeObj.pe || {};

        const callOI = Number(ce.oi || ce.open_interest || 0);
        const callLtp = Number(ce.last_price || ce.ltp || 0);
        const callVolume = Number(ce.volume || 0);

        const putOI = Number(pe.oi || pe.open_interest || 0);
        const putLtp = Number(pe.last_price || pe.ltp || 0);
        const putVolume = Number(pe.volume || 0);

        totalCallOI += callOI;
        totalPutOI += putOI;

        strikesMap[strikePrice] = {
          strikePrice,
          callOI,
          callLtp,
          callVolume,
          putOI,
          putLtp,
          putVolume
        };
      }
    } 
    // Dhan format B: Array of strike rows
    else if (Array.isArray(ocData.strikes || ocData.data)) {
      const arr = ocData.strikes || ocData.data;
      for (const item of arr) {
        const strikePrice = Number(item.strike_price || item.strikePrice || 0);
        if (!strikePrice) continue;

        const callOI = Number(item.ce_oi || item.callOI || 0);
        const callLtp = Number(item.ce_ltp || item.callLtp || 0);
        const callVolume = Number(item.ce_volume || item.callVolume || 0);

        const putOI = Number(item.pe_oi || item.putOI || 0);
        const putLtp = Number(item.pe_ltp || item.putLtp || 0);
        const putVolume = Number(item.pe_volume || item.putVolume || 0);

        totalCallOI += callOI;
        totalPutOI += putOI;

        strikesMap[strikePrice] = {
          strikePrice,
          callOI,
          callLtp,
          callVolume,
          putOI,
          putLtp,
          putVolume
        };
      }
    }

    const strikes = Object.values(strikesMap).sort((a, b) => a.strikePrice - b.strikePrice);

    const expiryDates = Array.isArray(ocData.expirylist || ocData.expiry_dates)
      ? (ocData.expirylist || ocData.expiry_dates)
      : [selectedExpiry || new Date().toISOString().slice(0, 10)];

    return {
      symbol,
      spotPrice,
      spotChange: 0,
      spotPctChange: 0,
      strikes,
      expiryDates,
      selectedExpiry: selectedExpiry || expiryDates[0] || '',
      totalCallOI,
      totalPutOI
    };
  }

  /**
   * Helper to retrieve the nearest available expiry date for a symbol
   */
  private async getNearestExpiry(symbol: IndexSymbol, mapping: { scripCode: number; segment: string }): Promise<string> {
    try {
      const resp = await fetch('https://api.dhan.co/v2/optionchain/expirylist', {
        method: 'POST',
        headers: {
          'client-id': this.config.clientId,
          'access-token': this.config.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          UnderlyingScrip: mapping.scripCode,
          UnderlyingSeg: mapping.segment
        })
      });

      if (resp.ok) {
        const json: any = await resp.json();
        const list: string[] = json.data || json;
        if (Array.isArray(list) && list.length > 0) {
          return list[0];
        }
      }
    } catch {
      // fallback to NseExpiryService
    }

    const expiries = NseExpiryService.getUpcomingExpiries(symbol, 1);
    return expiries[0] || new Date().toISOString().slice(0, 10);
  }

  /**
   * Fetch batch spot quotes from Dhan
   */
  public async fetchBatchQuotes(symbols: IndexSymbol[]): Promise<Record<string, number>> {
    if (!this.config.isConnected) return {};

    const quotes: Record<string, number> = {};
    const idxScrips: number[] = [];

    for (const sym of symbols) {
      const map = this.underlyingMap[sym];
      if (map && map.segment === 'IDX_I') {
        idxScrips.push(map.scripCode);
      }
    }

    if (idxScrips.length === 0) return quotes;

    try {
      const resp = await fetch('https://api.dhan.co/v2/marketfeed/ltp', {
        method: 'POST',
        headers: {
          'client-id': this.config.clientId,
          'access-token': this.config.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          IDX_I: idxScrips
        })
      });

      if (resp.ok) {
        const json: any = await resp.json();
        const data = json.data?.IDX_I || json.IDX_I || {};
        for (const sym of symbols) {
          const map = this.underlyingMap[sym];
          if (map && data[map.scripCode]) {
            const ltp = Number(data[map.scripCode].last_price || data[map.scripCode]);
            if (!isNaN(ltp) && ltp > 0) {
              quotes[sym] = ltp;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Dhan] fetchBatchQuotes error:', err);
    }

    return quotes;
  }
}

export const dhanService = new DhanService();
