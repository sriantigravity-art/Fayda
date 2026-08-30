"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceEngine = void 0;
class ConfluenceEngine {
    /**
     * Evaluates all platform trading strategies and fuses them into an Institutional Decision & Risk Engine
     * Enforces NO-TRADE, WAIT, and HEDGE states to protect trader capital per SEBI recommendations.
     */
    static calculateMasterConfluence(symbol, spotPrice, strikes, pcr, maxPain, straddleRange, daysToExpiry, patternBreakout) {
        const atmStrike = strikes.find(s => s.isAtm)?.strikePrice || Math.round(spotPrice / 50) * 50;
        const nearStrikes = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 250);
        // 1. OI Delta Strategy (Weight: 20%)
        const callDelta1m = nearStrikes.reduce((acc, s) => acc + s.callOIChange1m, 0);
        const putDelta1m = nearStrikes.reduce((acc, s) => acc + s.putOIChange1m, 0);
        let oiScore = 70;
        let oiSignal = 'NEUTRAL';
        let oiStatus = 'Neutral 1-Min Delta';
        let oiDetails = 'Call and Put OI change balanced.';
        if (callDelta1m < -5000 && putDelta1m > 5000) {
            oiScore = 94;
            oiSignal = 'BULLISH';
            oiStatus = '🚀 Strong Call Short Covering';
            oiDetails = `Call writers unwinding (${(callDelta1m / 1000).toFixed(1)}k) with Put accumulation (+${(putDelta1m / 1000).toFixed(1)}k).`;
        }
        else if (putDelta1m < -5000 && callDelta1m > 5000) {
            oiScore = 93;
            oiSignal = 'BEARISH';
            oiStatus = '🚨 Put Panic Unwinding';
            oiDetails = `Put writers capitulating (${(putDelta1m / 1000).toFixed(1)}k) with heavy Call writing (+${(callDelta1m / 1000).toFixed(1)}k).`;
        }
        else if (callDelta1m < 0 || pcr.atmPlusMinus5Pcr > 1.15) {
            oiScore = 82;
            oiSignal = 'BULLISH';
            oiStatus = '📈 Bullish OI Bias';
            oiDetails = 'Positive Call short-covering pressure detected.';
        }
        else if (putDelta1m < 0 || pcr.atmPlusMinus5Pcr < 0.85) {
            oiScore = 82;
            oiSignal = 'BEARISH';
            oiStatus = '📉 Bearish OI Bias';
            oiDetails = 'Put writer liquidation pressure detected.';
        }
        const oiStrategy = {
            strategyName: '1-Min OI Delta & Squeeze Scanner',
            iconName: 'OI',
            score: oiScore,
            signal: oiSignal,
            weightPct: 20,
            statusBadge: oiStatus,
            details: oiDetails
        };
        // 2. Multi-Timeframe Price Action & Breakout Strategy (Weight: 20%)
        let boScore = patternBreakout?.predictedBreakout.probability || 70;
        let boSignal = 'NEUTRAL';
        let boStatus = 'Consolidation / Testing Levels';
        let boDetails = 'Price moving within defined support/resistance range.';
        if (patternBreakout) {
            if (patternBreakout.predictedBreakout.direction === 'UPWARD_BREAKOUT') {
                boSignal = 'BULLISH';
                boStatus = `✓ ${patternBreakout.activePattern.patternName}`;
                boDetails = `${patternBreakout.activePattern.patternName} on ${patternBreakout.activeTimeframe} with trigger at ₹${patternBreakout.predictedBreakout.triggerPrice.toFixed(1)}.`;
            }
            else if (patternBreakout.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN') {
                boSignal = 'BEARISH';
                boStatus = `⚠️ ${patternBreakout.activePattern.patternName}`;
                boDetails = `${patternBreakout.activePattern.patternName} on ${patternBreakout.activeTimeframe} with breakdown trigger at ₹${patternBreakout.predictedBreakout.triggerPrice.toFixed(1)}.`;
            }
        }
        const breakoutStrategy = {
            strategyName: 'Multi-Timeframe Pattern & Breakout Engine',
            iconName: 'BREAKOUT',
            score: boScore,
            signal: boSignal,
            weightPct: 20,
            statusBadge: boStatus,
            details: boDetails
        };
        // 3. Volume Velocity & Order Flow Pressure Strategy (Weight: 15%)
        const avgCallBuyPct = nearStrikes.reduce((acc, s) => acc + (s.callBuyVolPct || 50), 0) / Math.max(1, nearStrikes.length);
        const avgPutBuyPct = nearStrikes.reduce((acc, s) => acc + (s.putBuyVolPct || 50), 0) / Math.max(1, nearStrikes.length);
        let volScore = 75;
        let volSignal = 'NEUTRAL';
        let volStatus = 'Balanced Order Flow';
        let volDetails = 'Buyer/Seller volumes are evenly matched.';
        if (avgCallBuyPct >= 65) {
            volScore = 90;
            volSignal = 'BULLISH';
            volStatus = `⚡ Aggressive Buyer Flow (${avgCallBuyPct.toFixed(0)}% Calls)`;
            volDetails = 'Market taker aggression lifting Call asks.';
        }
        else if (avgPutBuyPct >= 65) {
            volScore = 90;
            volSignal = 'BEARISH';
            volStatus = `🚨 Aggressive Put Buying (${avgPutBuyPct.toFixed(0)}% Puts)`;
            volDetails = 'Institutional Put buying hitting the bid.';
        }
        else if (avgCallBuyPct > 55) {
            volScore = 80;
            volSignal = 'BULLISH';
            volStatus = 'Bullish Order Flow Bias';
            volDetails = 'Call buying interest exceeding sell pressure.';
        }
        else if (avgPutBuyPct > 55) {
            volScore = 80;
            volSignal = 'BEARISH';
            volStatus = 'Bearish Order Flow Bias';
            volDetails = 'Put buying interest dominating flow.';
        }
        const volumeStrategy = {
            strategyName: 'Order Flow & Volume Velocity',
            iconName: 'VOLUME',
            score: volScore,
            signal: volSignal,
            weightPct: 15,
            statusBadge: volStatus,
            details: volDetails
        };
        // 4. 0DTE Gamma Explosion Velocity (Weight: 15%)
        let gammaScore = daysToExpiry === 0 ? 92 : daysToExpiry <= 2 ? 82 : 70;
        let gammaSignal = boSignal !== 'NEUTRAL' ? boSignal : oiSignal;
        let gammaStatus = daysToExpiry === 0 ? '⚡ 0DTE Gamma Active' : `🗓️ ${daysToExpiry} DTE Swing Setup`;
        let gammaDetails = daysToExpiry === 0
            ? 'Sub-₹60 options primed for rapid non-linear gamma acceleration.'
            : 'Directional momentum setup with controlled theta risk.';
        const gammaStrategy = {
            strategyName: '0DTE Gamma Spike & Velocity Radar',
            iconName: 'GAMMA',
            score: gammaScore,
            signal: gammaSignal,
            weightPct: 15,
            statusBadge: gammaStatus,
            details: gammaDetails
        };
        // 5. PCR Sentiment & Shift Momentum (Weight: 10%)
        let pcrScore = 75;
        let pcrSignal = 'NEUTRAL';
        let pcrStatus = `PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)}`;
        let pcrDetails = `1-Min PCR Shift: ${pcr.pcr1mChange >= 0 ? '+' : ''}${pcr.pcr1mChange.toFixed(3)}`;
        if (pcr.atmPlusMinus5Pcr >= 1.25) {
            pcrScore = 92;
            pcrSignal = 'BULLISH';
            pcrStatus = `🚀 Strong Support Base (PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
            pcrDetails = 'Heavy Put writing providing strong support base.';
        }
        else if (pcr.atmPlusMinus5Pcr <= 0.75) {
            pcrScore = 92;
            pcrSignal = 'BEARISH';
            pcrStatus = `🚨 Strong Resistance Ceiling (PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
            pcrDetails = 'Heavy Call writing capping upside potential.';
        }
        else if (pcr.pcr1mChange > 0.03) {
            pcrScore = 82;
            pcrSignal = 'BULLISH';
            pcrStatus = '📈 Rising PCR Momentum';
            pcrDetails = 'Put writers adding aggressive support.';
        }
        else if (pcr.pcr1mChange < -0.03) {
            pcrScore = 82;
            pcrSignal = 'BEARISH';
            pcrStatus = '📉 Falling PCR Momentum';
            pcrDetails = 'Call writers adding aggressive resistance.';
        }
        const pcrStrategy = {
            strategyName: 'PCR Multi-Strike Sentiment',
            iconName: 'PCR',
            score: pcrScore,
            signal: pcrSignal,
            weightPct: 10,
            statusBadge: pcrStatus,
            details: pcrDetails
        };
        // 6. Max Pain & Straddle Range Strategy (Weight: 10%)
        const distToMaxPain = maxPain.differenceFromSpot;
        let mpScore = 78;
        let mpSignal = distToMaxPain > 35 ? 'BULLISH' : distToMaxPain < -35 ? 'BEARISH' : 'NEUTRAL';
        let mpStatus = `Max Pain: ₹${maxPain.strikePrice}`;
        let mpDetails = `Spot is ${distToMaxPain >= 0 ? '+' : ''}${distToMaxPain.toFixed(0)} pts from Max Pain. Breakeven Range: ₹${straddleRange.lowerBreakeven.toFixed(0)} - ₹${straddleRange.upperBreakeven.toFixed(0)}.`;
        const maxPainStrategy = {
            strategyName: 'Max Pain & Straddle Breakevens',
            iconName: 'MAXPAIN',
            score: mpScore,
            signal: mpSignal,
            weightPct: 10,
            statusBadge: mpStatus,
            details: mpDetails
        };
        // 7. IV Status & Theta Safety Filter (Weight: 10%)
        const atmStrikeObj = strikes.find(s => s.isAtm);
        const avgIv = atmStrikeObj?.iv || 13.5;
        let ivScore = avgIv < 14 ? 90 : avgIv < 17 ? 80 : 60;
        let ivStatus = avgIv < 14 ? '✓ Low IV Buying Edge' : avgIv > 18 ? '⚠️ High IV Crush Risk' : 'Fair IV';
        let ivDetails = `IV at ${avgIv.toFixed(1)}%. ${avgIv < 14 ? 'Premiums are cheap for option buyers.' : 'Theta decay is elevated.'}`;
        const ivThetaStrategy = {
            strategyName: 'IV Crush & Theta Safety Filter',
            iconName: 'IV_THETA',
            score: ivScore,
            signal: 'NEUTRAL',
            weightPct: 10,
            statusBadge: ivStatus,
            details: ivDetails
        };
        const strategies = [
            oiStrategy,
            breakoutStrategy,
            volumeStrategy,
            gammaStrategy,
            pcrStrategy,
            maxPainStrategy,
            ivThetaStrategy
        ];
        // Compute Weighted Score & Confluence
        let bullWeight = 0;
        let bearWeight = 0;
        let totalScore = 0;
        strategies.forEach(s => {
            totalScore += s.score * (s.weightPct / 100);
            if (s.signal === 'BULLISH')
                bullWeight += s.weightPct;
            if (s.signal === 'BEARISH')
                bearWeight += s.weightPct;
        });
        const overallScore = Math.min(96, Math.max(50, Math.round(totalScore)));
        // ==========================================
        // MARKET REGIME CLASSIFICATION
        // ==========================================
        let marketRegime = 'RANGE_BOUND_CHOP';
        let regimeLabel = '⚪ Range-Bound Chop (Neutral)';
        if (daysToExpiry === 0 && Math.abs(distToMaxPain) < 40) {
            marketRegime = 'GAMMA_EXPLOSION_0DTE';
            regimeLabel = '⚡ 0DTE Expiry Gamma Acceleration';
        }
        else if (avgIv > 20) {
            marketRegime = 'IV_CRUSH_ZONE';
            regimeLabel = '⚠️ High IV Crush Zone (Elevated Decay)';
        }
        else if (bullWeight >= 55 && overallScore >= 78) {
            marketRegime = 'STRONG_BULLISH_TREND';
            regimeLabel = '🟢 Strong Bullish Trend (Trend Day)';
        }
        else if (bearWeight >= 55 && overallScore >= 78) {
            marketRegime = 'STRONG_BEARISH_TREND';
            regimeLabel = '🔴 Strong Bearish Trend (Selling Day)';
        }
        else if (avgIv > 17) {
            marketRegime = 'HIGH_VOLATILITY_EXPANSION';
            regimeLabel = '🌊 High Volatility Expansion';
        }
        else {
            marketRegime = 'RANGE_BOUND_CHOP';
            regimeLabel = '⚪ Sideways / Range Consolidation';
        }
        // ==========================================
        // STRICT "NO-TRADE", "WAIT", "HEDGE" GATING
        // ==========================================
        let masterDecision = 'WAIT';
        let overallSignal = 'NEUTRAL_WAIT';
        let action = 'WAIT';
        let signalTitle = '⚖️ WAITING FOR HIGH-PROBABILITY CONFLUENCE';
        let convictionLevel = 'NEUTRAL';
        let setupGrade = 'NO_TRADE';
        let riskCategory = 'MEDIUM';
        const whyNotTradeReasons = [];
        // Check gating conditions
        const isChop = marketRegime === 'RANGE_BOUND_CHOP' || (bullWeight < 45 && bearWeight < 45);
        const isHighIv = avgIv > 19;
        const isLowScore = overallScore < 68;
        if (isLowScore && isChop) {
            masterDecision = 'NO_TRADE';
            action = 'NO TRADE';
            overallSignal = 'NEUTRAL_WAIT';
            signalTitle = '⚪ NO TRADE (MARKET CONDITIONS UNSUITABLE)';
            convictionLevel = 'NEUTRAL';
            setupGrade = 'NO_TRADE';
            riskCategory = 'HIGH';
            whyNotTradeReasons.push({
                category: 'Market In Chop / Range',
                description: 'Price is oscillating inside the consolidation band without institutional breakout volume.',
                severity: 'CRITICAL',
                solution: 'Preserve capital. Wait for a clean break of structure (BOS) or 15-min candle close outside range.'
            });
            whyNotTradeReasons.push({
                category: 'Balanced OI Delta',
                description: 'Call and Put writers have equal strength; high risk of whipsaw and theta decay.',
                severity: 'WARNING',
                solution: 'Avoid naked option buying until OI unwinds on one side.'
            });
        }
        else if (isHighIv && isChop) {
            masterDecision = 'HEDGE';
            action = 'HEDGE';
            overallSignal = 'NEUTRAL_WAIT';
            signalTitle = '🟣 HEDGE ONLY (HIGH IV RANGE CHOP)';
            convictionLevel = 'MODERATE';
            setupGrade = 'B';
            riskCategory = 'EXTREME';
            whyNotTradeReasons.push({
                category: 'Elevated IV Crush Risk',
                description: `Implied Volatility is high (${avgIv.toFixed(1)}%). Buying naked calls/puts carries rapid theta drain.`,
                severity: 'CRITICAL',
                solution: 'Use defined-risk spreads (Bull Call Spread / Bear Put Spread) instead of naked options.'
            });
        }
        else if (bullWeight >= 55 && overallScore >= 72) {
            masterDecision = 'BUY_CALL';
            action = 'BUY CALL';
            overallSignal = overallScore >= 88 ? 'STRONG_BUY_CALL' : 'BUY_CALL';
            signalTitle = overallScore >= 88 ? '🚀 A+ STRONG BUY CALL (HIGH-CONVICTION BREAKOUT)' : '🟢 A-GRADE BUY CALL (BULLISH CONFLUENCE)';
            convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
            setupGrade = overallScore >= 88 ? 'A+' : 'A';
            riskCategory = avgIv < 15 ? 'LOW' : 'MEDIUM';
        }
        else if (bearWeight >= 55 && overallScore >= 72) {
            masterDecision = 'BUY_PUT';
            action = 'BUY PUT';
            overallSignal = overallScore >= 88 ? 'STRONG_BUY_PUT' : 'BUY_PUT';
            signalTitle = overallScore >= 88 ? '🚨 A+ STRONG BUY PUT (HIGH-CONVICTION BREAKDOWN)' : '🔴 A-GRADE BUY PUT (BEARISH CONFLUENCE)';
            convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
            setupGrade = overallScore >= 88 ? 'A+' : 'A';
            riskCategory = avgIv < 15 ? 'LOW' : 'MEDIUM';
        }
        else {
            masterDecision = 'WAIT';
            action = 'WAIT';
            overallSignal = 'NEUTRAL_WAIT';
            signalTitle = '🟡 WAIT FOR TRIGGER CONFIRMATION';
            convictionLevel = 'MODERATE';
            setupGrade = 'B';
            riskCategory = 'MEDIUM';
            whyNotTradeReasons.push({
                category: 'Partial Confluence',
                description: 'Directional bias is building, but key confirmation (Volume velocity or Breakout neckline) is pending.',
                severity: 'INFO',
                solution: 'Wait for live trigger price before executing.'
            });
        }
        // Recommended Strike Selection
        const isBull = masterDecision === 'BUY_CALL' || (bullWeight >= bearWeight);
        const targetStrike = isBull
            ? Math.min(atmStrike + 400, atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50))
            : Math.max(atmStrike - 400, atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50));
        const optType = isBull ? 'CE' : 'PE';
        const recommendedStrike = `${symbol} ${targetStrike} ${optType}`;
        const itmStrike = isBull
            ? Math.max(atmStrike - 50, atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50))
            : Math.min(atmStrike + 50, atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50));
        const farOtmStrike = isBull
            ? atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 500 : 250)
            : atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 500 : 250);
        const suggestedInstrument = {
            primary: `${symbol} ${targetStrike} ${optType} (ATM/Near - Balanced Delta ~0.50)`,
            alternative: `${symbol} ${itmStrike} ${optType} (1-Step ITM - Low Theta Decay)`,
            avoid: `${symbol} ${farOtmStrike} ${optType} (Far OTM - Severe Time Decay Trap)`
        };
        const strikeObj = strikes.find(s => s.strikePrice === targetStrike);
        const ltp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 110;
        const cleanLtp = Math.max(10, ltp);
        // Time-of-Day Movement Speed (Opening Drive, Midday Lull, and Last 30-Min Power Surge)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
        let t1Mult = 1.35;
        let t2Mult = 1.70;
        let slMult = 0.80;
        let speedLabel = 'Standard Speed';
        let rrRatio = '1:2.3';
        if (totalMinutes >= 15 * 60) {
            // 03:00 PM - 03:40 PM: Closing 30-Min Power Surge / BTST / 0DTE Acceleration
            t1Mult = 1.55;
            t2Mult = 2.15;
            slMult = 0.78;
            speedLabel = '🔥 Closing Surge Velocity';
            rrRatio = '1:3.4';
        }
        else if (totalMinutes <= 9 * 60 + 45) {
            // 09:15 AM - 09:45 AM: Opening Drive / Initial Range Breakout
            t1Mult = 1.45;
            t2Mult = 1.90;
            slMult = 0.80;
            speedLabel = '⚡ Opening Drive Velocity';
            rrRatio = '1:2.8';
        }
        else if (totalMinutes >= 13 * 60 + 15) {
            // 01:15 PM - 03:00 PM: Afternoon European Inflow
            t1Mult = 1.38;
            t2Mult = 1.75;
            slMult = 0.82;
            speedLabel = '🌊 Afternoon Breakout Velocity';
            rrRatio = '1:2.5';
        }
        else if (totalMinutes >= 11 * 60 + 30) {
            // 11:30 AM - 01:15 PM: Midday Theta Chop
            t1Mult = 1.22;
            t2Mult = 1.45;
            slMult = 0.88;
            speedLabel = '⚖️ Midday Scalp Velocity';
            rrRatio = '1:2.1';
        }
        if (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX') {
            t1Mult = +(t1Mult * 1.05).toFixed(2);
            t2Mult = +(t2Mult * 1.10).toFixed(2);
        }
        const target1 = +(cleanLtp * t1Mult).toFixed(1);
        const target2 = +(cleanLtp * t2Mult).toFixed(1);
        const stoploss = +(cleanLtp * slMult).toFixed(1);
        // Invalidation calculation
        const invalidationOffset = symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 80 : 35;
        const invalidationPrice = isBull ? Math.round(spotPrice - invalidationOffset) : Math.round(spotPrice + invalidationOffset);
        const invalidationLevel = isBull
            ? `${symbol} spot closes below ₹${invalidationPrice} on 15-min candle or breaks VWAP support.`
            : `${symbol} spot closes above ₹${invalidationPrice} on 15-min candle or breaks VWAP resistance.`;
        const scoreBreakdown = {
            trend: Math.round(oiScore * 0.20),
            marketStructure: Math.round(boScore * 0.20),
            momentum: Math.round(volScore * 0.15),
            volume: Math.round(volScore * 0.15),
            oiDerivatives: Math.round(pcrScore * 0.15),
            volatilityGreeks: Math.round(ivScore * 0.10),
            vwapBreadth: Math.round(mpScore * 0.05),
            total: overallScore
        };
        // Market Breadth simulation for India market context
        const advances = isBull ? 34 : 14;
        const declines = isBull ? 14 : 34;
        const unchanged = 2;
        const ratio = +(advances / Math.max(1, declines)).toFixed(2);
        const confluenceRationale = `${overallScore}% confluence (${speedLabel}) across 1-Min Delta OI (${oiStatus}), Pattern Breakout (${boStatus}), Order Flow (${volStatus}), and PCR Momentum (${pcrStatus}).`;
        return {
            overallScore,
            overallSignal,
            masterDecision,
            signalTitle,
            convictionLevel,
            setupGrade,
            marketRegime,
            regimeLabel,
            riskCategory,
            recommendedStrike,
            action,
            entryZone: `₹${cleanLtp.toFixed(1)} - ₹${(cleanLtp * 1.03).toFixed(1)}`,
            target1,
            target2,
            stoploss,
            invalidationLevel,
            invalidationPrice,
            riskReward: rrRatio,
            strategies,
            confluenceRationale,
            whyNotTradeReasons,
            suggestedInstrument,
            scoreBreakdown,
            marketBreadth: {
                advances,
                declines,
                unchanged,
                ratio,
                sentiment: ratio > 1.5 ? 'BULLISH' : ratio < 0.7 ? 'BEARISH' : 'NEUTRAL'
            }
        };
    }
}
exports.ConfluenceEngine = ConfluenceEngine;
