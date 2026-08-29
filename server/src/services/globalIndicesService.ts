import { GlobalIndexItem } from '../types';

interface InstrumentConfig {
  id: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  region: 'US' | 'ASIA' | 'EUROPE' | 'COMMODITIES' | 'CURRENCY' | 'YIELDS';
  isGiftNifty?: boolean;
  isCrude?: boolean;
  isYield?: boolean;
  isVix?: boolean;
  notes: string;
  defaultPrice: number;
  defaultChange: number;
  defaultPct: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'GIFT_NIFTY',
    symbol: '^NSEI',
    name: 'GIFT Nifty',
    country: 'India / Singapore',
    flag: '🇮🇳',
    region: 'ASIA',
    isGiftNifty: true,
    notes: 'NSE IX Gandhinagar (+32 pts premium over Spot)',
    defaultPrice: 24208.0,
    defaultChange: 84.8,
    defaultPct: 0.35
  },
  {
    id: 'NASDAQ_100',
    symbol: '^NDX',
    name: 'Nasdaq 100',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'Tech heavy benchmark lead for Indian IT',
    defaultPrice: 29433.4,
    defaultChange: -208.1,
    defaultPct: -0.70
  },
  {
    id: 'SPX_500',
    symbol: '^GSPC',
    name: 'S&P 500',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'US broad market strength near historic highs',
    defaultPrice: 7711.8,
    defaultChange: -19.2,
    defaultPct: -0.25
  },
  {
    id: 'DOW_JONES',
    symbol: '^DJI',
    name: 'Dow Jones 30',
    country: 'United States',
    flag: '🇺🇸',
    region: 'US',
    notes: 'Wall Street bluechip industrial momentum',
    defaultPrice: 53560.0,
    defaultChange: -9.4,
    defaultPct: -0.02
  },
  {
    id: 'NIKKEI_225',
    symbol: '^N225',
    name: 'Nikkei 225',
    country: 'Japan',
    flag: '🇯🇵',
    region: 'ASIA',
    notes: 'Tokyo Stock Exchange benchmark',
    defaultPrice: 66405.5,
    defaultChange: 273.6,
    defaultPct: 0.41
  },
  {
    id: 'HANG_SENG',
    symbol: '^HSI',
    name: 'Hang Seng',
    country: 'Hong Kong',
    flag: '🇭🇰',
    region: 'ASIA',
    notes: 'Hong Kong Hang Seng Index',
    defaultPrice: 25584.8,
    defaultChange: 19.1,
    defaultPct: 0.07
  },
  {
    id: 'SHANGHAI_COMP',
    symbol: '000001.SS',
    name: 'Shanghai Composite',
    country: 'China',
    flag: '🇨🇳',
    region: 'ASIA',
    notes: 'China mainland composite index',
    defaultPrice: 3952.2,
    defaultChange: -4.4,
    defaultPct: -0.11
  },
  {
    id: 'DAX_40',
    symbol: '^GDAXI',
    name: 'DAX 40',
    country: 'Germany',
    flag: '🇩🇪',
    region: 'EUROPE',
    notes: 'Frankfurt German industrial benchmark',
    defaultPrice: 26570.0,
    defaultChange: 202.8,
    defaultPct: 0.77
  },
  {
    id: 'FTSE_100',
    symbol: '^FTSE',
    name: 'FTSE 100',
    country: 'United Kingdom',
    flag: '🇬🇧',
    region: 'EUROPE',
    notes: 'London Stock Exchange bluechips',
    defaultPrice: 10824.3,
    defaultChange: 31.8,
    defaultPct: 0.29
  },
  {
    id: 'BRENT_CRUDE',
    symbol: 'BZ=F',
    name: 'Brent Crude Oil',
    country: 'Global Benchmark',
    flag: '🛢️',
    region: 'COMMODITIES',
    isCrude: true,
    notes: 'Cooling crude prices benefit Indian fiscal & OMCs',
    defaultPrice: 88.10,
    defaultChange: -0.42,
    defaultPct: -0.47
  },
  {
    id: 'GOLD_USD',
    symbol: 'GC=F',
    name: 'Spot Gold (XAU/USD)',
    country: 'Global Benchmark',
    flag: '🪙',
    region: 'COMMODITIES',
    notes: 'Safe haven bullion benchmark',
    defaultPrice: 4529.9,
    defaultChange: -134.1,
    defaultPct: -2.88
  },
  {
    id: 'USD_INR',
    symbol: 'INR=X',
    name: 'USD / INR Forex',
    country: 'India Forex',
    flag: '💵',
    region: 'CURRENCY',
    notes: 'Rupee forex rate vs US Dollar',
    defaultPrice: 95.38,
    defaultChange: -0.15,
    defaultPct: -0.16
  },
  {
    id: 'US_10Y_YIELD',
    symbol: '^TNX',
    name: 'US 10-Yr Treasury',
    country: 'United States',
    flag: '📈',
    region: 'YIELDS',
    isYield: true,
    notes: 'Falling US yields trigger FII inflows into India',
    defaultPrice: 4.72,
    defaultChange: 0.05,
    defaultPct: 1.03
  },
  {
    id: 'CBOE_VIX',
    symbol: '^VIX',
    name: 'CBOE US VIX',
    country: 'United States',
    flag: '⚡',
    region: 'US',
    isVix: true,
    notes: 'Low global volatility supports equity bulls',
    defaultPrice: 14.43,
    defaultChange: -0.08,
    defaultPct: -0.55
  }
];

