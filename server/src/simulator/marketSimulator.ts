import { IndexSymbol, SurgeLevel, OptionType } from '../types.js';
import { OIEngine } from '../engine/oiEngine.js';

interface SimulatedIndexConfig {
  symbol: IndexSymbol;
  baseSpot: number;
  strikeStep: number;
  numStrikesEachSide: number;
  lotSize: number;
  defaultRange: number;
}

const INDICES: SimulatedIndexConfig[] = [
  {
    symbol: 'NIFTY',
    baseSpot: 25042.30,
    strikeStep: 50,
    numStrikesEachSide: 12,
    lotSize: 75,
    defaultRange: 200
  },
  {
    symbol: 'BANKNIFTY',
    baseSpot: 54218.60,
    strikeStep: 100,
    numStrikesEachSide: 12,
    lotSize: 30,
    defaultRange: 500
  },
  {
    symbol: 'FINNIFTY',
    baseSpot: 23862.40,
    strikeStep: 50,
    numStrikesEachSide: 10,
    lotSize: 65,
    defaultRange: 250
  },
  {
    symbol: 'MIDCPNIFTY',
    baseSpot: 12455.80,
    strikeStep: 25,
    numStrikesEachSide: 10,
    lotSize: 120,
    defaultRange: 150
  }
];

interface LiveStrikeMemory {
  strike: number;
  callOI: number;
  callLtp: number;
  callVol: number;
  putOI: number;
  putLtp: number;
  putVol: number;
}

export class MarketSimulator {
  private engine: OIEngine;
  private onBroadcast: (data: any) => void;
  private intervalTimer: NodeJS.Timeout | null = null;
  private spots: Map<IndexSymbol, { spot: number; change: number; pctChange: number }> = new Map();
  private strikesMemory: Map<IndexSymbol, Map<number, LiveStrikeMemory>> = new Map();
  private isRunning: boolean = true;
  private tickCount: number = 0;
  private speedMultiplier: number = 1;

  constructor(engine: OIEngine, broadcastCallback: (data: any) => void) {
    this.engine = engine;
    this.onBroadcast = broadcastCallback;
    this.initSimulationData();
  }

  private initSimulationData() {
    for (const cfg of INDICES) {
      this.spots.set(cfg.symbol, {
        spot: cfg.baseSpot,
        change: +(Math.random() * 80 - 30).toFixed(2),
        pctChange: +((Math.random() * 0.7 - 0.2)).toFixed(2)
      });

      const strikeMap = new Map<number, LiveStrikeMemory>();
      const atm = Math.round(cfg.baseSpot / cfg.strikeStep) * cfg.strikeStep;

      for (let i = -cfg.numStrikesEachSide; i <= cfg.numStrikesEachSide; i++) {
        const strike = atm + i * cfg.strikeStep;
        const distFromAtm = strike - atm;
        
        // Synthetic realistic option pricing & OI distribution
        const intrinsicCall = Math.max(0, cfg.baseSpot - strike);
        const timeValueCall = Math.max(15, (cfg.numStrikesEachSide - Math.abs(i)) * (cfg.symbol === 'BANKNIFTY' ? 40 : 18));
        const callLtp = +(intrinsicCall + timeValueCall).toFixed(2);

        const intrinsicPut = Math.max(0, strike - cfg.baseSpot);
        const timeValuePut = Math.max(15, (cfg.numStrikesEachSide - Math.abs(i)) * (cfg.symbol === 'BANKNIFTY' ? 38 : 17));
        const putLtp = +(intrinsicPut + timeValuePut).toFixed(2);

        // Heavy OI near ATM and key round strikes
        const isRoundNumber = strike % (cfg.strikeStep * 5) === 0;
        const oiMultiplier = isRoundNumber ? 2.2 : (1.4 - Math.abs(i) * 0.08);

        const baseCallOI = Math.max(80000, Math.round((250000 + Math.random() * 450000) * oiMultiplier));
        const basePutOI = Math.max(80000, Math.round((240000 + Math.random() * 480000) * oiMultiplier));

        strikeMap.set(strike, {
          strike,
          callOI: baseCallOI,
          callLtp,
          callVol: Math.round(baseCallOI * 0.45),
          putOI: basePutOI,
          putLtp,
          putVol: Math.round(basePutOI * 0.48)
        });
      }

      this.strikesMemory.set(cfg.symbol, strikeMap);
    }
  }

