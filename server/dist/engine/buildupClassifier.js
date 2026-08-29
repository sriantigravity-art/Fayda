"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyBuildup = classifyBuildup;
exports.determineTradeAction = determineTradeAction;
exports.calculateDynamicTarget = calculateDynamicTarget;
exports.generateOptionSuggestion = generateOptionSuggestion;
function classifyBuildup(oiDelta, priceDelta) {
    if (oiDelta >= 0) {
        return priceDelta >= 0 ? 'LONG_BUILDUP' : 'SHORT_BUILDUP';
    }
    else {
        return priceDelta >= 0 ? 'SHORT_COVERING' : 'LONG_UNWINDING';
    }
}
function determineTradeAction(symbol, optionType, buildup, strike, atmStrike, ltp) {
    const isNearAtm = Math.abs(strike - atmStrike) <= (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX' || symbol === 'GOLD' || symbol === 'SILVER' ? 400 : 100);
    if (optionType === 'CE') {
        switch (buildup) {
            case 'LONG_BUILDUP':
                return {
                    tradeAction: 'BUY_CALL',
                    actionTitle: '🟢 BUY CALL (CE)',
                    actionDescription: `Aggressive call buying at ${strike} CE (+price, +OI). Strong upside momentum breakout likely.`,
                    confidence: isNearAtm ? 'HIGH' : 'MEDIUM'
                };
            case 'SHORT_BUILDUP':
                return {
                    tradeAction: 'BUY_PUT',
                    actionTitle: '🔴 BUY PUT (PE) / CALL WRITING WALL',
                    actionDescription: `Heavy institutional Call writing at ${strike} CE (+OI, -price). Stiff resistance forming above.`,
                    confidence: isNearAtm ? 'EXTREME' : 'HIGH'
                };
            case 'SHORT_COVERING':
                return {
                    tradeAction: 'BUY_CALL',
                    actionTitle: '⚡ BUY CALL (CE) / SHORT SQUEEZE',
                    actionDescription: `Trapped Call writers panicking at ${strike} CE (-OI, +price). Explosive upward squeeze underway.`,
                    confidence: 'HIGH'
                };
            case 'LONG_UNWINDING':
                return {
                    tradeAction: 'BUY_PUT',
                    actionTitle: '⚠️ BUY PUT (PE) / BULL LIQUIDATION',
                    actionDescription: `Call buyers liquidating long positions at ${strike} CE (-OI, -price). Momentum fading downwards.`,
                    confidence: 'MEDIUM'
                };
        }
    }
    else {
        switch (buildup) {
            case 'LONG_BUILDUP':
                return {
                    tradeAction: 'BUY_PUT',
                    actionTitle: '🔴 BUY PUT (PE)',
                    actionDescription: `Heavy Put buying at ${strike} PE (+price, +OI). Market participants positioning for breakdown.`,
                    confidence: isNearAtm ? 'HIGH' : 'MEDIUM'
                };
            case 'SHORT_BUILDUP':
                return {
                    tradeAction: 'BUY_CALL',
                    actionTitle: '🟢 BUY CALL (CE) / PUT SUPPORT FLOOR',
                    actionDescription: `Massive institutional Put writing at ${strike} PE (+OI, -price). Strong support cushion created.`,
                    confidence: isNearAtm ? 'EXTREME' : 'HIGH'
                };
            case 'SHORT_COVERING':
                return {
                    tradeAction: 'BUY_PUT',
                    actionTitle: '⚡ BUY PUT (PE) / SUPPORT CRUMBLING',
                    actionDescription: `Put writers fleeing at ${strike} PE (-OI, +price). Support level breaking downwards.`,
                    confidence: 'HIGH'
                };
            case 'LONG_UNWINDING':
                return {
                    tradeAction: 'BUY_CALL',
                    actionTitle: '⚠️ BUY CALL (CE) / PUT BUYERS EXITING',
                    actionDescription: `Put holders exiting positions at ${strike} PE (-OI, -price). Downside panic subsiding.`,
                    confidence: 'MEDIUM'
                };
        }
    }
}
function calculateDynamicTarget(ltp, strike, atmStrike) {
    const cleanLtp = Math.max(5, ltp);
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
    // Time-of-day volatility & session decay multiplier
    let sessionTimeMultiplier = 1.0;
    if (totalMinutes >= 14 * 60 + 30) {
        // Late session (After 02:30 PM): Range compresses, quick realistic scalps only
        sessionTimeMultiplier = 0.55;
    }
    else if (totalMinutes >= 13 * 60) {
        // Afternoon session (01:00 PM - 02:30 PM): Moderate momentum
        sessionTimeMultiplier = 0.75;
    }
    else if (totalMinutes <= 10 * 60 + 30) {
        // Morning session (09:15 - 10:30 AM): Peak volatility, full targets
        sessionTimeMultiplier = 1.0;
    }
    else {
        // Midday lull (10:30 AM - 01:00 PM): Sideways consolidation
        sessionTimeMultiplier = 0.70;
    }
    // Moneyness adjustment: OTM options have lower delta, smaller achievable point move
    const distFromAtm = atmStrike ? Math.abs(strike - atmStrike) : 0;
    let moneynessMultiplier = 1.0;
    if (distFromAtm > 300) {
        moneynessMultiplier = 0.65;
    }
    else if (distFromAtm > 150) {
        moneynessMultiplier = 0.80;
    }
    // Base target percentage (8% to 30%) scaled by session time & moneyness
    let targetPct = Math.round(Math.max(8, Math.min(32, 28 * sessionTimeMultiplier * moneynessMultiplier)));
    // Stoploss percentage (maintain healthy 1:1.6 - 1:2.0 Risk-to-Reward)
    let slPct = Math.round(Math.max(5, Math.min(16, targetPct * 0.55)));
    let targetPoints = +(cleanLtp * (targetPct / 100)).toFixed(1);
    let slPoints = +(cleanLtp * (slPct / 100)).toFixed(1);
    // High premium adjustment
    if (cleanLtp > 250) {
        targetPct = Math.round(Math.max(6, targetPct * 0.75));
        slPct = Math.round(Math.max(4, slPct * 0.75));
        targetPoints = +(cleanLtp * (targetPct / 100)).toFixed(1);
        slPoints = +(cleanLtp * (slPct / 100)).toFixed(1);
    }
    const rrRatio = (targetPoints / Math.max(1, slPoints)).toFixed(1);
    return {
        slPoints,
        targetPoints,
        slPct,
        targetPct,
        riskReward: `1:${rrRatio}`
    };
}
function generateOptionSuggestion(symbol, strike, optionType, ltp, _tradeAction, expiryDate = 'CURRENT_WEEKLY', atmStrike) {
    const cleanLtp = Math.max(5, ltp);
    const dyn = calculateDynamicTarget(cleanLtp, strike, atmStrike);
    const sl = Math.max(1, +(cleanLtp - dyn.slPoints).toFixed(1));
    const tgt = +(cleanLtp + dyn.targetPoints).toFixed(1);
    return {
        symbol: `${symbol} ${strike} ${optionType}`,
        strike,
        type: optionType,
        expiryDate,
        ltp: +cleanLtp.toFixed(2),
        recommendedEntry: `₹${cleanLtp.toFixed(2)} - ₹${(cleanLtp * 1.02).toFixed(2)}`,
        stoploss: `₹${sl.toFixed(2)} (-${dyn.slPct}%)`,
        target: `₹${tgt.toFixed(2)} (+${dyn.targetPct}%)`,
        riskReward: dyn.riskReward
    };
}
