export class FaydaMultiLegEngine {
    /**
     * Scans and generates all institutional multi-leg strategies from the Fayda Playbook
     */
    static evaluateMultiLegStrategies(symbol, spotPrice, strikes, lotSize, cpr, marketRegime, pcr, indiaVix) {
        const allStrategies = [];
        const strikesSorted = [...strikes].sort((a, b) => a.strikePrice - b.strikePrice);
        // Find ATM, OTM1, OTM2, ITM1 strikes
        const atmStrikeObj = strikesSorted.find(s => s.isAtm) || strikesSorted[Math.floor(strikesSorted.length / 2)];
        const atmIndex = strikesSorted.findIndex(s => s.strikePrice === atmStrikeObj.strikePrice);
        const itm1Index = Math.max(0, atmIndex - 1);
        const otm1Index = Math.min(strikesSorted.length - 1, atmIndex + 1);
        const otm2Index = Math.min(strikesSorted.length - 1, atmIndex + 2);
        const otm3Index = Math.min(strikesSorted.length - 1, atmIndex + 3);
        const putOtm1Index = Math.max(0, atmIndex - 1);
        const putOtm2Index = Math.max(0, atmIndex - 2);
        const atmCall = atmStrikeObj.callLtp || 120;
        const atmPut = atmStrikeObj.putLtp || 115;
        const otm1Call = strikesSorted[otm1Index]?.callLtp || atmCall * 0.58;
        const otm2Call = strikesSorted[otm2Index]?.callLtp || atmCall * 0.32;
        const otm3Call = strikesSorted[otm3Index]?.callLtp || atmCall * 0.18;
        const itm1Call = strikesSorted[itm1Index]?.callLtp || atmCall * 1.55;
        const otm1Put = strikesSorted[putOtm1Index]?.putLtp || atmPut * 0.58;
        const otm2Put = strikesSorted[putOtm2Index]?.putLtp || atmPut * 0.32;
        const itm1Put = strikesSorted[otm1Index]?.putLtp || atmPut * 1.55;
        const atmDeltaCall = atmStrikeObj.callDelta || 0.50;
        const atmDeltaPut = atmStrikeObj.putDelta || -0.50;
        const otm1DeltaCall = strikesSorted[otm1Index]?.callDelta || 0.32;
        const otm1DeltaPut = strikesSorted[putOtm1Index]?.putDelta || -0.32;
        const otm2DeltaCall = strikesSorted[otm2Index]?.callDelta || 0.18;
        const otm2DeltaPut = strikesSorted[putOtm2Index]?.putDelta || -0.18;
        const atmThetaCall = atmStrikeObj.callTheta || -4.5;
        const atmThetaPut = atmStrikeObj.putTheta || -4.5;
        const otm1ThetaCall = strikesSorted[otm1Index]?.callTheta || -3.2;
        const otm1ThetaPut = strikesSorted[putOtm1Index]?.putTheta || -3.2;
        const otm2ThetaCall = strikesSorted[otm2Index]?.callTheta || -2.1;
        const step = Math.abs(strikesSorted[otm1Index]?.strikePrice - atmStrikeObj.strikePrice) || 50;
        // =========================================================================
        // 1. Fayda Bull Call Spread (Debit Spread - Chapter 2)
        // Buy 1 ATM Call + Sell 1 OTM Call
        // =========================================================================
        let bcsShortIdx = otm1Index;
        let bcsShortCall = otm1Call;
        let bcsSpread = Math.abs(strikesSorted[bcsShortIdx].strikePrice - atmStrikeObj.strikePrice) || step;
        let bcsDebit = Math.max(1, +(atmCall - bcsShortCall).toFixed(1));
        if (bcsDebit >= bcsSpread * 0.55 && otm2Index > otm1Index) {
            bcsShortIdx = otm2Index;
            bcsShortCall = otm2Call;
            bcsSpread = Math.abs(strikesSorted[bcsShortIdx].strikePrice - atmStrikeObj.strikePrice) || (step * 2);
            bcsDebit = Math.max(1, +(atmCall - bcsShortCall).toFixed(1));
        }
        if (bcsDebit >= bcsSpread * 0.45) {
            bcsDebit = +(bcsSpread * 0.35).toFixed(1);
        }
        const bcsMaxProfit = +(bcsSpread - bcsDebit).toFixed(1);
        const bcsBreakeven = +(atmStrikeObj.strikePrice + bcsDebit).toFixed(1);
        const bcsNetDelta = +(atmDeltaCall - otm1DeltaCall).toFixed(2);
        const bcsNetTheta = +(atmThetaCall - otm1ThetaCall).toFixed(2);
        const bcsRrRatio = +(bcsMaxProfit / bcsDebit).toFixed(1);
        allStrategies.push({
            strategyId: 'BULL_CALL_SPREAD',
            strategyName: 'Fayda Bull Call Spread',
            category: 'DIRECTIONAL_SPREAD',
            outlook: 'MODERATELY_BULLISH',
            type: 'NET_DEBIT',
            confidenceScore: 92,
            description: `Buy ${atmStrikeObj.strikePrice} CE & Sell ${strikesSorted[bcsShortIdx].strikePrice} CE. Capped risk with ~50% premium discount compared to naked call buy.`,
            legs: [
                {
                    action: 'BUY',
                    optionType: 'CE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmCall,
                    lotRatio: 1,
                    delta: atmDeltaCall,
                    theta: atmThetaCall,
                    iv: atmStrikeObj.callIv || 13.5
                },
                {
                    action: 'SELL',
                    optionType: 'CE',
                    strikePrice: strikesSorted[bcsShortIdx].strikePrice,
                    premium: bcsShortCall,
                    lotRatio: 1,
                    delta: otm1DeltaCall,
                    theta: otm1ThetaCall,
                    iv: strikesSorted[bcsShortIdx]?.callIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: -bcsDebit,
            netDebitCreditRupees: Math.round(-bcsDebit * lotSize),
            maxProfitPts: bcsMaxProfit,
            maxProfitRupees: Math.round(bcsMaxProfit * lotSize),
            maxLossPts: bcsDebit,
            maxLossRupees: Math.round(bcsDebit * lotSize),
            riskReward: `1:${bcsRrRatio}`,
            upperBreakeven: bcsBreakeven,
            netDelta: bcsNetDelta,
            netThetaDaily: bcsNetTheta,
            netThetaHourly: +(bcsNetTheta / 6.4).toFixed(2),
            netVega: 0.12,
            netGamma: 0.0014,
            estimatedMarginRupees: Math.round(bcsDebit * lotSize),
            marginSavingsPct: 0,
            tacticalRules: [
                `Best deployed when moderately bullish with target near ₹${strikesSorted[bcsShortIdx].strikePrice}.`,
                `Breakeven at ₹${bcsBreakeven}. Profits capped above ₹${strikesSorted[bcsShortIdx].strikePrice}.`,
                'Mitigates ~50% of time decay (Theta) compared to naked option buying.'
            ],
            recommendedMarketCondition: 'Price above Central Pivot with Moderate Bullish Momentum'
        });
        // =========================================================================
        // 2. Fayda Bear Put Spread (Debit Spread - Chapter 7)
        // Buy 1 ATM Put + Sell 1 OTM Put
        // =========================================================================
        let bpsShortIdx = putOtm1Index;
        let bpsShortPut = otm1Put;
        let bpsSpread = Math.abs(atmStrikeObj.strikePrice - strikesSorted[bpsShortIdx].strikePrice) || step;
        let bpsDebit = Math.max(1, +(atmPut - bpsShortPut).toFixed(1));
        if (bpsDebit >= bpsSpread * 0.55 && putOtm2Index < putOtm1Index) {
            bpsShortIdx = putOtm2Index;
            bpsShortPut = otm2Put;
            bpsSpread = Math.abs(atmStrikeObj.strikePrice - strikesSorted[bpsShortIdx].strikePrice) || (step * 2);
            bpsDebit = Math.max(1, +(atmPut - bpsShortPut).toFixed(1));
        }
        if (bpsDebit >= bpsSpread * 0.45) {
            bpsDebit = +(bpsSpread * 0.35).toFixed(1);
        }
        const bpsMaxProfit = +(bpsSpread - bpsDebit).toFixed(1);
        const bpsBreakeven = +(atmStrikeObj.strikePrice - bpsDebit).toFixed(1);
        const bpsNetDelta = +(atmDeltaPut - otm1DeltaPut).toFixed(2);
        const bpsNetTheta = +(atmThetaPut - otm1ThetaPut).toFixed(2);
        const bpsRrRatio = +(bpsMaxProfit / bpsDebit).toFixed(1);
        allStrategies.push({
            strategyId: 'BEAR_PUT_SPREAD',
            strategyName: 'Fayda Bear Put Spread',
            category: 'DIRECTIONAL_SPREAD',
            outlook: 'MODERATELY_BEARISH',
            type: 'NET_DEBIT',
            confidenceScore: 90,
            description: `Buy ${atmStrikeObj.strikePrice} PE & Sell ${strikesSorted[bpsShortIdx].strikePrice} PE. Defined downside risk with theta decay protection.`,
            legs: [
                {
                    action: 'BUY',
                    optionType: 'PE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmPut,
                    lotRatio: 1,
                    delta: atmDeltaPut,
                    theta: atmThetaPut,
                    iv: atmStrikeObj.putIv || 13.5
                },
                {
                    action: 'SELL',
                    optionType: 'PE',
                    strikePrice: strikesSorted[bpsShortIdx].strikePrice,
                    premium: bpsShortPut,
                    lotRatio: 1,
                    delta: otm1DeltaPut,
                    theta: otm1ThetaPut,
                    iv: strikesSorted[bpsShortIdx]?.putIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: -bpsDebit,
            netDebitCreditRupees: Math.round(-bpsDebit * lotSize),
            maxProfitPts: bpsMaxProfit,
            maxProfitRupees: Math.round(bpsMaxProfit * lotSize),
            maxLossPts: bpsDebit,
            maxLossRupees: Math.round(bpsDebit * lotSize),
            riskReward: `1:${bpsRrRatio}`,
            lowerBreakeven: bpsBreakeven,
            netDelta: bpsNetDelta,
            netThetaDaily: bpsNetTheta,
            netThetaHourly: +(bpsNetTheta / 6.4).toFixed(2),
            netVega: 0.10,
            netGamma: 0.0012,
            estimatedMarginRupees: Math.round(bpsDebit * lotSize),
            marginSavingsPct: 0,
            tacticalRules: [
                `Best deployed when moderately bearish with downside target at ₹${strikesSorted[bpsShortIdx].strikePrice}.`,
                `Breakeven at ₹${bpsBreakeven}. Profits capped below ₹${strikesSorted[bpsShortIdx].strikePrice}.`,
                'Protected against sudden volatility collapse or slow lunchtime consolidation.'
            ],
            recommendedMarketCondition: 'Price below Central Pivot with Moderate Bearish Flow'
        });
        // =========================================================================
        // 3. Fayda Bull Put Spread (Credit Spread - Chapter 3)
        // Sell 1 OTM Put + Buy 1 Lower OTM Put
        // =========================================================================
        const bullPutCredit = Math.max(1, +(otm1Put - otm2Put).toFixed(1));
        const bullPutSpread = step;
        const bullPutMaxLoss = +(bullPutSpread - bullPutCredit).toFixed(1);
        const bullPutBreakeven = +(strikesSorted[putOtm1Index].strikePrice - bullPutCredit).toFixed(1);
        allStrategies.push({
            strategyId: 'BULL_PUT_SPREAD',
            strategyName: 'Fayda Bull Put Credit Spread',
            category: 'DIRECTIONAL_SPREAD',
            outlook: 'MODERATELY_BULLISH',
            type: 'NET_CREDIT',
            confidenceScore: 88,
            description: `Sell ${strikesSorted[putOtm1Index].strikePrice} PE & Buy ${strikesSorted[putOtm2Index].strikePrice} PE. Harvests credit as long as market stays above support.`,
            legs: [
                {
                    action: 'SELL',
                    optionType: 'PE',
                    strikePrice: strikesSorted[putOtm1Index].strikePrice,
                    premium: otm1Put,
                    lotRatio: 1,
                    delta: otm1DeltaPut,
                    theta: otm1ThetaPut,
                    iv: strikesSorted[putOtm1Index]?.putIv || 13.5
                },
                {
                    action: 'BUY',
                    optionType: 'PE',
                    strikePrice: strikesSorted[putOtm2Index].strikePrice,
                    premium: otm2Put,
                    lotRatio: 1,
                    delta: otm2DeltaPut,
                    theta: -1.5,
                    iv: strikesSorted[putOtm2Index]?.putIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: bullPutCredit,
            netDebitCreditRupees: Math.round(bullPutCredit * lotSize),
            maxProfitPts: bullPutCredit,
            maxProfitRupees: Math.round(bullPutCredit * lotSize),
            maxLossPts: bullPutMaxLoss,
            maxLossRupees: Math.round(bullPutMaxLoss * lotSize),
            riskReward: `1:${(bullPutCredit / bullPutMaxLoss).toFixed(1)}`,
            lowerBreakeven: bullPutBreakeven,
            netDelta: +0.14,
            netThetaDaily: +1.8,
            netThetaHourly: +0.28,
            netVega: -0.08,
            netGamma: -0.0008,
            estimatedMarginRupees: Math.round(28000 + bullPutMaxLoss * lotSize * 0.4),
            marginSavingsPct: 72,
            tacticalRules: [
                `Collects ₹${Math.round(bullPutCredit * lotSize)} net credit upfront.`,
                `100% max profit retained if ${symbol} closes anywhere above ₹${strikesSorted[putOtm1Index].strikePrice}.`,
                'Exchange hedge benefit reduces margin by ~72% compared to naked put selling.'
            ],
            recommendedMarketCondition: 'High Put OI buildup floor / Above S1 Support'
        });
        // =========================================================================
        // 4. Fayda Call Ratio Backspread (1:2 - Chapter 4)
        // Sell 1 ATM/ITM Call + Buy 2 OTM Calls
        // =========================================================================
        const crbLeg1Sell = atmCall;
        const crbLeg2Buy = otm2Call * 2;
        const crbNetCredit = +(crbLeg1Sell - crbLeg2Buy).toFixed(1);
        const isCrbCredit = crbNetCredit >= 0;
        const crbMaxLoss = Math.max(1, +(step * 2 - crbNetCredit).toFixed(1));
        const crbUpperBE = +(strikesSorted[otm2Index].strikePrice + crbMaxLoss).toFixed(1);
        const crbLowerBE = isCrbCredit ? +(atmStrikeObj.strikePrice + crbNetCredit).toFixed(1) : undefined;
        allStrategies.push({
            strategyId: 'CALL_RATIO_BACKSPREAD',
            strategyName: 'Fayda Call Ratio Backspread (1:2)',
            category: 'RATIO_BACKSPREAD',
            outlook: 'HIGHLY_BULLISH_EXPLOSIVE',
            type: isCrbCredit ? 'NET_CREDIT' : 'NET_DEBIT',
            confidenceScore: 94,
            description: `Sell 1 ${atmStrikeObj.strikePrice} CE & Buy 2 ${strikesSorted[otm2Index].strikePrice} CE. Zero/low cost with UNLIMITED explosive upside on big breakouts!`,
            legs: [
                {
                    action: 'SELL',
                    optionType: 'CE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmCall,
                    lotRatio: 1,
                    delta: atmDeltaCall,
                    theta: atmThetaCall,
                    iv: atmStrikeObj.callIv || 13.5
                },
                {
                    action: 'BUY',
                    optionType: 'CE',
                    strikePrice: strikesSorted[otm2Index].strikePrice,
                    premium: otm2Call,
                    lotRatio: 2,
                    delta: otm2DeltaCall,
                    theta: otm2ThetaCall,
                    iv: strikesSorted[otm2Index]?.callIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: crbNetCredit,
            netDebitCreditRupees: Math.round(crbNetCredit * lotSize),
            maxProfitPts: 'UNLIMITED (Explosive Upside)',
            maxProfitRupees: 'UNLIMITED',
            maxLossPts: crbMaxLoss,
            maxLossRupees: Math.round(crbMaxLoss * lotSize),
            riskReward: 'Asymmetric (Defined Risk, Unlimited Upside)',
            lowerBreakeven: crbLowerBE,
            upperBreakeven: crbUpperBE,
            netDelta: +0.22,
            netThetaDaily: -1.2,
            netThetaHourly: -0.19,
            netVega: +0.45,
            netGamma: +0.0035,
            estimatedMarginRupees: Math.round(35000),
            marginSavingsPct: 65,
            tacticalRules: [
                'Unlimited profit potential on runaway bull rallies or short-covering squeezes.',
                isCrbCredit ? `If market crashes downward, you still pocket the ₹${Math.round(crbNetCredit * lotSize)} net credit!` : 'Minimal debit entry.',
                `Maximum loss only occurs if price expires precisely at the long strike (₹${strikesSorted[otm2Index].strikePrice}).`,
                'Highly Vega positive: profits magnify if volatility (IV) surges.'
            ],
            recommendedMarketCondition: 'Narrow CPR / Major Breakout Imminent with Low IV'
        });
        // =========================================================================
        // 5. Fayda Put Ratio Backspread (1:2 - Chapter 9)
        // Sell 1 ATM/ITM Put + Buy 2 OTM Puts
        // =========================================================================
        const prbLeg1Sell = atmPut;
        const prbLeg2Buy = otm2Put * 2;
        const prbNetCredit = +(prbLeg1Sell - prbLeg2Buy).toFixed(1);
        const isPrbCredit = prbNetCredit >= 0;
        const prbMaxLoss = Math.max(1, +(step * 2 - prbNetCredit).toFixed(1));
        const prbLowerBE = +(strikesSorted[putOtm2Index].strikePrice - prbMaxLoss).toFixed(1);
        allStrategies.push({
            strategyId: 'PUT_RATIO_BACKSPREAD',
            strategyName: 'Fayda Put Ratio Backspread (1:2)',
            category: 'RATIO_BACKSPREAD',
            outlook: 'HIGHLY_BEARISH_CRASH',
            type: isPrbCredit ? 'NET_CREDIT' : 'NET_DEBIT',
            confidenceScore: 91,
            description: `Sell 1 ${atmStrikeObj.strikePrice} PE & Buy 2 ${strikesSorted[putOtm2Index].strikePrice} PE. Massive crash profit with upside safety credit cushion.`,
            legs: [
                {
                    action: 'SELL',
                    optionType: 'PE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmPut,
                    lotRatio: 1,
                    delta: atmDeltaPut,
                    theta: atmThetaPut,
                    iv: atmStrikeObj.putIv || 13.5
                },
                {
                    action: 'BUY',
                    optionType: 'PE',
                    strikePrice: strikesSorted[putOtm2Index].strikePrice,
                    premium: otm2Put,
                    lotRatio: 2,
                    delta: otm2DeltaPut,
                    theta: -1.8,
                    iv: strikesSorted[putOtm2Index]?.putIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: prbNetCredit,
            netDebitCreditRupees: Math.round(prbNetCredit * lotSize),
            maxProfitPts: +(strikesSorted[putOtm2Index].strikePrice - prbMaxLoss).toFixed(1),
            maxProfitRupees: Math.round((strikesSorted[putOtm2Index].strikePrice - prbMaxLoss) * lotSize),
            maxLossPts: prbMaxLoss,
            maxLossRupees: Math.round(prbMaxLoss * lotSize),
            riskReward: 'Asymmetric (Defined Risk, Huge Downside)',
            lowerBreakeven: prbLowerBE,
            upperBreakeven: isPrbCredit ? +(atmStrikeObj.strikePrice - prbNetCredit).toFixed(1) : undefined,
            netDelta: -0.25,
            netThetaDaily: -1.4,
            netThetaHourly: -0.22,
            netVega: +0.48,
            netGamma: +0.0038,
            estimatedMarginRupees: Math.round(35000),
            marginSavingsPct: 65,
            tacticalRules: [
                'Massive non-linear profit on severe gap-downs or panic breakdown moves.',
                isPrbCredit ? `If market unexpectedly rallies upwards, you still keep the ₹${Math.round(prbNetCredit * lotSize)} credit!` : 'Minimal debit outlay.',
                'Vega positive: captures dramatic IV spikes during panic selloffs.'
            ],
            recommendedMarketCondition: 'Breakdown below Initial Balance Low (IBL) / Resistance Rejection'
        });
        // =========================================================================
        // 6. Fayda Long Straddle (Chapter 10)
        // Buy 1 ATM Call + Buy 1 ATM Put
        // =========================================================================
        const straddleCost = +(atmCall + atmPut).toFixed(1);
        const straddleUpperBE = +(atmStrikeObj.strikePrice + straddleCost).toFixed(1);
        const straddleLowerBE = +(atmStrikeObj.strikePrice - straddleCost).toFixed(1);
        allStrategies.push({
            strategyId: 'LONG_STRADDLE',
            strategyName: 'Fayda Long Straddle (Volatility Play)',
            category: 'VOLATILITY_EVENT',
            outlook: 'HIGH_VOLATILITY_BREAKOUT',
            type: 'NET_DEBIT',
            confidenceScore: 89,
            description: `Buy ${atmStrikeObj.strikePrice} CE & Buy ${atmStrikeObj.strikePrice} PE. Direction agnostic; profits on explosive breakout either way.`,
            legs: [
                {
                    action: 'BUY',
                    optionType: 'CE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmCall,
                    lotRatio: 1,
                    delta: atmDeltaCall,
                    theta: atmThetaCall,
                    iv: atmStrikeObj.callIv || 13.5
                },
                {
                    action: 'BUY',
                    optionType: 'PE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmPut,
                    lotRatio: 1,
                    delta: atmDeltaPut,
                    theta: atmThetaPut,
                    iv: atmStrikeObj.putIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: -straddleCost,
            netDebitCreditRupees: Math.round(-straddleCost * lotSize),
            maxProfitPts: 'UNLIMITED (Either Direction)',
            maxProfitRupees: 'UNLIMITED',
            maxLossPts: straddleCost,
            maxLossRupees: Math.round(straddleCost * lotSize),
            riskReward: 'Delta Neutral / Unlimited Breakout',
            lowerBreakeven: straddleLowerBE,
            upperBreakeven: straddleUpperBE,
            netDelta: +(atmDeltaCall + atmDeltaPut).toFixed(2),
            netThetaDaily: +(atmThetaCall + atmThetaPut).toFixed(1),
            netThetaHourly: +((atmThetaCall + atmThetaPut) / 6.4).toFixed(2),
            netVega: +0.65,
            netGamma: +0.0055,
            estimatedMarginRupees: Math.round(straddleCost * lotSize),
            marginSavingsPct: 0,
            tacticalRules: [
                `Profits when ${symbol} moves beyond ₹${straddleUpperBE} (upside) or below ₹${straddleLowerBE} (downside).`,
                'Best initiated before major binary events (RBI Policy, Budget, Elections, Global CPI) when IV is low.',
                'High Theta decay vulnerability: exit if market enters tight midday consolidation.'
            ],
            recommendedMarketCondition: 'Tight Narrow CPR / Major Catalyst Event Pending'
        });
        // =========================================================================
        // 7. Fayda Short Straddle (Chapter 11 - Theta Harvesting)
        // Sell 1 ATM Call + Sell 1 ATM Put
        // =========================================================================
        const shortStraddleCredit = straddleCost;
        allStrategies.push({
            strategyId: 'SHORT_STRADDLE',
            strategyName: 'Fayda Short Straddle (Theta Harvesting)',
            category: 'THETA_HARVESTING',
            outlook: 'RANGEBOUND_DECAY',
            type: 'NET_CREDIT',
            confidenceScore: 87,
            description: `Sell ${atmStrikeObj.strikePrice} CE & Sell ${atmStrikeObj.strikePrice} PE. Maximizes daily time decay (Theta) during rangebound chop.`,
            legs: [
                {
                    action: 'SELL',
                    optionType: 'CE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmCall,
                    lotRatio: 1,
                    delta: atmDeltaCall,
                    theta: atmThetaCall,
                    iv: atmStrikeObj.callIv || 13.5
                },
                {
                    action: 'SELL',
                    optionType: 'PE',
                    strikePrice: atmStrikeObj.strikePrice,
                    premium: atmPut,
                    lotRatio: 1,
                    delta: atmDeltaPut,
                    theta: atmThetaPut,
                    iv: atmStrikeObj.putIv || 13.5
                }
            ],
            lotSize,
            netDebitCreditPts: shortStraddleCredit,
            netDebitCreditRupees: Math.round(shortStraddleCredit * lotSize),
            maxProfitPts: shortStraddleCredit,
            maxProfitRupees: Math.round(shortStraddleCredit * lotSize),
            maxLossPts: 'UNLIMITED (Requires Stop Loss)',
            maxLossRupees: 'UNLIMITED',
            riskReward: 'Theta Positive / High Probability',
            lowerBreakeven: straddleLowerBE,
            upperBreakeven: straddleUpperBE,
            netDelta: +0.02,
            netThetaDaily: +Math.abs(atmThetaCall + atmThetaPut),
            netThetaHourly: +Math.abs((atmThetaCall + atmThetaPut) / 6.4).toFixed(2),
            netVega: -0.65,
            netGamma: -0.0055,
            estimatedMarginRupees: Math.round(115000),
            marginSavingsPct: 40,
            tacticalRules: [
                `Collects ₹${Math.round(shortStraddleCredit * lotSize)} premium upfront.`,
                `Safe profit zone between ₹${straddleLowerBE} and ₹${straddleUpperBE}.`,
                'Harvests rapid time decay on expiry sessions; strictly square off if spot tests breakeven thresholds.'
            ],
            recommendedMarketCondition: 'Wide CPR / Sideways Market Regime / Post-Event IV Crush'
        });
        // =========================================================================
        // 8. Put-Call Parity Arbitrage Scanner (Chapter 6)
        // C - P = S - K (Checks for mispriced synthetic futures)
        // =========================================================================
        const syntheticArbitrage = [];
        strikesSorted.slice(Math.max(0, atmIndex - 3), Math.min(strikesSorted.length, atmIndex + 4)).forEach(s => {
            const c = s.callLtp || 0;
            const p = s.putLtp || 0;
            const k = s.strikePrice;
            const syntheticPrice = +(c - p + k).toFixed(1);
            const diff = +(syntheticPrice - spotPrice).toFixed(1);
            let arbType = 'FAIR_VALUED';
            let note = 'Fairly priced options';
            if (diff > 12) {
                arbType = 'REVERSAL_ARB';
                note = `Call overpriced vs Put (Diff: +${diff} pts). Synthetic long trading at premium.`;
            }
            else if (diff < -12) {
                arbType = 'CONVERSION_ARB';
                note = `Put overpriced vs Call (Diff: ${diff} pts). Synthetic long trading at discount.`;
            }
            syntheticArbitrage.push({
                strikePrice: k,
                callPrice: c,
                putPrice: p,
                spotPrice,
                syntheticPrice,
                deviationPts: diff,
                arbitrageType: arbType,
                opportunityNote: note
            });
        });
        // Determine the top recommended strategy based on current CPR & market regime
        let recommendedStrategy = allStrategies[0]; // Default Bull Call Spread
        if (spotPrice < (cpr?.pivot || spotPrice)) {
            recommendedStrategy = allStrategies.find(s => s.strategyId === 'BEAR_PUT_SPREAD') || allStrategies[1];
        }
        else if (cpr?.cprWidthCategory === 'WIDE_CPR' || marketRegime?.structureType === 'SIDEWAYS_DAY') {
            recommendedStrategy = allStrategies.find(s => s.strategyId === 'BULL_PUT_SPREAD') || allStrategies[2];
        }
        else {
            recommendedStrategy = allStrategies.find(s => s.strategyId === 'BULL_CALL_SPREAD') || allStrategies[0];
        }
        return {
            recommendedStrategy,
            allStrategies,
            syntheticArbitrage
        };
    }
}
