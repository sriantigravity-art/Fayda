"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OIEngine = void 0;
const buildupClassifier_js_1 = require("./buildupClassifier.js");
const surgeDetector_js_1 = require("./surgeDetector.js");
const nseExpiryService_js_1 = require("../services/nseExpiryService.js");
const greekEngine_js_1 = require("./greekEngine.js");
const gammaEngine_js_1 = require("./gammaEngine.js");
const patternEngine_js_1 = require("./patternEngine.js");
const confluenceEngine_js_1 = require("./confluenceEngine.js");
class OIEngine {
    history = new Map();
    recentSurges = [];
    maxSurgeHistory = 60;
    constructor() {
        this.history.set('NIFTY', []);
        this.history.set('BANKNIFTY', []);
        this.history.set('SENSEX', []);
        this.history.set('BANKEX', []);
        this.history.set('FINNIFTY', []);
        this.history.set('MIDCPNIFTY', []);
        this.history.set('NIFTYNXT50', []);
        this.history.set('CRUDEOIL', []);
        this.history.set('NATURALGAS', []);
        this.history.set('GOLD', []);
        this.history.set('SILVER', []);
        this.history.set('COPPER', []);
        this.history.set('ZINC', []);
    }
    processSnapshot(symbol, spotPrice, spotChange, spotPctChange, strikesRaw, strikeStep, lotSize, defaultRange = 200, dataSource = 'FYERS_LIVE', expiryDates = [], selectedExpiry, exchangeTotalCallOI, exchangeTotalPutOI, indiaVix) {
        const now = Date.now();
        const hist = this.history.get(symbol) || [];
        // Use official expiry dates provided by live feed, or fallback to NSE service
        let expiries = expiryDates && expiryDates.length > 0
            ? expiryDates
            : nseExpiryService_js_1.NseExpiryService.getUpcomingExpiries(symbol);
        const activeExpiry = selectedExpiry || expiries[0] || 'Current Weekly';
        const daysToExpiry = nseExpiryService_js_1.NseExpiryService.calculateDTE(activeExpiry);
        // ATM calculation
        const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;
        // Previous snapshots
        const prevEntry1m = hist.length > 0 ? hist[hist.length - 1] : null;
        const fiveMinAgo = now - 5 * 60 * 1000;
        const prevEntry5m = hist.find(h => h.timestamp <= fiveMinAgo) || (hist.length > 4 ? hist[hist.length - 5] : hist[0]);
        // Dynamic OI/volume baselines — self-calibrate from rolling 1-min history.
        // When history is sparse (<5 entries), bootstrap from total chain OI (0.15% per minute is realistic).
        // This replaces fixed magic numbers that don't adapt to actual market conditions.
        let avgCallOiChange1m;
        let avgPutOiChange1m;
        let avgVolume;
        if (hist.length >= 5) {
            // Compute rolling averages from the most recent 10 snapshots
            const recentHist = hist.slice(-10);
            let sumCallDelta = 0, sumPutDelta = 0, sumVol = 0, count = 0;
            for (const entry of recentHist) {
                let entryCallDelta = 0, entryPutDelta = 0, entryVol = 0;
                entry.strikes.forEach(s => {
                    entryCallDelta += Math.abs(s.callOI);
                    entryPutDelta += Math.abs(s.putOI);
                    entryVol += (s.callVolume || 0) + (s.putVolume || 0);
                });
                const strikeCount = Math.max(1, entry.strikes.size);
                sumCallDelta += entryCallDelta / strikeCount * 0.002; // ~0.2% of OI per min
                sumPutDelta += entryPutDelta / strikeCount * 0.002;
                sumVol += entryVol / strikeCount;
                count++;
            }
            avgCallOiChange1m = Math.max(5000, Math.round(sumCallDelta / count));
            avgPutOiChange1m = Math.max(5000, Math.round(sumPutDelta / count));
            avgVolume = Math.max(20000, Math.round(sumVol / count));
        }
        else {
            // Bootstrap: derive from the current snapshot's total OI
            // 0.15% of per-strike OI per minute is a reasonable baseline
            const strikeCount = Math.max(1, strikesRaw.length);
            const totalCallOIEst = strikesRaw.reduce((acc, s) => acc + (s.callOI || 0), 0);
            const totalPutOIEst = strikesRaw.reduce((acc, s) => acc + (s.putOI || 0), 0);
            const totalVolEst = strikesRaw.reduce((acc, s) => acc + (s.callVolume || 0) + (s.putVolume || 0), 0);
            avgCallOiChange1m = Math.max(5000, Math.round(totalCallOIEst / strikeCount * 0.0015));
            avgPutOiChange1m = Math.max(5000, Math.round(totalPutOIEst / strikeCount * 0.0015));
            avgVolume = Math.max(20000, Math.round(totalVolEst / strikeCount));
        }
        let totalCallOI = 0;
        let totalPutOI = 0;
        let totalCallOIChange1m = 0;
        let totalPutOIChange1m = 0;
        let totalCallVolume = 0;
        let totalPutVolume = 0;
        let totalCallBuyVolume = 0;
        let totalCallSellVolume = 0;
        let totalPutBuyVolume = 0;
        let totalPutSellVolume = 0;
        let atm5CallOI = 0;
        let atm5PutOI = 0;
        let atm10CallOI = 0;
        let atm10PutOI = 0;
        let atmCallLtp = 0;
        let atmPutLtp = 0;
        let atmCallTheta = 0;
        let atmPutTheta = 0;
        const strikesData = [];
        const detectedSurgesThisTick = [];
        const timeStr = new Date(now).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
        // Process each strike with GreekEngine, IV & Liquidity Evaluators
        for (const raw of strikesRaw) {
            const strike = raw.strikePrice;
            const prevStrike = prevEntry1m?.strikes.get(strike);
            // Call metrics
            const prevCallOI = prevStrike ? prevStrike.callOI : raw.callOI;
            const prevCallLtp = prevStrike ? prevStrike.callLtp : raw.callLtp;
            const realCallDelta = raw.callOI - prevCallOI;
            const callOIChange1m = realCallDelta !== 0
                ? realCallDelta
                : (raw.callOIChangeTotal ? Math.round(raw.callOIChangeTotal / 60) : 0);
            const callLtpChange = +(raw.callLtp - prevCallLtp).toFixed(2);
            const callLtpPctChange = prevCallLtp > 0 ? +((callLtpChange / prevCallLtp) * 100).toFixed(2) : 0;
            const callBuildup = (0, buildupClassifier_js_1.classifyBuildup)(callOIChange1m, callLtpChange);
            // Dynamic Call Buyer vs Seller Volume Ratio
            const callMoneynessFactor = ((strike - atmStrike) / strikeStep) * 0.02;
            let callBuyRatio = 0.50;
            if (callBuildup === 'LONG_BUILDUP') {
                callBuyRatio = 0.62 + Math.min(0.26, Math.abs(callLtpPctChange) * 0.03) - callMoneynessFactor;
            }
            else if (callBuildup === 'SHORT_BUILDUP') {
                callBuyRatio = 0.38 - Math.min(0.24, Math.abs(callLtpPctChange) * 0.03) - callMoneynessFactor;
            }
            else if (callBuildup === 'SHORT_COVERING') {
                callBuyRatio = 0.58 + Math.min(0.22, Math.abs(callLtpPctChange) * 0.025);
            }
            else if (callBuildup === 'LONG_UNWINDING') {
                callBuyRatio = 0.42 - Math.min(0.22, Math.abs(callLtpPctChange) * 0.025);
            }
            else {
                callBuyRatio = 0.50 + (callLtpChange >= 0 ? 0.04 : -0.04) - callMoneynessFactor;
            }
            callBuyRatio = Math.max(0.12, Math.min(0.88, callBuyRatio));
            const callBuyVolume = Math.round(raw.callVolume * callBuyRatio);
            const callSellVolume = Math.max(0, raw.callVolume - callBuyVolume);
            const callBuyVolPct = Math.round(callBuyRatio * 100);
            // Put metrics
            const prevPutOI = prevStrike ? prevStrike.putOI : raw.putOI;
            const prevPutLtp = prevStrike ? prevStrike.putLtp : raw.putLtp;
            const realPutDelta = raw.putOI - prevPutOI;
            const putOIChange1m = realPutDelta !== 0
                ? realPutDelta
                : (raw.putOIChangeTotal ? Math.round(raw.putOIChangeTotal / 60) : 0);
            const putLtpChange = +(raw.putLtp - prevPutLtp).toFixed(2);
            const putLtpPctChange = prevPutLtp > 0 ? +((putLtpChange / prevPutLtp) * 100).toFixed(2) : 0;
            const putBuildup = (0, buildupClassifier_js_1.classifyBuildup)(putOIChange1m, putLtpChange);
            // Dynamic Put Buyer vs Seller Volume Ratio
            const putMoneynessFactor = ((atmStrike - strike) / strikeStep) * 0.02;
            let putBuyRatio = 0.50;
            if (putBuildup === 'LONG_BUILDUP') {
                putBuyRatio = 0.62 + Math.min(0.26, Math.abs(putLtpPctChange) * 0.03) - putMoneynessFactor;
            }
            else if (putBuildup === 'SHORT_BUILDUP') {
                putBuyRatio = 0.38 - Math.min(0.24, Math.abs(putLtpPctChange) * 0.03) - putMoneynessFactor;
            }
            else if (putBuildup === 'SHORT_COVERING') {
                putBuyRatio = 0.58 + Math.min(0.22, Math.abs(putLtpPctChange) * 0.025);
            }
            else if (putBuildup === 'LONG_UNWINDING') {
                putBuyRatio = 0.42 - Math.min(0.22, Math.abs(putLtpPctChange) * 0.025);
            }
            else {
                putBuyRatio = 0.50 + (putLtpChange >= 0 ? 0.04 : -0.04) - putMoneynessFactor;
            }
            putBuyRatio = Math.max(0.12, Math.min(0.88, putBuyRatio));
            const putBuyVolume = Math.round(raw.putVolume * putBuyRatio);
            const putSellVolume = Math.max(0, raw.putVolume - putBuyVolume);
            const putBuyVolPct = Math.round(putBuyRatio * 100);
            // Black-Scholes Greeks, IV Pricing & Liquidity Rating
            const greeks = greekEngine_js_1.GreekEngine.calculateGreeks(spotPrice, strike, daysToExpiry, raw.callLtp, raw.putLtp);
            const callLiq = greekEngine_js_1.GreekEngine.evaluateLiquidity(raw.callVolume, raw.callOI, raw.callLtp);
            const putLiq = greekEngine_js_1.GreekEngine.evaluateLiquidity(raw.putVolume, raw.putOI, raw.putLtp);
            const callSurge = (0, surgeDetector_js_1.calculateSurgeScore)(symbol, callOIChange1m, avgCallOiChange1m, raw.callVolume, avgVolume, callLtpPctChange, 0, strike, atmStrike);
            const putSurge = (0, surgeDetector_js_1.calculateSurgeScore)(symbol, putOIChange1m, avgPutOiChange1m, raw.putVolume, avgVolume, putLtpPctChange, 0, strike, atmStrike);
            // Aggregates
            totalCallOI += raw.callOI;
            totalPutOI += raw.putOI;
            totalCallOIChange1m += callOIChange1m;
            totalPutOIChange1m += putOIChange1m;
            totalCallVolume += raw.callVolume;
            totalPutVolume += raw.putVolume;
            totalCallBuyVolume += callBuyVolume;
            totalCallSellVolume += callSellVolume;
            totalPutBuyVolume += putBuyVolume;
            totalPutSellVolume += putSellVolume;
            const strikeDist = Math.abs(strike - atmStrike) / strikeStep;
            if (strikeDist <= 5) {
                atm5CallOI += raw.callOI;
                atm5PutOI += raw.putOI;
            }
            if (strikeDist <= 10) {
                atm10CallOI += raw.callOI;
                atm10PutOI += raw.putOI;
            }
            if (strike === atmStrike) {
                atmCallLtp = raw.callLtp;
                atmPutLtp = raw.putLtp;
                atmCallTheta = greeks.callTheta;
                atmPutTheta = greeks.putTheta;
            }
            const pcrStrike = raw.callOI > 0 ? +(raw.putOI / raw.callOI).toFixed(2) : 0;
            const isAtm = strike === atmStrike;
            strikesData.push({
                strikePrice: strike,
                callOI: raw.callOI,
                callOIChange1m,
                callOIChangeTotal: raw.callOIChangeTotal !== undefined ? raw.callOIChangeTotal : (callOIChange1m * 5),
                callLtp: raw.callLtp,
                callLtpChange,
                callLtpPctChange,
                callVolume: raw.callVolume,
                callBuyVolume,
                callSellVolume,
                callBuyVolPct,
                callBuildup,
                callSurgeScore: callSurge.score,
                callSurgeLevel: callSurge.level,
                callTheta: greeks.callTheta,
                callThetaPerHour: greeks.callThetaPerHour,
                callIv: greeks.callIv,
                callIvStatus: greeks.callIvStatus,
                callLiquidity: callLiq.rating,
                callBidAskSpreadPct: callLiq.spreadPct,
                putOI: raw.putOI,
                putOIChange1m,
                putOIChangeTotal: raw.putOIChangeTotal !== undefined ? raw.putOIChangeTotal : (putOIChange1m * 5),
                putLtp: raw.putLtp,
                putLtpChange,
                putLtpPctChange,
                putVolume: raw.putVolume,
                putBuyVolume,
                putSellVolume,
                putBuyVolPct,
                putBuildup,
                putSurgeScore: putSurge.score,
                putSurgeLevel: putSurge.level,
                putTheta: greeks.putTheta,
                putThetaPerHour: greeks.putThetaPerHour,
                putIv: greeks.putIv,
                putIvStatus: greeks.putIvStatus,
                putLiquidity: putLiq.rating,
                putBidAskSpreadPct: putLiq.spreadPct,
                iv: greeks.iv,
                thetaIntensity: greeks.thetaIntensity,
                pcrStrike,
                isAtm,
                distanceFromAtm: strike - atmStrike
            });
            // Call Surge Event (Factoring IV Pricing, Liquidity Verification & ±400 Strike Window)
            if (callSurge.level !== 'NORMAL' && raw.callVolume >= 10000 && Math.abs(strike - atmStrike) <= 400) {
                const actionInfo = (0, buildupClassifier_js_1.determineTradeAction)(symbol, 'CE', callBuildup, strike, atmStrike, raw.callLtp);
                const suggestion = (0, buildupClassifier_js_1.generateOptionSuggestion)(symbol, strike, 'CE', raw.callLtp, actionInfo.tradeAction, activeExpiry, atmStrike);
                const ivNote = greeks.callIvStatus === 'CHEAP'
                    ? `IV ${greeks.callIv}% (Cheap • Low Crush Risk)`
                    : greeks.callIvStatus === 'EXPENSIVE_CRUSH_RISK'
                        ? `IV ${greeks.callIv}% (Expensive • Volatility Crush Risk)`
                        : `IV ${greeks.callIv}% (Fair Value)`;
                const liqNote = callLiq.rating === 'HIGH_LIQUIDITY'
                    ? `High Liquidity (${(raw.callVolume / 100000).toFixed(1)}L Vol • Tight Spread)`
                    : `Moderate Liquidity (${(raw.callVolume / 1000).toFixed(0)}k Vol)`;
                detectedSurgesThisTick.push({
                    id: `${symbol}-CE-${strike}-${now}`,
                    timestamp: new Date(now).toISOString(),
                    timeFormatted: timeStr,
                    indexSymbol: symbol,
                    strikePrice: strike,
                    optionType: 'CE',
                    expiryDate: activeExpiry,
                    surgeLevel: callSurge.level,
                    surgeScore: callSurge.score,
                    oiChange1m: callOIChange1m,
                    oiChange1mFormatted: (0, surgeDetector_js_1.formatIndianNumber)(callOIChange1m),
                    oiChangePct: prevCallOI > 0 ? +((callOIChange1m / prevCallOI) * 100).toFixed(1) : 0,
                    currentOI: raw.callOI,
                    currentOIFormatted: (0, surgeDetector_js_1.formatIndianNumber)(raw.callOI).replace('+', ''),
                    ltp: raw.callLtp,
                    ltpChange: callLtpChange,
                    ltpPctChange: callLtpPctChange,
                    volume: raw.callVolume,
                    buildup: callBuildup,
                    tradeAction: actionInfo.tradeAction,
                    actionTitle: actionInfo.actionTitle,
                    actionDescription: actionInfo.actionDescription,
                    iv: greeks.callIv,
                    ivStatus: greeks.callIvStatus,
                    ivDescription: ivNote,
                    liquidityRating: callLiq.rating,
                    spreadFormatted: `±${callLiq.spreadPct}%`,
                    volumeFormatted: `${(raw.callVolume / 100000).toFixed(2)}L`,
                    suggestedContract: {
                        ...suggestion,
                        ivNote,
                        liquidityNote: liqNote
                    },
                    confidence: actionInfo.confidence,
                    validUntilMinutes: callSurge.level === 'EXTREME' ? 10 : callSurge.level === 'STRONG' ? 15 : 20,
                    expiresAt: new Date(now + (callSurge.level === 'EXTREME' ? 10 : callSurge.level === 'STRONG' ? 15 : 20) * 60000).toISOString()
                });
            }
            // Put Surge Event (Factoring IV Pricing, Liquidity Verification & ±400 Strike Window)
            if (putSurge.level !== 'NORMAL' && raw.putVolume >= 10000 && Math.abs(strike - atmStrike) <= 400) {
                const actionInfo = (0, buildupClassifier_js_1.determineTradeAction)(symbol, 'PE', putBuildup, strike, atmStrike, raw.putLtp);
                const suggestion = (0, buildupClassifier_js_1.generateOptionSuggestion)(symbol, strike, 'PE', raw.putLtp, actionInfo.tradeAction, activeExpiry, atmStrike);
                const ivNote = greeks.putIvStatus === 'CHEAP'
                    ? `IV ${greeks.putIv}% (Cheap • Low Crush Risk)`
                    : greeks.putIvStatus === 'EXPENSIVE_CRUSH_RISK'
                        ? `IV ${greeks.putIv}% (Expensive • Volatility Crush Risk)`
                        : `IV ${greeks.putIv}% (Fair Value)`;
                const liqNote = putLiq.rating === 'HIGH_LIQUIDITY'
                    ? `High Liquidity (${(raw.putVolume / 100000).toFixed(1)}L Vol • Tight Spread)`
                    : `Moderate Liquidity (${(raw.putVolume / 1000).toFixed(0)}k Vol)`;
                detectedSurgesThisTick.push({
                    id: `${symbol}-PE-${strike}-${now}`,
                    timestamp: new Date(now).toISOString(),
                    timeFormatted: timeStr,
                    indexSymbol: symbol,
                    strikePrice: strike,
                    optionType: 'PE',
                    expiryDate: activeExpiry,
                    surgeLevel: putSurge.level,
                    surgeScore: putSurge.score,
                    oiChange1m: putOIChange1m,
                    oiChange1mFormatted: (0, surgeDetector_js_1.formatIndianNumber)(putOIChange1m),
                    oiChangePct: prevPutOI > 0 ? +((putOIChange1m / prevPutOI) * 100).toFixed(1) : 0,
                    currentOI: raw.putOI,
                    currentOIFormatted: (0, surgeDetector_js_1.formatIndianNumber)(raw.putOI).replace('+', ''),
                    ltp: raw.putLtp,
                    ltpChange: putLtpChange,
                    ltpPctChange: putLtpPctChange,
                    volume: raw.putVolume,
                    buildup: putBuildup,
                    tradeAction: actionInfo.tradeAction,
                    actionTitle: actionInfo.actionTitle,
                    actionDescription: actionInfo.actionDescription,
                    iv: greeks.putIv,
                    ivStatus: greeks.putIvStatus,
                    ivDescription: ivNote,
                    liquidityRating: putLiq.rating,
                    spreadFormatted: `±${putLiq.spreadPct}%`,
                    volumeFormatted: `${(raw.putVolume / 100000).toFixed(2)}L`,
                    suggestedContract: {
                        ...suggestion,
                        ivNote,
                        liquidityNote: liqNote
                    },
                    confidence: actionInfo.confidence,
                    validUntilMinutes: putSurge.level === 'EXTREME' ? 10 : putSurge.level === 'STRONG' ? 15 : 20,
                    expiresAt: new Date(now + (putSurge.level === 'EXTREME' ? 10 : putSurge.level === 'STRONG' ? 15 : 20) * 60000).toISOString()
                });
            }
        }
        strikesData.sort((a, b) => a.strikePrice - b.strikePrice);
        // Calculate Key Resistance Levels (Top Call OI near ATM within ±400 pts)
        const callStrikesSorted = [...strikesData]
            .filter(s => s.strikePrice >= atmStrike - strikeStep && Math.abs(s.strikePrice - atmStrike) <= 400)
            .sort((a, b) => b.callOI - a.callOI);
        const resistanceLevels = callStrikesSorted.slice(0, 3).map((s, idx) => ({
            levelName: `R${idx + 1}`,
            strikePrice: s.strikePrice,
            oi: s.callOI,
            oiFormatted: `${(s.callOI / 100000).toFixed(2)}L`,
            oiChange: s.callOIChange1m,
            oiChangeFormatted: `${s.callOIChange1m > 0 ? '+' : ''}${(s.callOIChange1m / 1000).toFixed(0)}k`,
            distanceFromAtm: s.strikePrice - atmStrike,
            strength: idx === 0 ? 'MAJOR' : idx === 1 ? 'INTERMEDIATE' : 'MINOR'
        }));
        // Calculate Key Support Levels (Top Put OI near ATM within ±400 pts)
        const putStrikesSorted = [...strikesData]
            .filter(s => s.strikePrice <= atmStrike + strikeStep && Math.abs(s.strikePrice - atmStrike) <= 400)
            .sort((a, b) => b.putOI - a.putOI);
        const supportLevels = putStrikesSorted.slice(0, 3).map((s, idx) => ({
            levelName: `S${idx + 1}`,
            strikePrice: s.strikePrice,
            oi: s.putOI,
            oiFormatted: `${(s.putOI / 100000).toFixed(2)}L`,
            oiChange: s.putOIChange1m,
            oiChangeFormatted: `${s.putOIChange1m > 0 ? '+' : ''}${(s.putOIChange1m / 1000).toFixed(0)}k`,
            distanceFromAtm: s.strikePrice - atmStrike,
            strength: idx === 0 ? 'MAJOR' : idx === 1 ? 'INTERMEDIATE' : 'MINOR'
        }));
        // Calculate Max Pain Strike
        let minLoss = Infinity;
        let maxPainStrike = atmStrike;
        for (const testStrike of strikesData) {
            let currentLoss = 0;
            for (const s of strikesData) {
                if (testStrike.strikePrice > s.strikePrice) {
                    currentLoss += (testStrike.strikePrice - s.strikePrice) * s.callOI;
                }
                if (testStrike.strikePrice < s.strikePrice) {
                    currentLoss += (s.strikePrice - testStrike.strikePrice) * s.putOI;
                }
            }
            if (currentLoss < minLoss) {
                minLoss = currentLoss;
                maxPainStrike = testStrike.strikePrice;
            }
        }
        const maxPain = {
            strikePrice: maxPainStrike,
            totalLossCrores: +(minLoss / 10000000).toFixed(2),
            differenceFromSpot: +(maxPainStrike - spotPrice).toFixed(1),
            expiryDate: activeExpiry
        };
        // Calculate ATM Straddle Price & Range & Combined Theta Decay
        const combinedPremium = +(atmCallLtp + atmPutLtp).toFixed(2);
        const upperBreakeven = +(atmStrike + combinedPremium).toFixed(1);
        const lowerBreakeven = +(atmStrike - combinedPremium).toFixed(1);
        const expectedMovePct = spotPrice > 0 ? +((combinedPremium / spotPrice) * 100).toFixed(2) : 0;
        const atmTotalThetaDaily = +(atmCallTheta + atmPutTheta).toFixed(2);
        const atmTotalThetaHourly = +(atmTotalThetaDaily / 6.4).toFixed(2);
        const straddleRange = {
            atmStrike,
            atmCallLtp,
            atmPutLtp,
            combinedPremium,
            upperBreakeven,
            lowerBreakeven,
            expectedMovePct,
            expiryDate: activeExpiry,
            atmTotalThetaDaily,
            atmTotalThetaHourly
        };
        // Calculate PCR & Volume aggregation using exact exchange-wide totals
        const effectiveTotalCallOI = (exchangeTotalCallOI && exchangeTotalCallOI > 0) ? exchangeTotalCallOI : totalCallOI;
        const effectiveTotalPutOI = (exchangeTotalPutOI && exchangeTotalPutOI > 0) ? exchangeTotalPutOI : totalPutOI;
        const overallPcr = effectiveTotalCallOI > 0 ? +(effectiveTotalPutOI / effectiveTotalCallOI).toFixed(2) : 1.0;
        const atmPlusMinus5Pcr = atm5CallOI > 0 ? +(atm5PutOI / atm5CallOI).toFixed(2) : 1.0;
        const atmPlusMinus10Pcr = atm10CallOI > 0 ? +(atm10PutOI / atm10CallOI).toFixed(2) : 1.0;
        const prevPcr1m = prevEntry1m?.pcr || overallPcr;
        const prevPcr5m = prevEntry5m?.pcr || overallPcr;
        const pcr1mChange = +(overallPcr - prevPcr1m).toFixed(3);
        const pcr5mChange = +(overallPcr - prevPcr5m).toFixed(3);
        let sentiment = 'NEUTRAL';
        if (atmPlusMinus5Pcr >= 1.35)
            sentiment = 'EXTREMELY_BULLISH';
        else if (atmPlusMinus5Pcr >= 1.10)
            sentiment = 'BULLISH';
        else if (atmPlusMinus5Pcr <= 0.65)
            sentiment = 'EXTREMELY_BEARISH';
        else if (atmPlusMinus5Pcr <= 0.88)
            sentiment = 'BEARISH';
        const pcr = {
            overallPcr,
            atmPlusMinus5Pcr,
            atmPlusMinus10Pcr,
            pcr1mChange,
            pcr5mChange,
            totalCallOI: effectiveTotalCallOI,
            totalPutOI: effectiveTotalPutOI,
            totalCallOIChange1m,
            totalPutOIChange1m,
            totalCallVolume,
            totalPutVolume,
            totalCallBuyVolume,
            totalCallSellVolume,
            totalPutBuyVolume,
            totalPutSellVolume,
            sentiment
        };
        // Store in rolling memory
        const currentStrikeMap = new Map();
        strikesRaw.forEach(s => currentStrikeMap.set(s.strikePrice, s));
        hist.push({
            timestamp: now,
            strikes: currentStrikeMap,
            pcr: overallPcr,
            atmPcr: atmPlusMinus5Pcr
        });
        if (hist.length > 40) {
            hist.shift();
        }
        this.history.set(symbol, hist);
        // Automatically purge expired surges from memory after their validity horizon (10-15m max)
        this.recentSurges = this.recentSurges.filter(s => {
            const ageMin = (now - new Date(s.timestamp).getTime()) / (60 * 1000);
            const maxAge = s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 10 : s.surgeLevel === 'STRONG' ? 15 : 20);
            return ageMin <= maxAge;
        });
        if (detectedSurgesThisTick.length > 0) {
            this.recentSurges = [...detectedSurgesThisTick, ...this.recentSurges].slice(0, this.maxSurgeHistory);
        }
        // Filter active (unexpired) surges for current symbol within ±400 pts
        const indexSurges = this.recentSurges.filter(s => {
            if (s.indexSymbol !== symbol || Math.abs(s.strikePrice - atmStrike) > 400)
                return false;
            const ageMin = (now - new Date(s.timestamp).getTime()) / (60 * 1000);
            const maxAge = s.validUntilMinutes || 15;
            return ageMin <= maxAge;
        });
        // Select recommendations prioritizing Liquid strikes with reasonable IV (Low Crush Risk) within ±400 pts
        const bullishPick = indexSurges.find(s => s.tradeAction === 'BUY_CALL' &&
            s.liquidityRating === 'HIGH_LIQUIDITY' &&
            s.ivStatus !== 'EXPENSIVE_CRUSH_RISK') || indexSurges.find(s => s.tradeAction === 'BUY_CALL') || null;
        const bearishPick = indexSurges.find(s => s.tradeAction === 'BUY_PUT' &&
            s.liquidityRating === 'HIGH_LIQUIDITY' &&
            s.ivStatus !== 'EXPENSIVE_CRUSH_RISK') || indexSurges.find(s => s.tradeAction === 'BUY_PUT') || null;
        const highestScoreEvent = indexSurges.length > 0
            ? [...indexSurges].sort((a, b) => b.surgeScore - a.surgeScore)[0]
            : null;
        // Evaluate 0DTE Gamma Spike & Hero-or-Zero Setups
        const heroZeroSignals = gammaEngine_js_1.gammaEngine.evaluateHeroZeroSignals(symbol, spotPrice, atmStrike, strikesData, daysToExpiry, strikeStep);
        const indexState = {
            symbol,
            spotPrice,
            change: spotChange,
            pctChange: spotPctChange,
            atmStrike,
            strikeStep,
            lotSize,
            lastUpdated: timeStr,
            expiryDates: expiries,
            selectedExpiry: activeExpiry,
            daysToExpiry,
            dataSource,
            pcr,
            strikes: strikesData,
            defaultRange,
            resistanceLevels,
            supportLevels,
            maxPain,
            straddleRange,
            recommendedTrades: {
                bullishPick,
                bearishPick,
                highestScoreEvent
            },
            heroZeroSignals,
            patternBreakout: patternEngine_js_1.PatternEngine.analyzePatternAndBreakout(symbol, spotPrice, strikesData, pcr, '15m'),
            masterConfluence: confluenceEngine_js_1.ConfluenceEngine.calculateMasterConfluence(symbol, spotPrice, strikesData, pcr, maxPain, straddleRange, daysToExpiry, patternEngine_js_1.PatternEngine.analyzePatternAndBreakout(symbol, spotPrice, strikesData, pcr, '15m')),
            indiaVix
        };
        return {
            indexState,
            newSurges: detectedSurgesThisTick
        };
    }
    getRecentSurges(limit = 40) {
        return this.recentSurges.slice(0, limit);
    }
}
exports.OIEngine = OIEngine;
