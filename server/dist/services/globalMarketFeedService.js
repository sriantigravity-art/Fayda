"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalMarketFeedService = exports.GlobalMarketFeedService = void 0;
class GlobalMarketFeedService {
    currentContext;
    listeners = [];
    refreshInterval;
    constructor() {
        this.currentContext = this.generateBaselineGlobalContext();
        this.startLiveMonitoring();
    }
    getGlobalContext() {
        return this.currentContext;
    }
    onUpdate(callback) {
        this.listeners.push(callback);
    }
    generateBaselineGlobalContext() {
        const now = new Date().toISOString();
        // Realistic live/current global market baseline
        const indicators = {
            sp500: { value: 5880.50, changePct: 0.45 },
            nasdaq: { value: 18540.20, changePct: 0.65 },
            nikkei: { value: 38720.00, changePct: 0.85 },
            hangSeng: { value: 19680.10, changePct: -0.35 },
            giftNifty: { value: 24580.00, changePct: 0.38 },
            brentCrude: { value: 72.85, changePct: -1.25 }, // Softening crude is supportive for India
            gold: { value: 2685.40, changePct: 0.15 },
            dxy: { value: 104.20, changePct: -0.18 },
            us10y: { value: 4.18, changePct: -0.45 },
            usdInr: { value: 84.62, changePct: -0.05 },
            fiiNetBuyCr: 1840,
            diiNetBuyCr: 2150
        };
        const riskMode = this.computeGlobalRiskMode(indicators);
        const premarketSetup = this.computePremarketSetup(indicators, riskMode);
        return {
            timestamp: now,
            globalRiskMode: riskMode,
            premarketSetup,
            summary: 'Global market setup is broadly supportive for Indian equities with softening Brent crude ($72.85/bbl), stable US yields (4.18%), and steady institutional FII cash inflows.',
            primaryDrivers: [
                'Softening Brent Crude ($72.85/bbl) contracting India import bill',
                'US 10Y yields easing to 4.18% expanding emerging market carry flows',
                'FII net cash buying (+₹1,840 Cr) supporting large-cap valuation floors',
                'Positive momentum in Asian benchmarks (Nikkei +0.85%, GIFT Nifty +0.38%)'
            ],
            indicators
        };
    }
    computeGlobalRiskMode(ind) {
        let riskScore = 0;
        // US markets & Nikkei positive
        if (ind.sp500.changePct > 0)
            riskScore += 1;
        if (ind.nasdaq.changePct > 0)
            riskScore += 1;
        if (ind.nikkei.changePct > 0)
            riskScore += 1;
        // DXY & US10Y falling = Risk On for Emerging Markets
        if (ind.dxy.changePct < 0)
            riskScore += 1;
        if (ind.us10y.changePct < 0)
            riskScore += 1;
        // Crude falling = Risk On for India
        if (ind.brentCrude.changePct < 0)
            riskScore += 1;
        // FII inflows
        if (ind.fiiNetBuyCr > 0)
            riskScore += 1;
        if (riskScore >= 5)
            return 'RISK_ON';
        if (riskScore >= 3)
            return 'NEUTRAL';
        if (riskScore >= 1)
            return 'RISK_OFF';
        return 'EXTREME_RISK_OFF';
    }
    computePremarketSetup(ind, riskMode) {
        if (riskMode === 'RISK_ON' && ind.giftNifty.changePct >= 0) {
            return 'SUPPORTIVE';
        }
        if (riskMode === 'RISK_OFF' || riskMode === 'EXTREME_RISK_OFF' || ind.giftNifty.changePct < -0.6) {
            return 'RISK_OFF';
        }
        return 'MIXED';
    }
    /**
     * Periodically simulate micro fluctuations in global indices
     */
    startLiveMonitoring() {
        this.refreshInterval = setInterval(() => {
            const ind = this.currentContext.indicators;
            // Gentle jitter
            const jitter = (val, range) => {
                const delta = (Math.random() - 0.48) * range;
                return Number((val + delta).toFixed(2));
            };
            ind.brentCrude.value = jitter(ind.brentCrude.value, 0.15);
            ind.gold.value = jitter(ind.gold.value, 0.80);
            ind.dxy.value = jitter(ind.dxy.value, 0.04);
            ind.giftNifty.value = jitter(ind.giftNifty.value, 4.0);
            this.currentContext.timestamp = new Date().toISOString();
            this.currentContext.globalRiskMode = this.computeGlobalRiskMode(ind);
            this.currentContext.premarketSetup = this.computePremarketSetup(ind, this.currentContext.globalRiskMode);
            // Notify listeners
            for (const listener of this.listeners) {
                listener(this.currentContext);
            }
        }, 45000);
    }
    destroy() {
        if (this.refreshInterval)
            clearInterval(this.refreshInterval);
    }
}
exports.GlobalMarketFeedService = GlobalMarketFeedService;
exports.globalMarketFeedService = new GlobalMarketFeedService();
