// ============================================================================
// Landing Page CMS Service — Configurable Content with LocalStorage Persistence
// Allows Super Admin to customize Hero Slides, Metrics, Features, and Contact Details
// ============================================================================

export interface HeroSlide {
  id: string;
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  titleSuffix: string;
  fontStyle: string; // e.g. 'font-sans', 'font-mono', 'tracking-tight'
  description: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  previewType: 'CONFLUENCE_CARD' | 'STRIKE_CHART' | 'OPTION_CHAIN' | 'MACRO_RADAR';
  tag: string;
  customImageUrl?: string; // base64 data URL or external picture URL
  customImageCaption?: string;
  useCustomImage?: boolean; // when true, display uploaded picture/video instead of interactive mockup
  mediaType?: 'image' | 'video'; // media type: image or mp4 video
  customVideoUrl?: string; // direct MP4 video URL or indexeddb reference
}

export interface FeatureItem {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  shortDescription: string;
  fullParagraph1: string;
  fullParagraph2: string;
  formulaOrArchitecture: string;
  optionBuyerBenefit: string;
  optionSellerBenefit: string;
  iconName: string;
  accentColor: string;
}

export interface ContactInfo {
  companyName: string;
  corporateOffice: string;
  supportEmail: string;
  researchEmail: string;
  phone: string;
  whatsappSupport: string;
  hours: string;
  sebiRegistrationNumber: string;
}

export interface LandingPerformanceStats {
  winRatePct: number;
  averageRiskReward: string;
  alphaVsNiftyPct: number;
  feedLatencySeconds: string;
  totalSetupsLogged: number;
}

export interface LandingCmsData {
  announcementText: string;
  heroSlides: HeroSlide[];
  performanceStats: LandingPerformanceStats;
  contactInfo: ContactInfo;
  features: FeatureItem[];
}

