import { GlobalMarketContextData, GlobalRiskMode, GlobalPremarketSetup } from '../types.js';
import { globalIndicesService } from './globalIndicesService.js';
import { usdInrService } from './usdInrService.js';

export class GlobalMarketFeedService {
  private currentContext: GlobalMarketContextData;
  private listeners: ((context: GlobalMarketContextData) => void)[] = [];
  private refreshInterval?: NodeJS.Timeout;

  constructor() {
    this.currentContext = this.buildContextFromLiveIndices();
    this.startLiveMonitoring();
  }

  public getGlobalContext(): GlobalMarketContextData {
    return this.buildContextFromLiveIndices();
  }

  public onUpdate(callback: (context: GlobalMarketContextData) => void) {
    this.listeners.push(callback);
  }

  public buildContextFromLiveIndices(): GlobalMarketContextData {
    const now = new Date().toISOString();
    const indices = globalIndicesService.getIndices();

    const findInd = (id: string, defVal: number, defPct: number) => {
      const item = indices.find(i => i.id === id);
      if (item && item.price > 0) {
        return { value: item.price, changePct: item.pctChange };
      }
      return { value: defVal, changePct: defPct };
    };

    // Live USD/INR from usdInrService
    const liveUsdInr = usdInrService.get();

    const giftNifty = findInd('GIFT_NIFTY', 23920.00, 0.15);
    const sp500 = findInd('SPX_500', 5880.50, 0.45);
    const nasdaq = findInd('NASDAQ_100', 18540.20, 0.65);
    const nikkei = findInd('NIKKEI_225', 38720.00, 0.85);
    const hangSeng = findInd('HANG_SENG', 19680.10, -0.35);
    const ftse = findInd('FTSE_100', 8240.20, 0.25);
    const dax = findInd('DAX_40', 18650.00, 0.35);
    const brentCrude = findInd('BRENT_CRUDE', 72.85, -1.25);
    const gold = findInd('GOLD', 2685.40, 0.15);
    const dxy = findInd('DXY_DOLLAR', 104.20, -0.18);
    const us10y = findInd('US_10Y_YIELD', 4.18, -0.45);

    const indicators = {
      sp500,
      nasdaq,
      nikkei,
      hangSeng,
      ftse,
      dax,
      giftNifty,
      brentCrude,
      gold,
      dxy,
      us10y,
      usdInr: { value: liveUsdInr > 0 ? liveUsdInr : 94.96, changePct: 0.05 },
      fiiNetBuyCr: 1240,
      diiNetBuyCr: 1850
    };

    const riskMode: GlobalRiskMode = this.computeGlobalRiskMode(indicators);
    const premarketSetup: GlobalPremarketSetup = this.computePremarketSetup(indicators, riskMode);

    // Dynamic Summary & Drivers based on actual live numbers
    const drivers: string[] = [];
    if (brentCrude.changePct < 0) {
      drivers.push(`Softening Brent Crude ($${brentCrude.value.toFixed(2)}/bbl, ${brentCrude.changePct.toFixed(2)}%) contracting India import bill`);
    } else {
      drivers.push(`Firming Brent Crude ($${brentCrude.value.toFixed(2)}/bbl, +${brentCrude.changePct.toFixed(2)}%) exerting cost pressure`);
    }

    if (us10y.changePct <= 0) {
      drivers.push(`US 10Y yields easing to ${us10y.value.toFixed(2)}% expanding emerging market carry flows`);
    } else {
      drivers.push(`US 10Y yields elevated at ${us10y.value.toFixed(2)}% tightening global liquidity`);
    }

    if (giftNifty.changePct >= 0) {
      drivers.push(`GIFT Nifty positive (+${giftNifty.changePct.toFixed(2)}% at ₹${giftNifty.value.toFixed(0)}) signaling steady domestic opening`);
    } else {
      drivers.push(`GIFT Nifty subdued (${giftNifty.changePct.toFixed(2)}% at ₹${giftNifty.value.toFixed(0)}) indicating cautious sentiment`);
    }

    if (dxy.changePct < 0) {
      drivers.push(`US Dollar Index easing (${dxy.value.toFixed(2)}) supporting INR stability`);
    } else {
      drivers.push(`Dollar Index firm (${dxy.value.toFixed(2)}) keeping pressure on emerging currencies`);
    }

    const summary = premarketSetup === 'SUPPORTIVE'
      ? `Global market setup is broadly supportive for Indian equities with ${brentCrude.changePct < 0 ? 'softening crude' : 'steady crude'}, GIFT Nifty at ₹${giftNifty.value.toFixed(0)} (${giftNifty.changePct >= 0 ? '+' : ''}${giftNifty.changePct.toFixed(2)}%), and stable US macro cues.`
      : premarketSetup === 'RISK_OFF'
      ? `Global market setup reflects risk-off pressure with elevated bond yields, cautious global indices, and GIFT Nifty at ₹${giftNifty.value.toFixed(0)} (${giftNifty.changePct.toFixed(2)}%).`
      : `Global market setup is mixed with divergence across global asset classes, GIFT Nifty at ₹${giftNifty.value.toFixed(0)} (${giftNifty.changePct >= 0 ? '+' : ''}${giftNifty.changePct.toFixed(2)}%), and crude at $${brentCrude.value.toFixed(2)}.`;

    this.currentContext = {
      timestamp: now,
      globalRiskMode: riskMode,
      premarketSetup,
      summary,
      primaryDrivers: drivers,
      indicators
    };

    return this.currentContext;
  }

