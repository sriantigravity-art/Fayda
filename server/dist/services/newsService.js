"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsService = exports.NewsService = void 0;
const globalGeopoliticalEngine_js_1 = require("./globalGeopoliticalEngine.js");
const globalMarketFeedService_js_1 = require("./globalMarketFeedService.js");
class NewsService {
    recentNews = [];
    seenHeadlines = new Set();
    onNewFlashCallback;
    pollInterval;
    // Strict Keywords for Indian Market Impact Filtering
    indianMarketKeywords = [
        'nifty', 'sensex', 'bank nifty', 'banknifty', 'rbi', 'repo rate', 'sebi',
        'fii', 'dii', 'rupee', 'inr', 'india', 'indian', 'gift nifty', 'dalal street',
        'trump', 'tariff', 'brent', 'crude', 'fed', 'fomc', 'inflation', 'cpi', 'gdp',
        'hdfc', 'reliance', 'tcs', 'infosys', 'icici', 'sbi', 'adani', 'tata', 'it index',
        'stock', 'market', 'equity', 'shares', 'quarter', 'earnings', 'gst', 'trade', 'export', 'import',
        'h-1b', 'h1b', 'visa', 'war', 'russia', 'ukraine', 'red sea', 'china', 'opec', 'gold', 'stimulus'
    ];
    constructor(onNewFlash) {
        this.onNewFlashCallback = onNewFlash;
        this.initializeCuratedNews();
        this.startPolling();
    }
    setCallback(cb) {
        this.onNewFlashCallback = cb;
    }
    getRecentNews(limit = 30) {
        return this.recentNews.slice(0, limit);
    }
    /**
     * Cleans raw RSS description, removes embedded HTML tags and artifacts
     */
    cleanText(rawText) {
        if (!rawText)
            return '';
        let text = rawText;
        text = text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
        text = text.replace(/<[^>]*>?/gm, ' ');
        text = text.replace(/Read more\.\.\./gi, '')
            .replace(/\[\.\.\.\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return text;
    }
    /**
     * Initializes high-impact Indian & Global Macro baseline news
     */
    initializeCuratedNews() {
        const now = Date.now();
        const riskMode = globalMarketFeedService_js_1.globalMarketFeedService.getGlobalContext().globalRiskMode;
        const rawBaselines = [
            {
                headline: "US Trade & Tariff Policy: Trump Outlines Reciprocal Tariff Framework with Pharma Exemption",
                summary: "Trump administration outlines targeted reciprocal tariffs on global steel and electronics; Indian pharmaceutical generic exports confirmed exempt to protect US healthcare costs.",
                source: "BLOOMBERG",
                impact: "HIGH_IMPACT",
                sentiment: "NEUTRAL",
                status: "ANNOUNCED"
            },
            {
                headline: "Brent Crude Oil Softens Towards $72.80/bbl Amid Stable Global Shipping Flows",
                summary: "Global crude contracts ease as diplomatic transit negotiations lower maritime war-risk premiums, reducing India oil import bill and easing domestic inflation.",
                source: "REUTERS",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "REPORTED"
            },
            {
                headline: "Workload in IT to Come Down Due to AI; Global Clients Demand 20-30% Productivity Discounts",
                summary: "IT services and BPM firms face billable hours (FTE) deflation as enterprise clients demand AI-led productivity discounts during contract renewal cycles.",
                source: "CNBC_TV18",
                impact: "HIGH_IMPACT",
                sentiment: "BEARISH",
                status: "REPORTED"
            },
            {
                headline: "RBI Monetary Policy: Status Quo on Repo Rate; Domestic Liquidity & Credit Demand Strong",
                summary: "RBI Governor emphasizes robust economic resilience with 7.2% GDP growth trajectory, keeping banking Net Interest Margins (NIM) and retail credit velocity stable.",
                source: "CNBC_TV18",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "OFFICIAL"
            },
            {
                headline: "FII Inflows Rebound in Cash Segment with ₹1,840 Cr Net Buying Across Large-Caps",
                summary: "Foreign Institutional Investors turn aggressive net buyers in benchmark banking and infrastructure heavyweights following soft US Treasury yields.",
                source: "MONEYCONTROL",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "REPORTED"
            },
            {
                headline: "China Unveils Fresh Infrastructure & Real Estate Stimulus Package",
                summary: "PBOC and fiscal authorities announce credit lines to stimulate domestic industrial demand, curbing metal dumping and lifting global LME commodity benchmarks.",
                source: "BLOOMBERG",
                impact: "MODERATE",
                sentiment: "BULLISH",
                status: "ANNOUNCED"
            }
        ];
        rawBaselines.forEach((b, idx) => {
            const time = new Date(now - (idx * 14 * 60 * 1000));
            const analysis = globalGeopoliticalEngine_js_1.globalGeopoliticalEngine.analyzeNews(b.headline, b.summary, riskMode);
            const item = {
                id: `news-init-${idx}-${now}`,
                headline: b.headline,
                summary: b.summary,
                source: b.source,
                impact: b.impact,
                sentiment: b.sentiment,
                category: analysis.category,
                timestamp: time.toISOString(),
                timeFormatted: time.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                indianMarketImpact: analysis.indianMarketImpact,
                impactStamp: analysis.impactStamp,
                impactedSectors: analysis.transmissionPath.mostExposedSectors,
                beneficiarySectors: analysis.beneficiarySectors,
                vulnerableSectors: analysis.vulnerableSectors,
                dalalStreetOutlook: analysis.dalalStreetOutlook,
                layeredScores: analysis.layeredScores,
                transmissionPath: analysis.transmissionPath,
                relatedGlobalEvents: analysis.relatedGlobalEvents,
                eventStatus: b.status
            };
            this.recentNews.push(item);
            this.seenHeadlines.add(b.headline.toLowerCase());
        });
    }
    /**
     * Fetches real-time RSS market feeds from Moneycontrol, CNBC-TV18, Bloomberg / Reuters
     */
    async fetchLiveFeeds() {
        const feeds = [
            {
                url: 'https://www.moneycontrol.com/rss/MCtopnews.xml',
                source: 'MONEYCONTROL'
            },
            {
                url: 'https://www.moneycontrol.com/rss/economy.xml',
                source: 'MONEYCONTROL'
            },
            {
                url: 'https://feeds.feedburner.com/ndtvprofit-latest',
                source: 'CNBC_TV18'
            }
        ];
        for (const feed of feeds) {
            try {
                const res = await fetch(feed.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: AbortSignal.timeout(8000)
                });
                if (res.ok) {
                    const xmlData = await res.text();
                    if (xmlData) {
                        this.parseRssFeed(xmlData, feed.source);
                    }
                }
            }
            catch (err) {
                // Silently continue if external RSS endpoint is blocked or slow
            }
        }
    }
    /**
     * Parse and filter items that strictly impact the Indian market and global macro
     */
    parseRssFeed(xmlData, source) {
        const itemMatches = xmlData.match(/<item>([\s\S]*?)<\/item>/gi) || [];
        const riskMode = globalMarketFeedService_js_1.globalMarketFeedService.getGlobalContext().globalRiskMode;
        for (const itemXml of itemMatches.slice(0, 10)) {
            const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i);
            const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemXml.match(/<description>([\s\S]*?)<\/description>/i);
            const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
            if (titleMatch && titleMatch[1]) {
                const rawTitle = this.cleanText(titleMatch[1]);
                const rawDesc = descMatch ? this.cleanText(descMatch[1]) : rawTitle;
                const link = linkMatch ? linkMatch[1].trim() : undefined;
                if (!rawTitle)
                    continue;
                if (this.isImpactingIndianMarket(rawTitle, rawDesc)) {
                    const headlineKey = rawTitle.toLowerCase();
                    if (!this.seenHeadlines.has(headlineKey)) {
                        this.seenHeadlines.add(headlineKey);
                        // Pass through FAYDA Global & Geopolitical Transmission Engine
                        const analysis = globalGeopoliticalEngine_js_1.globalGeopoliticalEngine.analyzeNews(rawTitle, rawDesc, riskMode);
                        const cleanSummary = rawDesc.length > 170 ? `${rawDesc.substring(0, 170)}...` : rawDesc;
                        const now = Date.now();
                        const newItem = {
                            id: `news-${now}-${Math.random().toString(36).substr(2, 6)}`,
                            headline: rawTitle,
                            summary: cleanSummary || rawTitle,
                            source,
                            impact: this.determineImpact(rawTitle),
                            sentiment: analysis.impactStamp === 'POSITIVE' ? 'BULLISH' : analysis.impactStamp === 'NEGATIVE' ? 'BEARISH' : 'NEUTRAL',
                            category: analysis.category,
                            timestamp: new Date(now).toISOString(),
                            timeFormatted: new Date(now).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                            indianMarketImpact: analysis.indianMarketImpact,
                            impactStamp: analysis.impactStamp,
                            impactedSectors: analysis.transmissionPath.mostExposedSectors,
                            beneficiarySectors: analysis.beneficiarySectors,
                            vulnerableSectors: analysis.vulnerableSectors,
                            dalalStreetOutlook: analysis.dalalStreetOutlook,
                            layeredScores: analysis.layeredScores,
                            transmissionPath: analysis.transmissionPath,
                            relatedGlobalEvents: analysis.relatedGlobalEvents,
                            eventStatus: 'REPORTED',
                            url: link
                        };
                        this.recentNews.unshift(newItem);
                        if (this.recentNews.length > 50)
                            this.recentNews.pop();
                        // Emit live flash broadcast callback
                        if (this.onNewFlashCallback) {
                            this.onNewFlashCallback(newItem);
                        }
                    }
                }
            }
        }
    }
    /**
     * Filter: Must contain an Indian market impacting keyword
     */
    isImpactingIndianMarket(title, desc) {
        const text = `${title} ${desc}`.toLowerCase();
        return this.indianMarketKeywords.some(kw => text.includes(kw));
    }
    determineImpact(title) {
        const text = title.toLowerCase();
        if (text.includes('rbi') || text.includes('trump') || text.includes('tariff') || text.includes('nifty') || text.includes('gdp') || text.includes('crude') || text.includes('fii') || text.includes('h-1b') || text.includes('war')) {
            return 'HIGH_IMPACT';
        }
        return 'MODERATE';
    }
    startPolling() {
        this.fetchLiveFeeds();
        // Poll for new live financial headlines every 60 seconds
        this.pollInterval = setInterval(() => this.fetchLiveFeeds(), 60000);
    }
    destroy() {
        if (this.pollInterval)
            clearInterval(this.pollInterval);
    }
}
exports.NewsService = NewsService;
exports.newsService = new NewsService();