  public start() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    // Initial run
    this.tick();
    this.intervalTimer = setInterval(() => {
      if (this.isRunning) {
        this.tick();
      }
    }, 2500 / this.speedMultiplier);
  }

  public setSpeed(multiplier: number) {
    this.speedMultiplier = multiplier;
    this.start();
  }

  public setRunning(running: boolean) {
    this.isRunning = running;
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      tickCount: this.tickCount
    };
  }

  // Allow manual injection of extreme surges for testing
  public injectSurge(
    symbol: IndexSymbol,
    strike: number,
    optionType: OptionType,
    oiDelta: number,
    priceDeltaPct: number
  ) {
    const strikeMap = this.strikesMemory.get(symbol);
    if (!strikeMap) return;

    let target = strikeMap.get(strike);
    if (!target) {
      // Find nearest strike
      const strikes = Array.from(strikeMap.keys());
      const closest = strikes.reduce((prev, curr) => Math.abs(curr - strike) < Math.abs(prev - strike) ? curr : prev);
      target = strikeMap.get(closest)!;
    }

    if (optionType === 'CE') {
      target.callOI = Math.max(10000, target.callOI + oiDelta);
      target.callLtp = +(target.callLtp * (1 + priceDeltaPct / 100)).toFixed(2);
      target.callVol += Math.abs(oiDelta);
    } else {
      target.putOI = Math.max(10000, target.putOI + oiDelta);
      target.putLtp = +(target.putLtp * (1 + priceDeltaPct / 100)).toFixed(2);
      target.putVol += Math.abs(oiDelta);
    }

    // Force instantaneous tick evaluation
    this.tickIndex(INDICES.find(i => i.symbol === symbol)!);
  }

  private tick() {
    this.tickCount++;
    for (const cfg of INDICES) {
      this.tickIndex(cfg);
    }
  }

  private tickIndex(cfg: SimulatedIndexConfig) {
    const spotInfo = this.spots.get(cfg.symbol)!;
    const strikeMap = this.strikesMemory.get(cfg.symbol)!;

    // Small drift in spot
    const drift = (Math.random() - 0.49) * (cfg.symbol === 'BANKNIFTY' ? 6 : 2.5);
    spotInfo.spot = +(spotInfo.spot + drift).toFixed(2);
    spotInfo.change = +(spotInfo.change + drift).toFixed(2);
    spotInfo.pctChange = +((spotInfo.change / cfg.baseSpot) * 100).toFixed(2);

    const atm = Math.round(spotInfo.spot / cfg.strikeStep) * cfg.strikeStep;
    const strikesRaw: any[] = [];

    // Decide if a dynamic organic surge event should occur on this tick (e.g. 1 in 4 ticks)
    const isSurgeTick = Math.random() < 0.28;
    const surgeTargetOffset = Math.floor((Math.random() - 0.5) * 6); // within ATM +-3 strikes
    const surgeStrike = atm + surgeTargetOffset * cfg.strikeStep;
    const surgeType: OptionType = Math.random() > 0.5 ? 'CE' : 'PE';
    const surgeSeverity = Math.random();

    for (const [strike, mem] of strikeMap.entries()) {
      let callDelta = Math.round((Math.random() - 0.48) * 15000);
      let putDelta = Math.round((Math.random() - 0.48) * 15000);

      let callLtpDelta = (Math.random() - 0.5) * 1.5;
      let putLtpDelta = (Math.random() - 0.5) * 1.5;

      // If this strike is targeted for an organic surge event
      if (isSurgeTick && strike === surgeStrike) {
        if (surgeType === 'CE') {
          if (surgeSeverity > 0.75) {
            // Extreme Call Writing
            callDelta = Math.round(280000 + Math.random() * 350000);
            callLtpDelta = -(mem.callLtp * (0.06 + Math.random() * 0.08));
          } else if (surgeSeverity > 0.45) {
            // Strong Call Long Buildup
            callDelta = Math.round(180000 + Math.random() * 150000);
            callLtpDelta = +(mem.callLtp * (0.08 + Math.random() * 0.12));
          } else {
            // Short Covering Surge
            callDelta = -Math.round(120000 + Math.random() * 100000);
            callLtpDelta = +(mem.callLtp * (0.12 + Math.random() * 0.15));
          }
        } else {
          if (surgeSeverity > 0.75) {
            // Extreme Put Buildup / Panic
            putDelta = Math.round(300000 + Math.random() * 380000);
            putLtpDelta = +(mem.putLtp * (0.09 + Math.random() * 0.14));
          } else if (surgeSeverity > 0.45) {
            // Strong Put Writing Support
            putDelta = Math.round(190000 + Math.random() * 160000);
            putLtpDelta = -(mem.putLtp * (0.05 + Math.random() * 0.08));
          } else {
            // Put Unwinding
            putDelta = -Math.round(110000 + Math.random() * 90000);
            putLtpDelta = -(mem.putLtp * (0.08 + Math.random() * 0.10));
          }
        }
      }

      // Update state
      mem.callOI = Math.max(10000, mem.callOI + callDelta);
      mem.callLtp = +(Math.max(1.0, mem.callLtp + callLtpDelta)).toFixed(2);
      mem.callVol += Math.abs(callDelta) + Math.round(Math.random() * 10000);

      mem.putOI = Math.max(10000, mem.putOI + putDelta);
      mem.putLtp = +(Math.max(1.0, mem.putLtp + putLtpDelta)).toFixed(2);
      mem.putVol += Math.abs(putDelta) + Math.round(Math.random() * 10000);

      strikesRaw.push({
        strikePrice: strike,
        callOI: mem.callOI,
        callLtp: mem.callLtp,
        callVolume: mem.callVol,
        putOI: mem.putOI,
        putLtp: mem.putLtp,
        putVolume: mem.putVol
      });
    }

    // Pass to OI Processing Engine
    const { indexState, newSurges } = this.engine.processSnapshot(
      cfg.symbol,
      spotInfo.spot,
      spotInfo.change,
      spotInfo.pctChange,
      strikesRaw,
      cfg.strikeStep,
      cfg.lotSize,
      cfg.defaultRange
    );

    // Broadcast live update
    this.onBroadcast({
      type: 'INDEX_UPDATE',
      symbol: cfg.symbol,
      indexState,
      newSurges,
      timestamp: new Date().toISOString()
    });
  }
}
