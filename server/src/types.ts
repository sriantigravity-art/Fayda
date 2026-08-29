export type IndexSymbol = string;

export interface SymbolConfig {
  symbol: string;
  name: string;
  category: 'INDICES' | 'COMMODITIES' | 'NIFTY50_STOCKS';
  step: number;
  lot: number;
  defaultRange: number;
  fyersSymbol: string;
  isIndex: boolean;
  segment?: 'EQUITY' | 'COMMODITY';
  exchange?: 'NSE' | 'BSE' | 'MCX';
}

export const ALL_SYMBOLS_CONFIG: SymbolConfig[] = [
  // Major Indices (NSE & BSE)
  { symbol: 'NIFTY', name: 'Nifty 50 Index', category: 'INDICES', step: 50, lot: 75, defaultRange: 200, fyersSymbol: 'NSE:NIFTY50-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', category: 'INDICES', step: 100, lot: 30, defaultRange: 500, fyersSymbol: 'NSE:NIFTYBANK-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE Sensex Index', category: 'INDICES', step: 100, lot: 20, defaultRange: 500, fyersSymbol: 'BSE:SENSEX-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'BSE' },
  { symbol: 'BANKEX', name: 'BSE Bankex Index', category: 'INDICES', step: 100, lot: 30, defaultRange: 500, fyersSymbol: 'BSE:BANKEX-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'BSE' },
  { symbol: 'FINNIFTY', name: 'Financial Services', category: 'INDICES', step: 50, lot: 65, defaultRange: 250, fyersSymbol: 'NSE:FINNIFTY-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'NSE' },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select', category: 'INDICES', step: 25, lot: 120, defaultRange: 150, fyersSymbol: 'NSE:MIDCPNIFTY-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'NSE' },
  { symbol: 'NIFTYNXT50', name: 'Nifty Next 50', category: 'INDICES', step: 100, lot: 25, defaultRange: 400, fyersSymbol: 'NSE:NIFTYNXT50-INDEX', isIndex: true, segment: 'EQUITY', exchange: 'NSE' },

  // MCX Commodities (Live Option Chains & Futures)
  { symbol: 'CRUDEOIL', name: 'Crude Oil (MCX)', category: 'COMMODITIES', step: 50, lot: 100, defaultRange: 400, fyersSymbol: 'MCX:CRUDEOIL26SEPFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },
  { symbol: 'NATURALGAS', name: 'Natural Gas (MCX)', category: 'COMMODITIES', step: 5, lot: 1250, defaultRange: 30, fyersSymbol: 'MCX:NATURALGAS26SEPFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },
  { symbol: 'GOLD', name: 'Gold (MCX)', category: 'COMMODITIES', step: 200, lot: 100, defaultRange: 1500, fyersSymbol: 'MCX:GOLD26OCTFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },
  { symbol: 'SILVER', name: 'Silver (MCX)', category: 'COMMODITIES', step: 500, lot: 30, defaultRange: 3000, fyersSymbol: 'MCX:SILVER26DECFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },
  { symbol: 'COPPER', name: 'Copper (MCX)', category: 'COMMODITIES', step: 5, lot: 2500, defaultRange: 50, fyersSymbol: 'MCX:COPPER26SEPFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },
  { symbol: 'ZINC', name: 'Zinc (MCX)', category: 'COMMODITIES', step: 2.5, lot: 5000, defaultRange: 20, fyersSymbol: 'MCX:ZINC26SEPFUT', isIndex: false, segment: 'COMMODITY', exchange: 'MCX' },

  // Top Nifty 50 F&O Stocks
  { symbol: 'RELIANCE', name: 'Reliance Industries', category: 'NIFTY50_STOCKS', step: 10, lot: 250, defaultRange: 60, fyersSymbol: 'NSE:RELIANCE-EQ', isIndex: false },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', category: 'NIFTY50_STOCKS', step: 10, lot: 550, defaultRange: 80, fyersSymbol: 'NSE:HDFCBANK-EQ', isIndex: false },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', category: 'NIFTY50_STOCKS', step: 10, lot: 700, defaultRange: 60, fyersSymbol: 'NSE:ICICIBANK-EQ', isIndex: false },
  { symbol: 'INFY', name: 'Infosys Ltd', category: 'NIFTY50_STOCKS', step: 10, lot: 400, defaultRange: 80, fyersSymbol: 'NSE:INFY-EQ', isIndex: false },
  { symbol: 'TCS', name: 'Tata Consultancy Services', category: 'NIFTY50_STOCKS', step: 20, lot: 175, defaultRange: 150, fyersSymbol: 'NSE:TCS-EQ', isIndex: false },
  { symbol: 'ITC', name: 'ITC Limited', category: 'NIFTY50_STOCKS', step: 5, lot: 1600, defaultRange: 30, fyersSymbol: 'NSE:ITC-EQ', isIndex: false },
  { symbol: 'SBIN', name: 'State Bank of India', category: 'NIFTY50_STOCKS', step: 5, lot: 750, defaultRange: 40, fyersSymbol: 'NSE:SBIN-EQ', isIndex: false },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', category: 'NIFTY50_STOCKS', step: 10, lot: 475, defaultRange: 80, fyersSymbol: 'NSE:BHARTIARTL-EQ', isIndex: false },
  { symbol: 'LT', name: 'Larsen & Toubro', category: 'NIFTY50_STOCKS', step: 20, lot: 175, defaultRange: 150, fyersSymbol: 'NSE:LT-EQ', isIndex: false },
  { symbol: 'AXISBANK', name: 'Axis Bank', category: 'NIFTY50_STOCKS', step: 10, lot: 625, defaultRange: 60, fyersSymbol: 'NSE:AXISBANK-EQ', isIndex: false },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', category: 'NIFTY50_STOCKS', step: 10, lot: 400, defaultRange: 80, fyersSymbol: 'NSE:KOTAKBANK-EQ', isIndex: false },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', category: 'NIFTY50_STOCKS', step: 10, lot: 550, defaultRange: 60, fyersSymbol: 'NSE:TATAMOTORS-EQ', isIndex: false },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India', category: 'NIFTY50_STOCKS', step: 100, lot: 50, defaultRange: 500, fyersSymbol: 'NSE:MARUTI-EQ', isIndex: false },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', category: 'NIFTY50_STOCKS', step: 50, lot: 125, defaultRange: 300, fyersSymbol: 'NSE:BAJFINANCE-EQ', isIndex: false },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', category: 'NIFTY50_STOCKS', step: 10, lot: 350, defaultRange: 80, fyersSymbol: 'NSE:SUNPHARMA-EQ', isIndex: false },
  { symbol: 'TITAN', name: 'Titan Company', category: 'NIFTY50_STOCKS', step: 20, lot: 175, defaultRange: 150, fyersSymbol: 'NSE:TITAN-EQ', isIndex: false },
  { symbol: 'TATASTEEL', name: 'Tata Steel', category: 'NIFTY50_STOCKS', step: 2.5, lot: 5500, defaultRange: 15, fyersSymbol: 'NSE:TATASTEEL-EQ', isIndex: false },
  { symbol: 'HCLTECH', name: 'HCL Technologies', category: 'NIFTY50_STOCKS', step: 10, lot: 350, defaultRange: 80, fyersSymbol: 'NSE:HCLTECH-EQ', isIndex: false },
  { symbol: 'NTPC', name: 'NTPC Limited', category: 'NIFTY50_STOCKS', step: 2.5, lot: 1500, defaultRange: 20, fyersSymbol: 'NSE:NTPC-EQ', isIndex: false },
  { symbol: 'ONGC', name: 'ONGC', category: 'NIFTY50_STOCKS', step: 2.5, lot: 2250, defaultRange: 20, fyersSymbol: 'NSE:ONGC-EQ', isIndex: false },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', category: 'NIFTY50_STOCKS', step: 20, lot: 300, defaultRange: 150, fyersSymbol: 'NSE:ADANIENT-EQ', isIndex: false },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', category: 'NIFTY50_STOCKS', step: 10, lot: 400, defaultRange: 80, fyersSymbol: 'NSE:ADANIPORTS-EQ', isIndex: false },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', category: 'NIFTY50_STOCKS', step: 2.5, lot: 1800, defaultRange: 20, fyersSymbol: 'NSE:POWERGRID-EQ', isIndex: false },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', category: 'NIFTY50_STOCKS', step: 20, lot: 350, defaultRange: 120, fyersSymbol: 'NSE:M&M-EQ', isIndex: false },
  { symbol: 'WIPRO', name: 'Wipro Limited', category: 'NIFTY50_STOCKS', step: 5, lot: 1500, defaultRange: 30, fyersSymbol: 'NSE:WIPRO-EQ', isIndex: false },
  { symbol: 'COALINDIA', name: 'Coal India', category: 'NIFTY50_STOCKS', step: 2.5, lot: 2100, defaultRange: 25, fyersSymbol: 'NSE:COALINDIA-EQ', isIndex: false },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', category: 'NIFTY50_STOCKS', step: 20, lot: 200, defaultRange: 150, fyersSymbol: 'NSE:ASIANPAINT-EQ', isIndex: false },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', category: 'NIFTY50_STOCKS', step: 20, lot: 500, defaultRange: 100, fyersSymbol: 'NSE:BAJAJFINSV-EQ', isIndex: false },
  { symbol: 'NESTLEIND', name: 'Nestle India', category: 'NIFTY50_STOCKS', step: 20, lot: 250, defaultRange: 120, fyersSymbol: 'NSE:NESTLEIND-EQ', isIndex: false },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', category: 'NIFTY50_STOCKS', step: 10, lot: 675, defaultRange: 50, fyersSymbol: 'NSE:JSWSTEEL-EQ', isIndex: false },
  { symbol: 'GRASIM', name: 'Grasim Industries', category: 'NIFTY50_STOCKS', step: 20, lot: 275, defaultRange: 120, fyersSymbol: 'NSE:GRASIM-EQ', isIndex: false },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', category: 'NIFTY50_STOCKS', step: 50, lot: 100, defaultRange: 400, fyersSymbol: 'NSE:ULTRACEMCO-EQ', isIndex: false },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', category: 'NIFTY50_STOCKS', step: 50, lot: 150, defaultRange: 250, fyersSymbol: 'NSE:HEROMOTOCO-EQ', isIndex: false },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', category: 'NIFTY50_STOCKS', step: 10, lot: 500, defaultRange: 80, fyersSymbol: 'NSE:INDUSINDBK-EQ', isIndex: false },
  { symbol: 'TECHM', name: 'Tech Mahindra', category: 'NIFTY50_STOCKS', step: 10, lot: 600, defaultRange: 80, fyersSymbol: 'NSE:TECHM-EQ', isIndex: false },
  { symbol: 'HINDALCO', name: 'Hindalco Industries', category: 'NIFTY50_STOCKS', step: 5, lot: 1400, defaultRange: 40, fyersSymbol: 'NSE:HINDALCO-EQ', isIndex: false },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', category: 'NIFTY50_STOCKS', step: 20, lot: 300, defaultRange: 120, fyersSymbol: 'NSE:HINDUNILVR-EQ', isIndex: false },
  { symbol: 'DRREDDY', name: "Dr Reddy's Laboratories", category: 'NIFTY50_STOCKS', step: 20, lot: 125, defaultRange: 200, fyersSymbol: 'NSE:DRREDDY-EQ', isIndex: false },
  { symbol: 'CIPLA', name: 'Cipla Limited', category: 'NIFTY50_STOCKS', step: 10, lot: 650, defaultRange: 80, fyersSymbol: 'NSE:CIPLA-EQ', isIndex: false },
  { symbol: 'EICHERMOT', name: 'Eicher Motors', category: 'NIFTY50_STOCKS', step: 50, lot: 175, defaultRange: 250, fyersSymbol: 'NSE:EICHERMOT-EQ', isIndex: false },
  { symbol: 'BPCL', name: 'Bharat Petroleum (BPCL)', category: 'NIFTY50_STOCKS', step: 5, lot: 1800, defaultRange: 30, fyersSymbol: 'NSE:BPCL-EQ', isIndex: false },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories", category: 'NIFTY50_STOCKS', step: 50, lot: 100, defaultRange: 300, fyersSymbol: 'NSE:DIVISLAB-EQ', isIndex: false },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', category: 'NIFTY50_STOCKS', step: 50, lot: 125, defaultRange: 350, fyersSymbol: 'NSE:APOLLOHOSP-EQ', isIndex: false },
  { symbol: 'BRITANNIA', name: 'Britannia Industries', category: 'NIFTY50_STOCKS', step: 50, lot: 125, defaultRange: 300, fyersSymbol: 'NSE:BRITANNIA-EQ', isIndex: false },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance', category: 'NIFTY50_STOCKS', step: 20, lot: 300, defaultRange: 150, fyersSymbol: 'NSE:SHRIRAMFIN-EQ', isIndex: false },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products', category: 'NIFTY50_STOCKS', step: 10, lot: 900, defaultRange: 60, fyersSymbol: 'NSE:TATACONSUM-EQ', isIndex: false },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance', category: 'NIFTY50_STOCKS', step: 10, lot: 750, defaultRange: 80, fyersSymbol: 'NSE:SBILIFE-EQ', isIndex: false },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', category: 'NIFTY50_STOCKS', step: 5, lot: 1100, defaultRange: 40, fyersSymbol: 'NSE:HDFCLIFE-EQ', isIndex: false },
  { symbol: 'TRENT', name: 'Trent Limited', category: 'NIFTY50_STOCKS', step: 50, lot: 100, defaultRange: 400, fyersSymbol: 'NSE:TRENT-EQ', isIndex: false },
  { symbol: 'BEL', name: 'Bharat Electronics', category: 'NIFTY50_STOCKS', step: 2.5, lot: 2700, defaultRange: 20, fyersSymbol: 'NSE:BEL-EQ', isIndex: false }
];