export const DEFAULT_LANDING_CMS_DATA: LandingCmsData = {
  announcementText: '⚡ SEBI-ALIGNED INSTITUTIONAL DERIVATIVES ENGINE • LIVE NSE & BSE STREAMING WITH DUAL-TIER WEBSOCKET • FREE 7-DAY TRIAL AVAILABLE',
  heroSlides: [
    {
      id: 'slide-1',
      badge: '10-FACTOR QUANTUM CONFLUENCE',
      titlePrefix: 'Trade Options with',
      titleHighlight: 'Institutional Precision',
      titleSuffix: '& Mathematical Edge',
      fontStyle: 'tracking-tight font-bold',
      description: 'Stop relying on delayed retail indicators and guesswork. Fayda PRO fuses real-time OI build-up, Greeks gamma, VWAP divergence, and price-action momentum into actionable intraday & swing trading setups with exact entry, stop-loss, and multi-tier targets.',
      primaryCtaText: 'Start 7-Day Free Trial',
      secondaryCtaText: 'Explore Live Terminal Demo',
      previewType: 'CONFLUENCE_CARD',
      tag: 'Confluence Engine v2.0'
    },
    {
      id: 'slide-2',
      badge: 'INLINE STRIKE WORKBENCH & ORDER FLOW',
      titlePrefix: 'Institutional Candlestick &',
      titleHighlight: 'Strike Price Depth',
      titleSuffix: 'In Real-Time',
      fontStyle: 'tracking-tight font-bold',
      description: 'Analyze pure option strike price charts with dedicated 1m, 3m, 5m, and 15m candlesticks, overlaid with Implied Volatility (IV), real-time Delta, Theta decay velocity, and institutional bid/ask order book volume clusters.',
      primaryCtaText: 'Inspect Live Strike Charts',
      secondaryCtaText: 'View Options Setup',
      previewType: 'STRIKE_CHART',
      tag: 'Alpha Flow Workbench'
    },
    {
      id: 'slide-3',
      badge: 'HIGH-DENSITY LIVE OPTIONS MATRIX',
      titlePrefix: 'High-Density',
      titleHighlight: 'Option Chain Heatmap',
      titleSuffix: '& Greeks Radar',
      fontStyle: 'tracking-tight font-bold',
      description: 'Monitor ATM ± 10 strikes simultaneously with visual OI heatmap indicators for Long Build-up, Short Covering, and Unwinding. Real-time PCR tracking across near and far weekly expiry cycles.',
      primaryCtaText: 'View Live Options Chain',
      secondaryCtaText: 'Learn Greeks Modeling',
      previewType: 'OPTION_CHAIN',
      tag: 'Greeks Heatmap Matrix'
    },
    {
      id: 'slide-4',
      badge: 'GLOBAL MACRO RISK-ON/OFF RADAR',
      titlePrefix: 'Synchronize Intraday F&O with',
      titleHighlight: 'GIFT Nifty & FII Liquidity',
      titleSuffix: 'Real-Time',
      fontStyle: 'tracking-tight font-bold',
      description: 'Track Brent Crude, USD/INR, US 10Y Yields, Dollar Index (DXY), and institutional cash flow (FII/DII net purchases) to accurately forecast trend continuation and avoid retail false breakouts.',
      primaryCtaText: 'Explore Global Macro Radar',
      secondaryCtaText: 'View Pre-Market CPR',
      previewType: 'MACRO_RADAR',
      tag: 'Macro Risk Compass'
    }
  ],
  performanceStats: {
    winRatePct: 78.4,
    averageRiskReward: '1 : 2.4',
    alphaVsNiftyPct: 34.8,
    feedLatencySeconds: '< 2.0s',
    totalSetupsLogged: 110
  },
  contactInfo: {
    companyName: 'Fayda Quantum Capital Technologies Private Limited',
    corporateOffice: 'Level 14, Tower 2, One World Center, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013',
    supportEmail: 'support@fayda.in',
    researchEmail: 'research@fayda.in',
    phone: '+91 (022) 6982-4400',
    whatsappSupport: '+91 98200 44100',
    hours: 'Mon - Fri: 8:30 AM to 11:30 PM IST (Covers Equity, F&O and MCX Commodities Session)',
    sebiRegistrationNumber: 'SEBI Research Analyst Reg. No. INH000008892'
  },
  features: [
    {
      id: 'feat-confluence',
      title: '10-Factor Quantum Confluence Signal Cockpit',
      badge: 'CORE ENGINE',
      tagline: 'Fusing 10 independent quantitative layers for verified statistical edge',
      shortDescription: 'Generates high-conviction Option Buying (CE/PE Momentum) and Option Selling (Credit Spreads & Strangles) trade setups with calibrated Entry, Stop-Loss, and Target prices.',
      fullParagraph1: 'The 10-Factor Confluence Cockpit eliminates emotional retail bias by integrating 10 discrete analytical models: Open Interest concentration surges, Gamma squeeze velocity, Volume Weighted Average Price (VWAP) deviations, multi-period EMA ribbons, Central Pivot Range (CPR) geometry, Supertrend confirmation, and institutional order book imbalances.',
      fullParagraph2: 'Each trade recommendation carries a dynamic Confluence Score (0–100) and risk-to-reward ratio of at least 1:2.0. The system continuously recalculates validity in real-time, instantly notifying the trader when stop-loss or profit milestones are reached.',
      formulaOrArchitecture: 'Score = Σ (w_i * Factor_i) where w_OI = 25%, w_Gamma = 20%, w_VWAP = 15%, w_PriceAction = 15%, w_Macro = 10%, w_CPR = 15%',
      optionBuyerBenefit: 'Pinpoints exact explosive momentum candles right as theta decay resistance breaks, maximizing quick 20–50% option premium surges.',
      optionSellerBenefit: 'Identifies high-probability rangebound boundaries and low-delta strikes with decaying theta to capture consistent premium theta decay.',
      iconName: 'Zap',
      accentColor: 'emerald'
    },
    {
      id: 'feat-strike-chart',
      title: 'Institutional Strike Candlestick & Greeks Workbench',
      badge: 'ANALYTICS ALPHA',
      tagline: 'Deep candlestick charting on individual strikes with embedded Greeks overlay',
      shortDescription: 'Dedicated candlestick charts for active In-The-Money, At-The-Money, and Out-The-Money option strikes with live volume profiles, IV percentiles, and order book depth.',
      fullParagraph1: 'Unlike standard broker platforms that only chart index underlying spots, Fayda PRO provides full candlestick charts of the actual call and put contracts you are trading. This allows option traders to draw trendlines, identify flag patterns, and spot support/resistance directly on the strike premium.',
      fullParagraph2: 'Overlaid directly onto the strike candlestick chart are real-time Greek metrics: Black-Scholes Delta, Gamma, Theta decay per minute, Vega sensitivity, and instantaneous Implied Volatility (IV) percentile to spot option overpricing and underpricing.',
      formulaOrArchitecture: 'Custom Black-76 / Black-Scholes model calibrated at 2.0s intervals using annualized 365-day trading clock and RBI MIBOR risk-free rates.',
      optionBuyerBenefit: 'Allows technical entry confirmation on strike candles directly, avoiding fake spot breakouts that fail to move option premiums.',
      optionSellerBenefit: 'Monitors instantaneous IV spikes and IV crush after market events to enter credit spreads when options are most overpriced.',
      iconName: 'BarChart2',
      accentColor: 'sky'
    },
    {
      id: 'feat-option-chain',
      title: 'High-Density Options Chain & Greeks Heatmap',
      badge: 'MARKET MATRIX',
      tagline: 'Live visual heatmap tracking smart-money accumulation across 20+ strikes',
      shortDescription: 'Visual color-coded heatmap of Open Interest build-up, volume shifts, Put-Call Ratio (PCR), and contract unwinding across all active weekly and monthly series.',
      fullParagraph1: 'The High-Density Options Chain transforms rows of confusing numbers into an intuitive visual heatmap. Strikes undergoing aggressive Long Build-up, Short Build-up, Short Covering, and Long Unwinding are instantly illuminated with distinct colors, showing where institutional option writers are taking positions.',
      fullParagraph2: 'Includes live Put-Call Ratio (PCR) tracking across the immediate ATM ± 5 strikes and the broader chain, providing instant sentiment cues (Bullish > 1.05, Bearish < 0.90, Neutral 0.90–1.05) to anticipate potential market pivot turns.',
      formulaOrArchitecture: 'OI Velocity Matrix: ΔOI_t / Δt vs Volume Ratio, classified into 4 quadrants (Long Buildup, Short Buildup, Short Covering, Long Unwinding).',
      optionBuyerBenefit: 'Quickly identifies strikes with accelerating call or put volume before premiums spike.',
      optionSellerBenefit: 'Reveals major institutional open interest walls (Call resistance & Put support) to sell safe OTM options behind major barriers.',
      iconName: 'Layers',
      accentColor: 'amber'
    },
    {
      id: 'feat-macro-radar',
      title: 'Global Macro Risk & GIFT Nifty Geopolitical Radar',
      badge: 'GLOBAL CONTEXT',
      tagline: 'Multi-market context ribbon synchronizing domestic setups with global forces',
      shortDescription: 'Real-time monitoring of GIFT Nifty, Brent Crude, USD/INR, US 10-Year Bond Yields, Dollar Index (DXY), and daily FII/DII institutional cash flow balance.',
      fullParagraph1: 'Indian equities do not operate in isolation. The Global Macro Context Banner provides continuous situational awareness by tracking intermarket correlations: rising crude oil pressure on Bank Nifty, USD/INR depreciation impact on IT stocks, and US bond yields affecting foreign institutional flows.',
      fullParagraph2: 'Categorizes the broader market into three clear regimes: Macro Risk-On (Expansionary & supportive of index rallies), Macro Risk-Off (Contractionary & vulnerable to sharp intraday sell-offs), or Converging/Mixed (Rangebound conditions favored by option sellers).',
      formulaOrArchitecture: 'Intermarket Composite Index (ICI) evaluating 7 global vectors with weighted beta factors against Nifty 50 and Bank Nifty.',
      optionBuyerBenefit: 'Prevents taking aggressive long calls when global macro conditions are heavily risk-off, saving capital on low-probability trades.',
      optionSellerBenefit: 'Helps determine whether to deploy directional credit spreads or neutral non-directional iron condors based on macro volatility expectations.',
      iconName: 'Globe',
      accentColor: 'purple'
    },
    {
      id: 'feat-cpr-pivot',
      title: 'Intraday CPR & Virgin Floor Pivot Range Engine',
      badge: 'TECHNICAL GEOMETRY',
      tagline: 'Floor trader pivot calculations with virgin CPR magnet detection',
      shortDescription: 'Calculates Central Pivot Range (Pivot, TC, BC) and tracks un-tested (virgin) CPR levels that act as high-probability price magnets for index re-tests.',
      fullParagraph1: 'The Central Pivot Range (CPR) is the preferred technical tool of institutional floor traders. A narrow CPR indicates an impending explosive breakout day, while a wide CPR indicates a sideways, mean-reverting session where breakout trades usually fail.',
      fullParagraph2: 'Our engine automatically detects and tracks historical "Virgin CPRs" (past CPR ranges that were never touched during their session). These virgin levels act as powerful magnet zones when price approaches them in subsequent sessions.',
      formulaOrArchitecture: 'Pivot = (H + L + C) / 3; Bottom Central (BC) = (H + L) / 2; Top Central (TC) = (Pivot - BC) + Pivot; Virgin Filter = min(Distance(T_curr, CPR_prev)) > 0.',
      optionBuyerBenefit: 'Enables high-confidence entries on narrow CPR breakout days when trending directional momentum is strongest.',
      optionSellerBenefit: 'Provides precise boundary levels on wide CPR days to sell strangle options with minimal risk of strike breaches.',
      iconName: 'Activity',
      accentColor: 'rose'
    },
    {
      id: 'feat-broker-desk',
      title: 'Multi-Broker 1-Click Execution & Paper Simulator Desk',
      badge: 'INSTANT EXECUTION',
      tagline: 'Seamless integration with Fyers API v3, DhanHQ Live, and risk-free simulation',
      shortDescription: 'Execute verified trades with zero delay through official Fyers and Dhan APIs, or test strategies in real-time with our zero-risk Paper Trading Simulator.',
      fullParagraph1: 'Connect your personal trading account in under 30 seconds via secure OAuth. Fayda PRO transmits orders directly to exchange servers via certified low-latency broker endpoints, allowing 1-click execution of single strikes and complex multi-leg option spreads.',
      fullParagraph2: 'For beginners and strategy testers, the platform features a fully autonomous Real-Time Paper Trading Simulator that mimics live market fills, slippage, and brokerage charges without risking real capital.',
      formulaOrArchitecture: 'Certified REST + WebSocket bridge adhering to SEBI 2FA protocols and OAuth 2.0 PKCE broker security standards.',
      optionBuyerBenefit: '1-click order routing ensures you get filled immediately without having to manually search for strike codes on your broker app.',
      optionSellerBenefit: 'Multi-leg spread execution handles both buy hedge and sell margin legs simultaneously, preventing unhedged margin spikes.',
      iconName: 'ShieldCheck',
      accentColor: 'indigo'
    }
  ]
};