  private computeGlobalRiskMode(ind: GlobalMarketContextData['indicators']): GlobalRiskMode {
    let riskScore = 0;

    // Global Equities
    if (ind.giftNifty.changePct > 0) riskScore += 2;
    else if (ind.giftNifty.changePct < -0.3) riskScore -= 2;

    if (ind.sp500.changePct > 0) riskScore += 1;
    else if (ind.sp500.changePct < -0.4) riskScore -= 1;

    if (ind.nasdaq.changePct > 0) riskScore += 1;
    else if (ind.nasdaq.changePct < -0.4) riskScore -= 1;

    if (ind.nikkei.changePct > 0) riskScore += 1;
    else if (ind.nikkei.changePct < -0.4) riskScore -= 1;

    // DXY & US10Y falling = Risk On for Emerging Markets
    if (ind.dxy.changePct < 0) riskScore += 1;
    else if (ind.dxy.changePct > 0.3) riskScore -= 1;

    if (ind.us10y.changePct < 0) riskScore += 1;
    else if (ind.us10y.changePct > 0.5) riskScore -= 1;

    // Crude falling = Risk On for India
    if (ind.brentCrude.changePct < 0) riskScore += 1;
    else if (ind.brentCrude.changePct > 1.0) riskScore -= 1;

    if (riskScore >= 3) return 'RISK_ON';
    if (riskScore >= 0) return 'NEUTRAL';
    if (riskScore >= -3) return 'RISK_OFF';
    return 'EXTREME_RISK_OFF';
  }

  private computePremarketSetup(
    ind: GlobalMarketContextData['indicators'],
    riskMode: GlobalRiskMode
  ): GlobalPremarketSetup {
    if (ind.giftNifty.changePct < -0.4 || riskMode === 'EXTREME_RISK_OFF') {
      return 'RISK_OFF';
    }
    if (riskMode === 'RISK_ON' && ind.giftNifty.changePct >= 0) {
      return 'SUPPORTIVE';
    }
    if (riskMode === 'RISK_OFF') {
      return 'RISK_OFF';
    }
    return 'MIXED';
  }

  private startLiveMonitoring() {
    this.refreshInterval = setInterval(() => {
      this.buildContextFromLiveIndices();

      // Notify listeners
      for (const listener of this.listeners) {
        listener(this.currentContext);
      }
    }, 15000);
  }

  public destroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}

export const globalMarketFeedService = new GlobalMarketFeedService();