export type OptionType = 'CE' | 'PE';

export type DataSourceMode = 'FYERS_LIVE' | 'NSE_LIVE';

export type BuildupType = 
  | 'LONG_BUILDUP' 
  | 'SHORT_BUILDUP' 
  | 'SHORT_COVERING' 
  | 'LONG_UNWINDING';

export type SurgeLevel = 'NORMAL' | 'MODERATE' | 'STRONG' | 'EXTREME';

export type TradeAction = 
  | 'BUY_CALL' 
  | 'SELL_CALL' 
  | 'BUY_PUT' 
  | 'SELL_PUT' 
  | 'NEUTRAL_WATCH';

export type ThetaIntensity = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';

export type IvStatus = 'CHEAP' | 'FAIR' | 'EXPENSIVE_CRUSH_RISK';
export type LiquidityRating = 'HIGH_LIQUIDITY' | 'MODERATE' | 'LOW_SLIPPAGE_RISK';

export type NewsSource = 'MONEYCONTROL' | 'CNBC_TV18' | 'BLOOMBERG' | 'REUTERS' | 'NSE_INDIA' | 'GLOBAL_MACRO';
export type NewsImpact = 'HIGH_IMPACT' | 'MODERATE' | 'GLOBAL_CUE';
export type NewsSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: NewsSource;
  impact: NewsImpact;
  sentiment: NewsSentiment;
  category: 'INDIAN_INDICES' | 'RBI_POLICY' | 'FII_DII' | 'TRUMP_TARIFFS' | 'CRUDE_MACRO' | 'EARNINGS';
  timestamp: string;
  timeFormatted: string;
  indianMarketImpact: string;
  url?: string;
}

