import fs from 'fs';
import path from 'path';
import { ActiveBroker, IndexSymbol } from '../types.js';
import { dhanService } from './dhanService.js';
import { fyersService, type FyersOptionChainResult } from './fyersService.js';

const BROKER_PREF_PATH = path.resolve(process.cwd(), 'server', 'brokerPreference.json');

export class BrokerManager {
  private activeBroker: ActiveBroker = 'DHAN';
  private preferenceFileExisted = false;

  constructor() {
    this.loadPreference();
  }

  private loadPreference() {
    try {
      if (fs.existsSync(BROKER_PREF_PATH)) {
        this.preferenceFileExisted = true;
        const raw = fs.readFileSync(BROKER_PREF_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.activeBroker) {
          this.activeBroker = parsed.activeBroker;
        }
      }
    } catch {
      // default to DHAN
    }
  }

  private persistPreference() {
    try {
      fs.writeFileSync(BROKER_PREF_PATH, JSON.stringify({ activeBroker: this.activeBroker }, null, 2), 'utf-8');
    } catch {
      // ignore
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
      // Preference says FYERS — check if fyers actually connected
      if (!fyersService.getConfig().isConnected) {
        // Fyers failed to auto-connect — fall back to DHAN or SIMULATOR
        const fallback: ActiveBroker = dhanService.getConfig().isConnected ? 'DHAN' : 'SIMULATOR';
        console.log(`[BrokerManager] Preference was FYERS but Fyers is not connected. Falling back to ${fallback}.`);
        this.activeBroker = fallback;
        // Don't persist this fallback — keep the FYERS preference for next boot
      } else {
        console.log('[BrokerManager] FYERS preference confirmed — Fyers is connected.');
      }
    } else if (!this.preferenceFileExisted && fyersService.getConfig().isConnected) {
      // No saved preference, but Fyers auto-connected from saved credentials
      // Switch to FYERS automatically
      console.log('[BrokerManager] No saved preference found but Fyers is connected — auto-selecting FYERS.');
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
