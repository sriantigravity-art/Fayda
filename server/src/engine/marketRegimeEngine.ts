import { IndexSymbol } from '../types.js';
import { CPRLevelData } from './cprEngine.js';

export type ChartStructureType = 'TRENDING_DAY' | 'SIDEWAYS_DAY' | 'REVERSAL_DAY';

export interface InitialBalanceData {
  ibh: number;            // Initial Balance High (09:15 - 10:15 IST)
  ibl: number;            // Initial Balance Low (09:15 - 10:15 IST)
  rangePts: number;       // IBH - IBL
  isFormed: boolean;      // True after 10:15 IST
  status: 'INSIDE_IB' | 'BREAKOUT_ABOVE_IBH' | 'BREAKDOWN_BELOW_IBL';
}

export interface IntradayMarketRegimeData {
  symbol: IndexSymbol;
  structureType: ChartStructureType;
  structureLabel: string;
  participantType: 'INITIATIVE_BUYERS' | 'INITIATIVE_SELLERS' | 'RESPONSIVE_BUYERS_SELLERS' | 'TRAPPED_PARTICIPANTS';
  description: string;
  initialBalance: InitialBalanceData;
  favorableStrategyTypes: ('TRENDING' | 'SIDEWAYS' | 'REVERSAL')[];
  keyActionAdvice: string;
}

export class MarketRegimeEngine {
  /**
   * Evaluates the 3 types of Intraday Chart Structures (Fayda Market Regime Engine)
   * Type 1: Trending Day (Initiative participants dominating)
   * Type 2: Sideways Day (Responsive auction between IBH and IBL)
   * Type 3: Reversal / Trapping Day (Initial false breakout violently rejecting back)
   */
  public static evaluateRegime(
    symbol: IndexSymbol,
    spotPrice: number,
    cpr: CPRLevelData,
    openPrice?: number,
    dayHigh?: number,
    dayLow?: number
  ): IntradayMarketRegimeData {
    const open = openPrice && openPrice > 0 ? openPrice : spotPrice;
    const high = dayHigh && dayHigh > 0 ? dayHigh : spotPrice + (cpr.pdh - cpr.pdl) * 0.4;
    const low = dayLow && dayLow > 0 ? dayLow : spotPrice - (cpr.pdh - cpr.pdl) * 0.4;

    // Initial Balance tracking (first hour range estimation or live)
    const ibh = high;
    const ibl = low;
    const ibRange = Math.abs(ibh - ibl);

    let ibStatus: 'INSIDE_IB' | 'BREAKOUT_ABOVE_IBH' | 'BREAKDOWN_BELOW_IBL' = 'INSIDE_IB';
    if (spotPrice >= ibh - (ibRange * 0.05)) {
      ibStatus = 'BREAKOUT_ABOVE_IBH';
    } else if (spotPrice <= ibl + (ibRange * 0.05)) {
      ibStatus = 'BREAKDOWN_BELOW_IBL';
    }

    // Determine Market Structure
    let structureType: ChartStructureType = 'SIDEWAYS_DAY';
    let structureLabel = 'Type 2: Sideways Day';
    let participantType: 'INITIATIVE_BUYERS' | 'INITIATIVE_SELLERS' | 'RESPONSIVE_BUYERS_SELLERS' | 'TRAPPED_PARTICIPANTS' = 'RESPONSIVE_BUYERS_SELLERS';
    let description = 'Price auctioning back and forth within initial balance range. Responsive buyers and sellers active.';
    let favorableStrategyTypes: ('TRENDING' | 'SIDEWAYS' | 'REVERSAL')[] = ['SIDEWAYS'];
    let keyActionAdvice = 'Trade mean reversion from CPR / Key levels. Avoid aggressive breakout chasing.';

    // Logic for Type 1 (Trending Day):
    // Price opened near Day Low & is at Day High (or opened near Day High & at Day Low) + Narrow CPR
    const isBullishTrend = spotPrice > cpr.topCPR && spotPrice >= high * 0.995 && (cpr.cprWidthCategory === 'NARROW_CPR' || spotPrice > cpr.pdh);
    const isBearishTrend = spotPrice < cpr.bottomCPR && spotPrice <= low * 1.005 && (cpr.cprWidthCategory === 'NARROW_CPR' || spotPrice < cpr.pdl);

    // Logic for Type 3 (Reversal / Trapping Day):
    // Wide CPR + False breakout beyond PDH/PDL with immediate retreat back into CPR
    const isReversalDay = cpr.cprWidthCategory === 'WIDE_CPR' && (
      (high > cpr.pdh && spotPrice < cpr.pdh) ||
      (low < cpr.pdl && spotPrice > cpr.pdl)
    );

    if (isReversalDay) {
      structureType = 'REVERSAL_DAY';
      structureLabel = 'Type 3: Reversal / Trapping Day';
      participantType = 'TRAPPED_PARTICIPANTS';
      description = 'Initial move attempted to break PDH/PDL but failed at Wide CPR/Resistance. Trapped traders triggering sharp reversal.';
      favorableStrategyTypes = ['REVERSAL', 'SIDEWAYS'];
      keyActionAdvice = 'Look for failure rejections at Day High/Low, ODR, and Fake Breakout setups back towards CPR.';
    } else if (isBullishTrend) {
      structureType = 'TRENDING_DAY';
      structureLabel = 'Type 1: Bullish Trending Day';
      participantType = 'INITIATIVE_BUYERS';
      description = 'Initiative buyers dominating. Price pushing consistently above CPR & PDH with ascending volume.';
      favorableStrategyTypes = ['TRENDING'];
      keyActionAdvice = 'Ride the trend with 20 EMA pullbacks & Day High Breakout setups. Do NOT short against strong initiative flow.';
    } else if (isBearishTrend) {
      structureType = 'TRENDING_DAY';
      structureLabel = 'Type 1: Bearish Trending Day';
      participantType = 'INITIATIVE_SELLERS';
      description = 'Initiative sellers in total control. Price breaking below CPR & PDL with downward momentum.';
      favorableStrategyTypes = ['TRENDING'];
      keyActionAdvice = 'Follow the trend on 20 EMA pullbacks & Day Low breakdown. Do NOT catch falling knives.';
    }

    return {
      symbol,
      structureType,
      structureLabel,
      participantType,
      description,
      initialBalance: {
        ibh: Math.round(ibh * 10) / 10,
        ibl: Math.round(ibl * 10) / 10,
        rangePts: Math.round(ibRange * 10) / 10,
        isFormed: true,
        status: ibStatus
      },
      favorableStrategyTypes,
      keyActionAdvice
    };
  }
}