export interface OptionStrikeData {
  strikePrice: number;
  callOI: number;
  callOIChange1m: number;
  callOIChangeTotal: number;
  callLtp: number;
  callLtpChange: number;
  callLtpPctChange: number;
  callVolume: number;
  callBuyVolume: number;
  callSellVolume: number;
  callBuyVolPct: number;
  callBuildup: BuildupType;
  callSurgeScore: number;
  callSurgeLevel: SurgeLevel;
  callTheta: number;
  callThetaPerHour: number;
  callIv: number;
  callIvStatus: IvStatus;
  callLiquidity: LiquidityRating;
  callBidAskSpreadPct: number;
  
  putOI: number;
  putOIChange1m: number;
  putOIChangeTotal: number;
  putLtp: number;
  putLtpChange: number;
  putLtpPctChange: number;
  putVolume: number;
  putBuyVolume: number;
  putSellVolume: number;
  putBuyVolPct: number;
  putBuildup: BuildupType;
  putSurgeScore: number;
  putSurgeLevel: SurgeLevel;
  putTheta: number;
  putThetaPerHour: number;
  putIv: number;
  putIvStatus: IvStatus;
  putLiquidity: LiquidityRating;
  putBidAskSpreadPct: number;
  
  iv: number;
  thetaIntensity: ThetaIntensity;
  pcrStrike: number;
  isAtm: boolean;
  distanceFromAtm: number;
}

