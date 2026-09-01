"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketSimulator = void 0;
const INDICES = [
    {
        symbol: 'NIFTY',
        baseSpot: 25042.30,
        strikeStep: 50,
        numStrikesEachSide: 12,
        lotSize: 65,
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
class MarketSimulator {
    engine;
    onBroadcast;
    intervalTimer = null;
    spots = new Map();
    strikesMemory = new Map();
    isRunning = true;
    tickCount = 0;
    speedMultiplier = 1;
    constructor(engine, broadcastCallback) {
        this.engine = engine;
        this.onBroadcast = broadcastCallback;
        this.initSimulationData();
    }
    initSimulationData() {
        for (const cfg of INDICES) {
            this.spots.set(cfg.symbol, {
                spot: cfg.baseSpot,
                change: +(Math.random() * 80 - 30).toFixed(2),
                pctChange: +((Math.random() * 0.7 - 0.2)).toFixed(2)
            });
            const strikeMap = new Map();
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
    start() {
        if (this.intervalTimer)
            clearInterval(this.intervalTimer);
        // Initial run
        this.tick();
        this.intervalTimer = setInterval(() => {
            if (this.isRunning) {
                this.tick();
            }
        }, 2500 / this.speedMultiplier);
    }
    setSpeed(multiplier) {
        this.speedMultiplier = multiplier;
        this.start();
    }
    setRunning(running) {
        this.isRunning = running;
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            speedMultiplier: this.speedMultiplier,
            tickCount: this.tickCount
        };
    }
    // Allow manual injection of extreme surges for testing
    injectSurge(symbol, strike, optionType, oiDelta, priceDeltaPct) {
        const strikeMap = this.strikesMemory.get(symbol);
        if (!strikeMap)
            return;
        let target = strikeMap.get(strike);
        if (!target) {
            // Find nearest strike
            const strikes = Array.from(strikeMap.keys());
            const closest = strikes.reduce((prev, curr) => Math.abs(curr - strike) < Math.abs(prev - strike) ? curr : prev);
            target = strikeMap.get(closest);
        }
        if (optionType === 'CE') {
            target.callOI = Math.max(10000, target.callOI + oiDelta);
            target.callLtp = +(target.callLtp * (1 + priceDeltaPct / 100)).toFixed(2);
            target.callVol += Math.abs(oiDelta);
        }
        else {
            target.putOI = Math.max(10000, target.putOI + oiDelta);
            target.putLtp = +(target.putLtp * (1 + priceDeltaPct / 100)).toFixed(2);
            target.putVol += Math.abs(oiDelta);
        }
        // Force instantaneous tick evaluation
        this.tickIndex(INDICES.find(i => i.symbol === symbol));
    }
    tick() {
        this.tickCount++;
        for (const cfg of INDICES) {
            this.tickIndex(cfg);
        }
    }
    marketRegimes = new Map();
    getOrUpdateRegime(symbol) {
        if (!this.marketRegimes.has(symbol) || Math.random() < 0.03) {
            const spotInfo = this.spots.get(symbol);
            const pct = spotInfo?.pctChange || 0;
            if (pct > 0.15) {
                this.marketRegimes.set(symbol, 'BULLISH');
            }
            else if (pct < -0.15) {
                this.marketRegimes.set(symbol, 'BEARISH');
            }
            else {
                const roll = Math.random();
                this.marketRegimes.set(symbol, roll > 0.6 ? 'BULLISH' : roll > 0.3 ? 'BEARISH' : 'CHOPPY');
            }
        }
        return this.marketRegimes.get(symbol);
    }
    tickIndex(cfg) {
        const spotInfo = this.spots.get(cfg.symbol);
        const strikeMap = this.strikesMemory.get(cfg.symbol);
        const regime = this.getOrUpdateRegime(cfg.symbol);
        // Directional drift guided by regime
        const baseDrift = (regime === 'BULLISH' ? 0.6 : regime === 'BEARISH' ? -0.6 : 0);
        const noise = (Math.random() - 0.49) * (cfg.symbol === 'BANKNIFTY' ? 5 : 2);
        const drift = baseDrift + noise;
        spotInfo.spot = +(spotInfo.spot + drift).toFixed(2);
        spotInfo.change = +(spotInfo.change + drift).toFixed(2);
        spotInfo.pctChange = +((spotInfo.change / cfg.baseSpot) * 100).toFixed(2);
        const atm = Math.round(spotInfo.spot / cfg.strikeStep) * cfg.strikeStep;
        const strikesRaw = [];
        // Organic institutional surge event frequency & directional bias based on market regime
        const isSurgeTick = Math.random() < 0.28;
        const surgeTargetOffset = Math.floor((Math.random() - 0.5) * 6); // within ATM +-3 strikes
        const surgeStrike = atm + surgeTargetOffset * cfg.strikeStep;
        // Directional distribution: Bullish regime = 80% Calls, Bearish regime = 80% Puts
        let surgeType = 'CE';
        if (regime === 'BULLISH') {
            surgeType = Math.random() < 0.80 ? 'CE' : 'PE';
        }
        else if (regime === 'BEARISH') {
            surgeType = Math.random() < 0.80 ? 'PE' : 'CE';
        }
        else {
            surgeType = Math.random() < 0.50 ? 'CE' : 'PE';
        }
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
                    }
                    else if (surgeSeverity > 0.45) {
                        // Strong Call Long Buildup
                        callDelta = Math.round(180000 + Math.random() * 150000);
                        callLtpDelta = +(mem.callLtp * (0.08 + Math.random() * 0.12));
                    }
                    else {
                        // Short Covering Surge
                        callDelta = -Math.round(120000 + Math.random() * 100000);
                        callLtpDelta = +(mem.callLtp * (0.12 + Math.random() * 0.15));
                    }
                }
                else {
                    if (surgeSeverity > 0.75) {
                        // Extreme Put Buildup / Panic
                        putDelta = Math.round(300000 + Math.random() * 380000);
                        putLtpDelta = +(mem.putLtp * (0.09 + Math.random() * 0.14));
                    }
                    else if (surgeSeverity > 0.45) {
                        // Strong Put Writing Support
                        putDelta = Math.round(190000 + Math.random() * 160000);
                        putLtpDelta = -(mem.putLtp * (0.05 + Math.random() * 0.08));
                    }
                    else {
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
        const { indexState, newSurges } = this.engine.processSnapshot(cfg.symbol, spotInfo.spot, spotInfo.change, spotInfo.pctChange, strikesRaw, cfg.strikeStep, cfg.lotSize, cfg.defaultRange);
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
exports.MarketSimulator = MarketSimulator;