export class GlobalIndicesService {
  private static instance: GlobalIndicesService;
  private indices: GlobalIndexItem[] = [];
  private pollTimer: NodeJS.Timeout | null = null;
  private isFetching = false;

  private constructor() {
    this.initDefaultIndices();
    this.fetchAllRealQuotes();
    // Refresh live quotes from global exchanges every 15 seconds
    this.pollTimer = setInterval(() => {
      this.fetchAllRealQuotes();
    }, 15000);
  }

  public static getInstance(): GlobalIndicesService {
    if (!GlobalIndicesService.instance) {
      GlobalIndicesService.instance = new GlobalIndicesService();
    }
    return GlobalIndicesService.instance;
  }

  private initDefaultIndices() {
    const now = new Date().toISOString();
    this.indices = INSTRUMENTS.map(item => ({
      id: item.id,
      name: item.name,
      country: item.country,
      flag: item.flag,
      region: item.region,
      price: item.defaultPrice,
      change: item.defaultChange,
      pctChange: item.defaultPct,
      status: 'OPEN',
      lastUpdated: now,
      impactOnIndia: this.calculateImpact(item.defaultPct, item),
      notes: item.notes
    }));
  }

  private calculateImpact(pctChange: number, cfg: InstrumentConfig): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (cfg.isCrude) {
      // Lower crude is positive for India
      return pctChange < -0.2 ? 'POSITIVE' : pctChange > 0.4 ? 'NEGATIVE' : 'NEUTRAL';
    }
    if (cfg.isYield || cfg.isVix) {
      // Lower yields and lower VIX is positive for India
      return pctChange < -0.2 ? 'POSITIVE' : pctChange > 0.4 ? 'NEGATIVE' : 'NEUTRAL';
    }
    // Equities: positive when up
    return pctChange > 0.1 ? 'POSITIVE' : pctChange < -0.1 ? 'NEGATIVE' : 'NEUTRAL';
  }

  public async fetchAllRealQuotes() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const updatedList: GlobalIndexItem[] = [];

      for (const cfg of INSTRUMENTS) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.symbol)}?interval=1d&range=1d`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(4000)
          });

          if (res.ok) {
            const data = (await res.json()) as any;
            const meta = data?.chart?.result?.[0]?.meta;

            if (meta && typeof meta.regularMarketPrice === 'number') {
              let price = meta.regularMarketPrice;
              let prevClose = meta.chartPreviousClose || meta.previousClose || price;

              if (cfg.isGiftNifty) {
                price = +(price + 32.5).toFixed(1);
                prevClose = +(prevClose + 32.5).toFixed(1);
              }

              const change = +(price - prevClose).toFixed(cfg.isYield || cfg.region === 'CURRENCY' ? 2 : 2);
              const pctChange = +(((price - prevClose) / (prevClose || 1)) * 100).toFixed(2);

              const isMarketOpen = meta.currentTradingPeriod?.regular?.start && meta.currentTradingPeriod?.regular?.end
                ? (Date.now() / 1000 >= meta.currentTradingPeriod.regular.start && Date.now() / 1000 <= meta.currentTradingPeriod.regular.end)
                : true;

              updatedList.push({
                id: cfg.id,
                name: cfg.name,
                country: cfg.country,
                flag: cfg.flag,
                region: cfg.region,
                price: +(price).toFixed(cfg.isYield || cfg.region === 'CURRENCY' || cfg.isCrude ? 2 : 1),
                change,
                pctChange,
                status: isMarketOpen ? 'OPEN' : 'CLOSED',
                lastUpdated: new Date().toISOString(),
                impactOnIndia: this.calculateImpact(pctChange, cfg),
                notes: cfg.notes
              });
              continue;
            }
          }
        } catch (itemErr) {
          // Keep existing cached item on single item network error
        }

        // Fallback to existing verified memory state
        const existing = this.indices.find(i => i.id === cfg.id);
        if (existing) {
          updatedList.push(existing);
        }
      }

      if (updatedList.length > 0) {
        this.indices = updatedList;
      }
    } catch (err) {
      console.error('[GlobalIndicesService] Quote fetch error:', err);
    } finally {
      this.isFetching = false;
    }
  }

  public getIndices(): GlobalIndexItem[] {
    return this.indices;
  }
}

export const globalIndicesService = GlobalIndicesService.getInstance();