export interface SurgeEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  indexSymbol: IndexSymbol;
  strikePrice: number;
  optionType: OptionType;
  expiryDate: string;
  surgeLevel: SurgeLevel;
  surgeScore: number;
  
  oiChange1m: number;
  oiChange1mFormatted: string;
  oiChangePct: number;
  currentOI: number;
  currentOIFormatted: string;
  
  ltp: number;
  ltpChange: number;
  ltpPctChange: number;
  volume: number;
  
  buildup: BuildupType;
  tradeAction: TradeAction;
  actionTitle: string;
  actionDescription: string;

  // IV & Liquidity Quality Verification
  iv: number;
  ivStatus: IvStatus;
  ivDescription: string;
  liquidityRating: LiquidityRating;
  spreadFormatted: string;
  volumeFormatted: string;
  
  suggestedContract: {
    symbol: string;
    strike: number;
    type: OptionType;
    expiryDate: string;
    ltp: number;
    recommendedEntry: string;
    stoploss: string;
    target: string;
    riskReward: string;
    ivNote: string;
    liquidityNote: string;
  };
  
  confidence: 'HIGH' | 'MEDIUM' | 'EXTREME';
  validUntilMinutes?: number;
  expiresAt?: string;
}

export interface PcrData {
  overallPcr: number;
  atmPlusMinus5Pcr: number;
  atmPlusMinus10Pcr: number;
  pcr1mChange: number;
  pcr5mChange: number;
  totalCallOI: number;
  totalPutOI: number;
  totalCallOIChange1m: number;
  totalPutOIChange1m: number;
  totalCallVolume: number;
  totalPutVolume: number;
  totalCallBuyVolume: number;
  totalCallSellVolume: number;
  totalPutBuyVolume: number;
  totalPutSellVolume: number;
  sentiment: 'EXTREMELY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREMELY_BEARISH';
}

