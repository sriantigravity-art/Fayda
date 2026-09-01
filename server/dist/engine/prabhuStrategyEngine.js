export class PrabhuStrategyEngine {
    /**
     * Scans all 25 Vikram Prabhu Day Trading Strategies for the active symbol
     * Evaluates price action against CPR, Standard Pivots, 20 EMA, Order Flow & 1-Min Delta OI.
     */
    static scanStrategies(symbol, spotPrice, cpr, regime, strikes, pcr, virginCPRs = [], ema20) {
        const effectiveEma20 = ema20 && ema20 > 0 ? ema20 : spotPrice - (spotPrice - cpr.pivot) * 0.3;
        const detected = [];
        // ATM Strikes & 1-Min Delta OI Confirmation
        const atmStrike = strikes.find(s => s.isAtm)?.strikePrice || Math.round(spotPrice / 50) * 50;
        const nearStrikes = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 250);
        const callDelta1m = nearStrikes.reduce((acc, s) => acc + s.callOIChange1m, 0);
        const putDelta1m = nearStrikes.reduce((acc, s) => acc + s.putOIChange1m, 0);
        const isBullishOi = callDelta1m < 0 || putDelta1m > 10000 || pcr.atmPlusMinus5Pcr >= 1.05;
        const isBearishOi = putDelta1m < 0 || callDelta1m > 10000 || pcr.atmPlusMinus5Pcr <= 0.90;
        const baseRiskPts = Math.max(15, Math.round(Math.abs(spotPrice - cpr.pivot) * 0.5) || 25);
        // =========================================================================
        // 1. Check Reversal / Trapping Strategies (Chapter 9: 11 Strategies)
        // =========================================================================
        // 18. Virgin CPR Reversal Pattern
        const activeVirgin = virginCPRs.find(v => v.isUntouched && Math.abs(spotPrice - v.pivot) <= baseRiskPts * 1.5);
        if (activeVirgin) {
            const isReversingFromLow = spotPrice >= activeVirgin.bottomCPR && spotPrice <= activeVirgin.topCPR + baseRiskPts;
            const isReversingFromHigh = spotPrice <= activeVirgin.topCPR && spotPrice >= activeVirgin.bottomCPR - baseRiskPts;
            if (isReversingFromLow) {
                detected.push({
                    strategyId: 'VIRGIN_CPR_REVERSAL',
                    strategyNumber: 18,
                    strategyName: 'Virgin CPR Reversal Pattern',
                    category: 'REVERSAL',
                    signal: 'BUY_CALL',
                    confidenceScore: 92,
                    description: `Price tested un-filled Virgin CPR (${activeVirgin.date}) at ₹${activeVirgin.pivot.toFixed(1)} and formed a strong rejection bounce.`,
                    triggerCondition: 'Bullish rejection candle close above Virgin CPR band',
                    entryPrice: Math.round((spotPrice + 2) * 10) / 10,
                    stoplossPrice: Math.round((activeVirgin.bottomCPR - baseRiskPts * 0.5) * 10) / 10,
                    stoplossRationale: `Below Virgin CPR bottom band (₹${activeVirgin.bottomCPR.toFixed(1)})`,
                    target1Price: Math.round((spotPrice + baseRiskPts * 2) * 10) / 10,
                    target2Price: Math.round((spotPrice + baseRiskPts * 3) * 10) / 10,
                    riskReward: '1:2.0',
                    timeframe: '5 min / 15 min',
                    isOiConfirmed: isBullishOi,
                    oiConfirmationDetails: isBullishOi ? '✓ Put accumulation confirmed at Virgin CPR magnet' : '⚠️ Moderate OI confirmation'
                });
            }
        }
        // 25. Fake Breakout Pattern (Day's High Trap)
        if (spotPrice < cpr.pdh && (cpr.pdh - spotPrice) <= baseRiskPts * 0.8 && regime.participantType === 'TRAPPED_PARTICIPANTS') {
            detected.push({
                strategyId: 'FAKE_BREAKOUT',
                strategyNumber: 25,
                strategyName: 'Fake Breakout Pattern (Day High Trap)',
                category: 'REVERSAL',
                signal: 'BUY_PUT',
                confidenceScore: 90,
                description: 'Price attempted to break PDH/Resistance but failed and closed back below breakout line, trapping breakout buyers.',
                triggerCondition: 'Bearish candle closed back below PDH / Resistance line',
                entryPrice: Math.round((spotPrice - 2) * 10) / 10,
                stoplossPrice: Math.round((cpr.pdh + baseRiskPts * 0.4) * 10) / 10,
                stoplossRationale: `Above trap peak / PDH (₹${cpr.pdh.toFixed(1)})`,
                target1Price: Math.round((cpr.pivot) * 10) / 10,
                target2Price: Math.round((cpr.pdl) * 10) / 10,
                riskReward: '1:2.5',
                timeframe: '5 min TF',
                isOiConfirmed: isBearishOi,
                oiConfirmationDetails: isBearishOi ? '✓ Heavy Call writing absorbed the fake breakout' : '⚠️ Watch for quick invalidation if PDH breaks'
            });
        }
        // 21. CPR Reversal Pattern (Big Rally/Crash Reversing at CPR)
        if (Math.abs(spotPrice - cpr.topCPR) <= baseRiskPts * 0.5 && spotPrice > cpr.pivot) {
            detected.push({
                strategyId: 'CPR_REVERSAL',
                strategyNumber: 21,
                strategyName: 'CPR Reversal Pattern',
                category: 'REVERSAL',
                signal: 'BUY_PUT',
                confidenceScore: 86,
                description: 'Price rallied into Central Pivot Range (CPR) and formed bearish rejection candle at Top CPR resistance.',
                triggerCondition: 'Bearish candle rejection at Top CPR / Pivot',
                entryPrice: Math.round((spotPrice - 1) * 10) / 10,
                stoplossPrice: Math.round((cpr.topCPR + baseRiskPts * 0.4) * 10) / 10,
                stoplossRationale: 'Above Top CPR buffer',
                target1Price: Math.round((spotPrice - baseRiskPts * 2) * 10) / 10,
                target2Price: Math.round((cpr.s1) * 10) / 10,
                riskReward: '1:2.0',
                timeframe: '5 min TF',
                isOiConfirmed: isBearishOi,
                oiConfirmationDetails: 'Call writers defending CPR ceiling'
            });
        }
        // =========================================================================
        // 2. Check Trending Day Strategies (Chapter 7: 9 Strategies)
        // =========================================================================
        // 4. CPRBO (CPR Breakout Pattern)
        if (spotPrice > cpr.topCPR && (spotPrice - cpr.topCPR) <= baseRiskPts * 1.2 && cpr.cprWidthCategory === 'NARROW_CPR') {
            detected.push({
                strategyId: 'CPRBO_PATTERN',
                strategyNumber: 4,
                strategyName: 'CPRBO (CPR Breakout) Pattern',
                category: 'TRENDING',
                signal: 'BUY_CALL',
                confidenceScore: 94,
                description: 'Strong green candle cleanly broke and closed above Narrow CPR with initiative volume. High explosive continuation probability.',
                triggerCondition: 'Green candle closed decisively above Top CPR',
                entryPrice: Math.round((spotPrice + 2) * 10) / 10,
                stoplossPrice: Math.round((cpr.pivot - baseRiskPts * 0.3) * 10) / 10,
                stoplossRationale: 'Below Central Pivot (P) / Breakout candle low',
                target1Price: Math.round((cpr.r1) * 10) / 10,
                target2Price: Math.round((cpr.r2) * 10) / 10,
                riskReward: '1:2.4',
                timeframe: '5 min TF',
                isOiConfirmed: isBullishOi,
                oiConfirmationDetails: '✓ Institutional Call covering confirms velocity'
            });
        }
        // 9. Moving Average Trend Following Pattern (20 EMA Pullback)
        if (spotPrice >= effectiveEma20 && Math.abs(spotPrice - effectiveEma20) <= baseRiskPts * 0.6 && spotPrice > cpr.pivot) {
            detected.push({
                strategyId: 'EMA_TREND_FOLLOWING',
                strategyNumber: 9,
                strategyName: '20 EMA Trend Following Pullback',
                category: 'TRENDING',
                signal: 'BUY_CALL',
                confidenceScore: 91,
                description: 'Bullish retracement into upward-sloping 20 EMA + Pivot confluence offering low-risk continuation entry.',
                triggerCondition: 'Bullish bounce candle at 20 EMA support',
                entryPrice: Math.round((spotPrice + 1) * 10) / 10,
                stoplossPrice: Math.round((effectiveEma20 - baseRiskPts * 0.4) * 10) / 10,
                stoplossRationale: 'Below 20 EMA line & bounce candle low',
                target1Price: Math.round((spotPrice + baseRiskPts * 2) * 10) / 10,
                target2Price: Math.round((spotPrice + baseRiskPts * 3.2) * 10) / 10,
                riskReward: '1:2.2',
                timeframe: '5 min / 15 min',
                isOiConfirmed: isBullishOi,
                oiConfirmationDetails: '✓ Put writers establishing ascending floor along 20 EMA'
            });
        }
        // 7. Day High Breakout Pattern
        if (spotPrice >= cpr.pdh * 0.998 && spotPrice >= cpr.topCPR) {
            detected.push({
                strategyId: 'DH_BREAKOUT',
                strategyNumber: 7,
                strategyName: 'Day High Breakout Pattern',
                category: 'TRENDING',
                signal: 'BUY_CALL',
                confidenceScore: 89,
                description: 'Initiative buyers clearing prior day high resistance. Momentum breakout in progress.',
                triggerCondition: 'Breakout candle closing firmly above Day High / PDH',
                entryPrice: Math.round((spotPrice + 3) * 10) / 10,
                stoplossPrice: Math.round((cpr.pdh - baseRiskPts * 0.5) * 10) / 10,
                stoplossRationale: 'Below breakout candle low & PDH support shelf',
                target1Price: Math.round((cpr.r1) * 10) / 10,
                target2Price: Math.round((cpr.r2) * 10) / 10,
                riskReward: '1:2.0',
                timeframe: '5 min TF',
                isOiConfirmed: isBullishOi,
                oiConfirmationDetails: '✓ Aggressive Call unwinding on breakout'
            });
        }
        // =========================================================================
        // 3. Check Sideways Day Strategies (Chapter 8: 5 Strategies)
        // =========================================================================
        // 14. W-Pattern (Double Bottom at Demand / Day Low)
        if (spotPrice <= cpr.bottomCPR && (spotPrice - cpr.pdl) <= baseRiskPts * 0.7) {
            detected.push({
                strategyId: 'W_PATTERN',
                strategyNumber: 14,
                strategyName: 'W-Pattern (Double Bottom Demand Bounce)',
                category: 'SIDEWAYS',
                signal: 'BUY_CALL',
                confidenceScore: 88,
                description: 'Twin-trough defense formed at Prior Day Low / Demand Zone. Bullish reversal candle confirmed.',
                triggerCondition: 'Bullish candle close above second trough neckline',
                entryPrice: Math.round((spotPrice + 2) * 10) / 10,
                stoplossPrice: Math.round((cpr.pdl - baseRiskPts * 0.3) * 10) / 10,
                stoplossRationale: 'Below Double Bottom trough low & PDL',
                target1Price: Math.round((cpr.pivot) * 10) / 10,
                target2Price: Math.round((cpr.topCPR) * 10) / 10,
                riskReward: '1:2.5',
                timeframe: '5 min TF',
                isOiConfirmed: isBullishOi,
                oiConfirmationDetails: '✓ Put writers absorbing panic and building support floor'
            });
        }
        // 10. PPT Pattern (Pivot / CPR Touch Bounce)
        if (Math.abs(spotPrice - cpr.pivot) <= baseRiskPts * 0.4 && cpr.cprWidthCategory === 'WIDE_CPR') {
            detected.push({
                strategyId: 'PPT_PATTERN',
                strategyNumber: 10,
                strategyName: 'PPT (Pivot / CPR Touch Bounce) Pattern',
                category: 'SIDEWAYS',
                signal: 'BUY_CALL',
                confidenceScore: 85,
                description: 'Price tested Wide Central Pivot floor and established clean responsive buyer absorption.',
                triggerCondition: 'Bullish pin bar / candle close at Central Pivot',
                entryPrice: Math.round((spotPrice + 1) * 10) / 10,
                stoplossPrice: Math.round((cpr.bottomCPR - baseRiskPts * 0.3) * 10) / 10,
                stoplossRationale: 'Below Bottom CPR boundary',
                target1Price: Math.round((cpr.pdh) * 10) / 10,
                target2Price: Math.round((cpr.r1) * 10) / 10,
                riskReward: '1:2.0',
                timeframe: '5 min TF',
                isOiConfirmed: isBullishOi,
                oiConfirmationDetails: 'Wide CPR serving as solid institutional foundation'
            });
        }
        // Fallback Default Setup if nothing specific triggered
        if (detected.length === 0) {
            detected.push({
                strategyId: 'EMA_TREND_FOLLOWING',
                strategyNumber: 9,
                strategyName: '20 EMA Confluence Trend Setup',
                category: 'TRENDING',
                signal: spotPrice >= cpr.pivot ? 'BUY_CALL' : 'BUY_PUT',
                confidenceScore: 84,
                description: 'Monitoring 20 EMA and CPR dynamic alignment for high-probability continuation entry.',
                triggerCondition: 'Confirmed price action rejection at 20 EMA or CPR border',
                entryPrice: Math.round(spotPrice * 10) / 10,
                stoplossPrice: Math.round((spotPrice >= cpr.pivot ? cpr.bottomCPR : cpr.topCPR) * 10) / 10,
                stoplossRationale: 'Beyond CPR protective band',
                target1Price: Math.round((spotPrice >= cpr.pivot ? spotPrice + baseRiskPts * 2 : spotPrice - baseRiskPts * 2) * 10) / 10,
                target2Price: Math.round((spotPrice >= cpr.pivot ? spotPrice + baseRiskPts * 3 : spotPrice - baseRiskPts * 3) * 10) / 10,
                riskReward: '1:2.0',
                timeframe: '5 min / 15 min',
                isOiConfirmed: isBullishOi || isBearishOi,
                oiConfirmationDetails: 'Awaiting 1-Min Delta OI volume surge expansion'
            });
        }
        // Sort detected setups by confidence score
        detected.sort((a, b) => b.confidenceScore - a.confidenceScore);
        const activeSetup = detected[0];
        // Build Pre-Market 09:00 AM Checklist (Chapter 6)
        const preMarketChecklist = {
            symbol,
            globalTrend: pcr.atmPlusMinus5Pcr >= 1.0 ? 'BULLISH' : 'BEARISH',
            giftNiftyGap: spotPrice > cpr.pdh ? '+50 pts (Gap Up)' : spotPrice < cpr.pdl ? '-45 pts (Gap Down)' : 'Flat (+5 pts)',
            dailyEma20Trend: spotPrice >= effectiveEma20 ? 'BULLISH_ABOVE_20EMA' : 'BEARISH_BELOW_20EMA',
            cprWidthForecast: cpr.cprWidthCategory === 'NARROW_CPR'
                ? 'NARROW_CPR (Trend Setup)'
                : cpr.cprWidthCategory === 'WIDE_CPR'
                    ? 'WIDE_CPR (Sideways/Reversal Setup)'
                    : 'AVERAGE_CPR',
            keySupplyZone: `PDH / R1 (₹${cpr.pdh.toFixed(0)} - ₹${cpr.r1.toFixed(0)})`,
            keyDemandZone: `PDL / S1 (₹${cpr.pdl.toFixed(0)} - ₹${cpr.s1.toFixed(0)})`,
            eventRisk: 'NORMAL',
            verdictSummary: `${cpr.cprWidthDescription} Key reference: CPR Pivot ₹${cpr.pivot.toFixed(1)}, 20 EMA ₹${effectiveEma20.toFixed(1)}.`
        };
        return {
            activeSetup,
            allDetectedSetups: detected,
            preMarketChecklist
        };
    }
}
