/**
 * Shared USD/INR rate singleton.
 *
 * All services that need the USD→INR conversion rate import this instead of
 * each maintaining their own stale 84.5 default that causes "+84.80" stale
 * delta flashes on the client after a server restart.
 *
 * Rate is fetched from Yahoo Finance (INR=X) on startup and refreshed every 5 minutes.
 * While the first fetch is in-flight, callers receive the last-good value (or 84.5 fallback).
 */

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d';
const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const FALLBACK_RATE = 94.5;            // current base rate before first fetch
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

class UsdInrService {
  private rate: number = FALLBACK_RATE;
  private lastFetchTs: number = 0;
  private isFetching: boolean = false;

  constructor() {
    // Fetch immediately on startup so all services get a live rate asap
    this.refresh();
    // Refresh every 5 minutes in the background
    setInterval(() => this.refresh(), CACHE_TTL_MS);
  }

  /** Returns the current best-known USD/INR rate (never blocks). */
  public get(): number {
    // Trigger a background refresh if cache is stale, but return immediately
    if (!this.isFetching && Date.now() - this.lastFetchTs > CACHE_TTL_MS) {
      this.refresh();
    }
    return this.rate;
  }

  /** Fetches the latest USD/INR rate from Yahoo Finance. */
  public async refresh(): Promise<number> {
    if (this.isFetching) return this.rate;
    this.isFetching = true;
    try {
      const res = await fetch(YAHOO_URL, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return this.rate;
      const json = await res.json() as any;
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number' && price > 50 && price < 200) {
        this.rate = price;
        this.lastFetchTs = Date.now();
        console.log(`[UsdInrService] ✅ USD/INR rate: ₹${price.toFixed(2)}`);
      }
    } catch (err: any) {
      console.warn('[UsdInrService] Fetch failed:', err.message, `— using ₹${this.rate.toFixed(2)}`);
    } finally {
      this.isFetching = false;
    }
    return this.rate;
  }
}

export const usdInrService = new UsdInrService();