export interface KeyLevel {
  levelName: string;
  strikePrice: number;
  oi: number;
  oiFormatted: string;
  oiChange: number;
  oiChangeFormatted: string;
  distanceFromAtm: number;
  strength: 'MAJOR' | 'INTERMEDIATE' | 'MINOR';
}

export interface MaxPainData {
  strikePrice: number;
  totalLossCrores: number;
  differenceFromSpot: number;
  expiryDate: string;
}

export interface StraddleRangeData {
  atmStrike: number;
  atmCallLtp: number;
  atmPutLtp: number;
  combinedPremium: number;
  upperBreakeven: number;
  lowerBreakeven: number;
  expectedMovePct: number;
  expiryDate: string;
  atmTotalThetaDaily: number;
  atmTotalThetaHourly: number;
}

export interface FyersConfig {
  appId: string;
  secretKey?: string;
  accessToken: string;
  isConnected: boolean;
  userName?: string;
  lastConnected?: string;
}

export interface HeroZeroSignal {
  id: string;
  symbol: IndexSymbol;
  contractSymbol: string;
  strike: number;
  optionType: 'CE' | 'PE';
  ltp: number;
  entryZone: string;
  stoploss: number;
  stoplossPct: number;
  target1x: number;
  target3x: number;
  target5x: number;
  gamma: number;
  gammaScore: number;
  volume: number;
  volumeVelocity: number;
  oiChange1m: number;
  oiChangePct: number;
  isShortSqueeze: boolean;
  squeezeType: 'SHORT_COVERING_CE' | 'SHORT_COVERING_PE' | 'LONG_ACCUMULATION' | 'GAMMA_EXPLOSION';
  requiredSpotMovePts: number;
  riskReward: string;
  conviction: 'EXTREME' | 'HIGH' | 'SPECULATIVE';
  rationale: string;
  validUntilMinutes?: number;
  expiresAt?: string;
}

export type TimeframeKey = '1m' | '3m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M' | '6M';

export type ChartPatternType = 
  | 'TRIPLE_TOP'
  | 'TRIPLE_BOTTOM'
  | 'DOUBLE_TOP'
  | 'DOUBLE_BOTTOM'
  | 'HEAD_AND_SHOULDERS'
  | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'ASCENDING_TRIANGLE'
  | 'DESCENDING_TRIANGLE'
  | 'RANGE_SQUEEZE';

export interface MultiTimeframeLevel {
  timeframe: TimeframeKey;
  levelType: 'PDH' | 'PDL' | 'PDC' | 'PWH' | 'PWL' | 'PMH' | 'PML' | 'H6M' | 'L6M' | 'CPR_PIVOT' | 'CPR_TC' | 'CPR_BC' | 'FIB_618' | 'FIB_500' | 'FIB_382' | 'SUPPLY_BLOCK' | 'DEMAND_BLOCK';
  price: number;
  label: string;
  significance: 'MAJOR' | 'INTERMEDIATE' | 'MINOR';
  distancePts: number;
  distancePct: number;
  isResistance: boolean;
}