const STORAGE_KEY = 'fayda_landing_cms_v2';

export function getLandingCmsData(): LandingCmsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LANDING_CMS_DATA;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LANDING_CMS_DATA,
      ...parsed,
      contactInfo: { ...DEFAULT_LANDING_CMS_DATA.contactInfo, ...parsed.contactInfo },
      performanceStats: { ...DEFAULT_LANDING_CMS_DATA.performanceStats, ...parsed.performanceStats }
    };
  } catch {
    return DEFAULT_LANDING_CMS_DATA;
  }
}

export function saveLandingCmsData(data: LandingCmsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('fayda-cms-updated', { detail: data }));
  } catch (err) {
    console.error('Failed to save CMS data to localStorage:', err);
  }
}

export function resetLandingCmsData(): LandingCmsData {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('fayda-cms-updated', { detail: DEFAULT_LANDING_CMS_DATA }));
  } catch {}
  return DEFAULT_LANDING_CMS_DATA;
}

/**
 * Compresses an uploaded image file into a base64 JPEG data URL
 * to avoid exceeding browser localStorage limits.
 */
export function compressImageFile(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// IndexedDB Media Storage for MP4 Video Blobs
// ============================================================================
const IDB_NAME = 'fayda_landing_media_db_v1';
const IDB_STORE = 'videos';

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Stores a local video File/Blob in IndexedDB to avoid localStorage size limits.
 */
export async function storeVideoInIndexedDB(key: string, file: Blob): Promise<string> {
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(file, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return URL.createObjectURL(file);
  } catch (err) {
    console.error('Failed to store video in IndexedDB:', err);
    // Fallback to in-memory object URL
    return URL.createObjectURL(file);
  }
}

/**
 * Retrieves a stored video Blob from IndexedDB and returns a revocable Object URL.
 */
export async function getVideoFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result instanceof Blob) {
          resolve(URL.createObjectURL(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a stored video from IndexedDB.
 */
export async function removeVideoFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

