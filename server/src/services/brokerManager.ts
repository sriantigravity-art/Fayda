import fs from 'fs';
import path from 'path';
import { ActiveBroker, IndexSymbol } from '../types.js';
import { dhanService } from './dhanService.js';
import { fyersService, type FyersOptionChainResult } from './fyersService.js';

const findBrokerPrefPath = (): string => {
  const p1 = path.resolve(process.cwd(), 'brokerPreference.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.resolve(process.cwd(), 'server', 'brokerPreference.json');
  if (fs.existsSync(p2)) return p2;
  return path.basename(process.cwd()) === 'server' ? p1 : p2;
};

export class BrokerManager {
  private activeBroker: ActiveBroker = 'FYERS';
  private preferenceFileExisted = false;

  constructor() {
    this.loadPreference();
  }

  private loadPreference() {
    try {
      const prefPath = findBrokerPrefPath();
      if (fs.existsSync(prefPath)) {
        this.preferenceFileExisted = true;
        const raw = fs.readFileSync(prefPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.activeBroker) {
          this.activeBroker = parsed.activeBroker;
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default to the broker that is actually configured
    if (fyersService.getConfig().appId && fyersService.getConfig().accessToken) {
      this.activeBroker = 'FYERS';
    } else if (dhanService.getConfig().clientId && dhanService.getConfig().accessToken) {
      this.activeBroker = 'DHAN';
    } else {
      this.activeBroker = 'SIMULATOR';
    }
  }

  private persistPreference() {
    try {
      const prefPath = findBrokerPrefPath();
      fs.writeFileSync(prefPath, JSON.stringify({ activeBroker: this.activeBroker }, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[BrokerManager] Error saving preference:', err);
    }
  }

  public getActiveBroker(): ActiveBroker {
    // If explicitly set, return it. If not connected, we can still report the chosen broker.
    return this.activeBroker;
  }

  public setActiveBroker(broker: ActiveBroker) {
    this.activeBroker = broker;
    this.persistPreference();
    console.log(`[BrokerManager] Switched active broker to: ${broker}`);
  }

  /**
   * Called after all services have initialized (async auto-connect may have completed).
   * If the saved preference was FYERS but Fyers failed to auto-connect, falls back gracefully.
   * If no preference file existed and Fyers is connected, auto-selects FYERS.
   */
  public async initPostServices(): Promise<void> {
    // Give async auto-connect a moment to settle
    await new Promise(r => setTimeout(r, 3000));

    if (this.activeBroker === 'FYERS') {
      const fyersCfg = fyersService.getConfig();
      const hasValidToken = !!fyersCfg.accessToken && !fyersService.isAccessTokenExpired();
      if (!fyersCfg.isConnected && !hasValidToken) {
        // Fyers failed to auto-connect and has no valid token — fall back to DHAN or SIMULATOR
        const fallback: ActiveBroker = dhanService.getConfig().isConnected ? 'DHAN' : 'SIMULATOR';
        console.log(`[BrokerManager] Preference was FYERS but Fyers is not connected. Falling back to ${fallback}.`);
        this.activeBroker = fallback;
      } else {
        console.log('[BrokerManager] FYERS preference confirmed — Fyers session active.');
      }
    } else if (!this.preferenceFileExisted && (fyersService.getConfig().isConnected || (!fyersService.isAccessTokenExpired() && !!fyersService.getConfig().accessToken))) {
      // No saved preference, but Fyers has valid credentials — switch to FYERS automatically
      console.log('[BrokerManager] No saved preference found but Fyers credentials valid — auto-selecting FYERS.');
      this.setActiveBroker('FYERS');
    }
  }

  /**
   * Get the primary live broker that currently has an active connection
   */
  public getEffectiveLiveBroker(): 'DHAN' | 'FYERS' | 'SIMULATOR' {
    if (this.activeBroker === 'DHAN' && dhanService.getConfig().isConnected && dhanService.hasDataApi()) {
      return 'DHAN';
    }
    if (this.activeBroker === 'FYERS' && fyersService.getConfig().isConnected) {
      return 'FYERS';
    }
    // Auto-fallback to any connected broker with live data
    if (dhanService.getConfig().isConnected && dhanService.hasDataApi()) return 'DHAN';
    if (fyersService.getConfig().isConnected) return 'FYERS';

    return 'SIMULATOR';
  }

  /**
   * Fetch option chain using the active broker
   */
  public async fetchOptionChain(symbol: IndexSymbol, expiry?: string): Promise<FyersOptionChainResult | null> {
    const effective = this.getEffectiveLiveBroker();

    if (effective === 'DHAN') {
      const res = await dhanService.fetchOptionChain(symbol, expiry);
      if (res && res.strikes && res.strikes.length > 0) return res;
    }

    if (effective === 'FYERS' || fyersService.getConfig().isConnected) {
      const res = await fyersService.fetchOptionChain(symbol, expiry);
      if (res && res.strikes && res.strikes.length > 0) return res;
    }

    return null;
  }

  /**
   * Fetch batch spot quotes using the active broker
   */
  public async fetchBatchQuotes(symbols: IndexSymbol[]): Promise<Record<string, number>> {
    const effective = this.getEffectiveLiveBroker();

    if (effective === 'DHAN') {
      const quotes = await dhanService.fetchBatchQuotes(symbols);
      if (Object.keys(quotes).length > 0) return quotes;
    }

    return {};
  }
}

export const brokerManager = new BrokerManager();