export interface PatternBreakoutAnalysis {
  symbol: IndexSymbol;
  activeTimeframe: TimeframeKey;
  activePattern: {
    patternType: ChartPatternType;
    patternName: string;
    timeframe: TimeframeKey;
    confidence: number; // 0 - 100%
    status: 'FORMING' | 'TESTING_NECKLINE' | 'CONFIRMED_BREAKOUT' | 'FAILED_TRAP';
    necklinePrice: number;
    firstPeakOrTrough: number;
    secondPeakOrTrough: number;
    thirdPeakOrTrough?: number;
    description: string;
    reversalOrContinuity: 'BULLISH_REVERSAL' | 'BEARISH_REVERSAL' | 'BULLISH_CONTINUATION' | 'BEARISH_CONTINUATION' | 'RANGE_EXPANSION';
  };
  predictedBreakout: {
    direction: 'UPWARD_BREAKOUT' | 'DOWNWARD_BREAKDOWN' | 'RANGEBOUND';
    probability: number; // 0 - 100%
    triggerPrice: number;
    target1: number;
    target2: number;
    stoploss: number;
    riskReward: string;
    expectedMovePts: number;
    timeHorizon: string;
  };
  oiConfirmation: {
    isConfirmedByOI: boolean;
    callDelta1m: number;
    putDelta1m: number;
    callWritingPressure: 'HEAVY' | 'MODERATE' | 'UNWINDING';
    putSupportPressure: 'HEAVY' | 'MODERATE' | 'UNWINDING';
    verdict: string;
    trapRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  mtfLevels: MultiTimeframeLevel[];
  confluenceSummary: string;
}

export interface StrategyScoreItem {
  strategyName: string;
  iconName: 'OI' | 'BREAKOUT' | 'VOLUME' | 'GAMMA' | 'PCR' | 'MAXPAIN' | 'IV_THETA';
  score: number; // 0-100
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  weightPct: number;
  statusBadge: string;
  details: string;
}

export interface MasterStrategyConfluence {
  overallScore: number; // 0-100%
  overallSignal: 'STRONG_BUY_CALL' | 'BUY_CALL' | 'NEUTRAL_WAIT' | 'BUY_PUT' | 'STRONG_BUY_PUT';
  signalTitle: string;
  convictionLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'NEUTRAL';
  recommendedStrike: string;
  action: 'BUY CALL' | 'BUY PUT' | 'WAIT';
  entryZone: string;
  target1: number;
  target2: number;
  stoploss: number;
  riskReward: string;
  strategies: StrategyScoreItem[];
  confluenceRationale: string;
}

export interface MarketIndexState {
  symbol: IndexSymbol;
  spotPrice: number;
  change: number;
  pctChange: number;
  atmStrike: number;
  strikeStep: number;
  lotSize: number;
  lastUpdated: string;
  expiryDates: string[];
  selectedExpiry: string;
  daysToExpiry: number;
  dataSource: DataSourceMode;
  pcr: PcrData;
  strikes: OptionStrikeData[];
  defaultRange: number;
  resistanceLevels: KeyLevel[];
  supportLevels: KeyLevel[];
  maxPain: MaxPainData;
  straddleRange: StraddleRangeData;
  recommendedTrades: {
    bullishPick: SurgeEvent | null;
    bearishPick: SurgeEvent | null;
    highestScoreEvent: SurgeEvent | null;
  };
  heroZeroSignals?: HeroZeroSignal[];
  patternBreakout?: PatternBreakoutAnalysis;
  masterConfluence?: MasterStrategyConfluence;
  indiaVix?: number;  // India VIX live value — NSE volatility index
}

export interface GlobalIndexItem {
  id: string;
  name: string;
  country: string;
  flag: string;
  region: 'US' | 'ASIA' | 'EUROPE' | 'COMMODITIES' | 'CURRENCY' | 'YIELDS';
  price: number;
  change: number;
  pctChange: number;
  status: 'OPEN' | 'CLOSED';
  lastUpdated: string;
  impactOnIndia: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  notes?: string;
}

export interface WebSocketMessage {
  type: 'INITIAL_STATE' | 'INDEX_UPDATE' | 'NEW_SURGE' | 'BULK_SURGES' | 'DATA_SOURCE_UPDATE' | 'FYERS_STATUS' | 'FLASH_NEWS' | 'GLOBAL_INDICES_UPDATE';
  data?: any;
  symbol?: IndexSymbol;
  indexState?: MarketIndexState;
  newSurges?: SurgeEvent[];
  newsItem?: NewsItem;
  recentNews?: NewsItem[];
  globalIndices?: GlobalIndexItem[];
  dataSource?: DataSourceMode;
  fyersConfig?: FyersConfig;
  isMarketOpen: boolean;
  timestamp: string;
}
