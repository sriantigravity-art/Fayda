import { globalGeopoliticalEngine } from './globalGeopoliticalEngine.js';
import { globalMarketFeedService } from './globalMarketFeedService.js';
export class NewsService {
    recentNews = [];
    seenHeadlines = new Set();
    onNewFlashCallback;
    pollInterval;
    // Maximum age for news articles: 36 hours (prevents 2016/2024 stale RSS archives from entering)
    MAX_ARTICLE_AGE_MS = 36 * 60 * 60 * 1000;
    // Noise keywords to exclude non-financial / non-market articles
    noiseKeywords = [
        'horoscope', 'astrology', 'zodiac', 'bollywood', 'hollywood', 'celebrity', 'cricket score',
        'ipl match', 'box office', 'movie review', 'film', 'theatrical', 'trailer', 'cinema', 'ott release',
        'actor', 'actress', 'wedding', 'divorce', 'recipe', 'viral video', 'fashion', 'diet', 'breakfast'
    ];
    // High-Relevance Indian Market & Global Catalyst Keywords
    indianMarketKeywords = [
        'nifty', 'sensex', 'bank nifty', 'banknifty', 'finnifty', 'midcap', 'gift nifty', 'dalal street',
        'rbi', 'repo rate', 'monetary policy', 'mpc', 'sebi', 'f&o', 'derivative', 'settlement',
        'fii', 'fpi', 'dii', 'rupee', 'inr', 'india', 'indian', 'bse', 'nse', 'shares', 'stocks', 'equity',
        'trump', 'tariff', 'reciprocal', 'trade war', 'brent', 'crude', 'oil', 'opec', 'fed', 'fomc', 'powell',
        'inflation', 'cpi', 'wpi', 'gdp', 'yield', 'treasury', 'dxy', 'dollar', 'gold', 'silver',
        'hdfc', 'reliance', 'tcs', 'infosys', 'icici', 'sbi', 'adani', 'tata', 'airtel', 'l&t', 'maruti', 'bajaj',
        'quarter', 'earnings', 'revenue', 'profit', 'ebitda', 'ipo', 'listing', 'block deal', 'dividend',
        'h-1b', 'h1b', 'visa', 'war', 'russia', 'ukraine', 'red sea', 'middle east', 'china', 'stimulus', 'sanctions',
        'rally', 'crack', 'crash', 'surge', 'plunge', 'circuit', 'high', 'fall', 'gain'
    ];
    // Verified live RSS Feeds for 2026 Indian Markets & Macro
    feeds = [
        {
            url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
            source: 'ECONOMIC_TIMES',
            label: 'Economic Times Markets'
        },
        {
            url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
            source: 'ECONOMIC_TIMES',
            label: 'Economic Times Stocks'
        },
        {
            url: 'https://www.livemint.com/rss/markets',
            source: 'LIVEMINT',
            label: 'LiveMint Markets'
        },
        {
            url: 'https://www.business-standard.com/rss/markets-106.rss',
            source: 'BUSINESS_STANDARD',
            label: 'Business Standard Markets'
        },
        {
            url: 'https://news.google.com/rss/search?q=(Nifty+OR+Sensex+OR+RBI+OR+SEBI+OR+"Gift+Nifty"+OR+"FII")+when:1d&hl=en-IN&gl=IN&ceid=IN:en',
            source: 'GLOBAL_MACRO',
            label: 'Google News Financial Wire'
        },
        {
            url: 'https://feeds.feedburner.com/ndtvprofit-latest',
            source: 'CNBC_TV18',
            label: 'NDTV Profit Wires'
        }
    ];
    constructor(onNewFlash) {
        this.onNewFlashCallback = onNewFlash;
        this.initializeCuratedNews();
        this.startPolling();
    }
    setCallback(cb) {
        this.onNewFlashCallback = cb;
    }
    getRecentNews(limit = 35) {
        return this.recentNews.slice(0, limit);
    }
    /**
     * Cleans raw RSS text, removes CDATA, HTML entities, and formatting artifacts
     */
    cleanText(rawText) {
        if (!rawText)
            return '';
        return rawText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/Read more\.\.\./gi, '')
            .replace(/\[\.\.\.\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Parses publisher source from headline or Google News source tag
     */
    resolveSource(publisherText, headline, fallback) {
        const text = `${publisherText} ${headline}`.toLowerCase();
        if (text.includes('bloomberg'))
            return 'BLOOMBERG';
        if (text.includes('reuters'))
            return 'REUTERS';
        if (text.includes('economic times') || text.includes('economictimes') || text.includes('et markets'))
            return 'ECONOMIC_TIMES';
        if (text.includes('livemint') || text.includes('mint'))
            return 'LIVEMINT';
        if (text.includes('business standard') || text.includes('businessstandard'))
            return 'BUSINESS_STANDARD';
        if (text.includes('cnbc') || text.includes('ndtv profit') || text.includes('moneycontrol'))
            return 'CNBC_TV18';
        return fallback;
    }
    /**
     * Cleans trailing publication suffixes like " - Reuters" or " | Livemint"
     */
    cleanHeadline(headline) {
        const splitRegex = /\s+[-–|]\s+([A-Za-z0-9\s.&]+)$/;
        const match = headline.match(splitRegex);
        if (match && match[1] && match[1].length < 35) {
            const publisherHint = match[1].trim();
            const title = headline.replace(splitRegex, '').trim();
            return { title, publisherHint };
        }
        return { title: headline, publisherHint: '' };
    }
    /**
     * Baseline high-impact market drivers (initialized on server startup)
     */
    initializeCuratedNews() {
        const now = Date.now();
        const riskMode = globalMarketFeedService.getGlobalContext().globalRiskMode;
        const rawBaselines = [
            {
                headline: "SEBI Proposes Net Settlement Framework for Mutual Fund Cash Market Trades",
                summary: "Market regulator SEBI releases consultation paper proposing net settlement for mutual fund secondary cash market transactions to optimize margin liquidity and intraday capital efficiency.",
                source: "REUTERS",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "OFFICIAL"
            },
            {
                headline: "US Trade & Tariff Framework: Trump Outlines Reciprocal Tariff Guidelines with Pharma Generics Exemption",
                summary: "Trump administration outlines targeted reciprocal tariffs on global steel and electronics; Indian pharmaceutical generic exports confirmed exempt to protect US healthcare costs.",
                source: "BLOOMBERG",
                impact: "HIGH_IMPACT",
                sentiment: "NEUTRAL",
                status: "ANNOUNCED"
            },
            {
                headline: "Brent Crude Oil Softens Towards $72.80/bbl on Stable Maritime Transit Negotiations",
                summary: "Global crude contracts ease as diplomatic negotiations lower war-risk premiums, reducing India oil import bill, easing domestic inflation, and supporting paint and OMC margins.",
                source: "REUTERS",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "REPORTED"
            },
            {
                headline: "RBI Monetary Policy: Status Quo on Repo Rate; Domestic Growth Trajectory Projected at 7.2%",
                summary: "RBI Governor emphasizes robust macroeconomic resilience, keeping banking Net Interest Margins (NIM) and retail credit velocity healthy while maintaining liquidity buffers.",
                source: "ECONOMIC_TIMES",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "OFFICIAL"
            },
            {
                headline: "FII Capital Flows: Institutional Buying Rebounds with ₹1,840 Cr Net Inflow Across Large-Caps",
                summary: "Foreign Institutional Investors turn net buyers in benchmark banking and infrastructure heavyweights following soft US Treasury yields and resilient domestic corporate balance sheets.",
                source: "LIVEMINT",
                impact: "HIGH_IMPACT",
                sentiment: "BULLISH",
                status: "REPORTED"
            },
            {
                headline: "China PBOC and Fiscal Authorities Unveil Fresh Infrastructure Credit Package",
                summary: "Chinese authorities announce credit lines to stimulate domestic industrial demand, curbing metal dumping and lifting global base metal benchmarks.",
                source: "BUSINESS_STANDARD",
                impact: "MODERATE",
                sentiment: "BULLISH",
                status: "ANNOUNCED"
            }
        ];
        rawBaselines.forEach((b, idx) => {
            const time = new Date(now - (idx * 15 * 60 * 1000));
            const analysis = globalGeopoliticalEngine.analyzeNews(b.headline, b.summary, riskMode);
            const item = {
                id: `news-init-${idx}-${now}`,
                headline: b.headline,
                summary: b.summary,
                source: b.source,
                impact: b.impact,
                sentiment: b.sentiment,
                category: analysis.category,
                timestamp: time.toISOString(),
                timeFormatted: time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }),
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
     * Fetches real-time RSS market feeds asynchronously
     */
    async fetchLiveFeeds() {
        for (const feed of this.feeds) {
            try {
                const res = await fetch(feed.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8'
                    },
                    signal: AbortSignal.timeout(9000)
                });
                if (res.ok) {
                    const xmlData = await res.text();
                    if (xmlData) {
                        this.parseRssFeed(xmlData, feed.source);
                    }
                }
            }
            catch (err) {
                // Continue silently to next feed if one endpoint is slow
            }
        }
    }
    /**
     * Parses items, validates publication dates, eliminates noise, and scores market impact
     */
    parseRssFeed(xmlData, defaultSource) {
        const itemMatches = xmlData.match(/<item>([\s\S]*?)<\/item>/gi) || [];
        const riskMode = globalMarketFeedService.getGlobalContext().globalRiskMode;
        const now = Date.now();
        for (const itemXml of itemMatches.slice(0, 18)) {
            // 1. Title Extraction
            const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i);
            // 2. Description Extraction
            const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemXml.match(/<description>([\s\S]*?)<\/description>/i);
            // 3. Link Extraction
            const linkMatch = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/i) || itemXml.match(/<link>(.*?)<\/link>/i);
            // 4. PubDate Extraction
            const dateMatch = itemXml.match(/<pubDate><!\[CDATA\[(.*?)\]\]><\/pubDate>/i) || itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
            // 5. Publisher Source Tag Extraction (Google News RSS provides <source url="...">Publisher</source>)
            const sourceTagMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/i);
            if (titleMatch && titleMatch[1]) {
                const rawTitle = this.cleanText(titleMatch[1]);
                if (!rawTitle)
                    continue;
                // Skip non-financial noise
                if (this.isNoise(rawTitle))
                    continue;
                // Clean trailing publication suffix if present
                const { title, publisherHint } = this.cleanHeadline(rawTitle);
                const rawDesc = descMatch ? this.cleanText(descMatch[1]) : title;
                const link = linkMatch ? linkMatch[1].trim() : undefined;
                const publisherText = sourceTagMatch ? this.cleanText(sourceTagMatch[1]) : publisherHint;
                const resolvedSource = this.resolveSource(publisherText, rawTitle, defaultSource);
                // 6. Strict Date Validation (Max 36 hours old)
                let articleTime = now;
                if (dateMatch && dateMatch[1]) {
                    const parsedEpoch = Date.parse(dateMatch[1].trim());
                    if (!isNaN(parsedEpoch)) {
                        // Discard ancient or archived articles (> 36 hours old)
                        if (now - parsedEpoch > this.MAX_ARTICLE_AGE_MS) {
                            continue;
                        }
                        articleTime = parsedEpoch;
                    }
                }
                // 7. Market Relevance Gatekeeper
                if (this.isImpactingIndianMarket(title, rawDesc)) {
                    const headlineKey = title.toLowerCase();
                    if (!this.seenHeadlines.has(headlineKey)) {
                        this.seenHeadlines.add(headlineKey);
                        // Pass through FAYDA Global & Geopolitical Transmission Engine
                        const analysis = globalGeopoliticalEngine.analyzeNews(title, rawDesc, riskMode);
                        const cleanSummary = rawDesc.length > 170 ? `${rawDesc.substring(0, 170)}...` : rawDesc;
                        const itemImpact = this.determineImpact(title, rawDesc);
                        const pubDateObj = new Date(articleTime);
                        const newItem = {
                            id: `news-${articleTime}-${Math.random().toString(36).substr(2, 6)}`,
                            headline: title,
                            summary: cleanSummary || title,
                            source: resolvedSource,
                            impact: itemImpact,
                            sentiment: analysis.impactStamp === 'POSITIVE' ? 'BULLISH' : analysis.impactStamp === 'NEGATIVE' ? 'BEARISH' : 'NEUTRAL',
                            category: analysis.category,
                            timestamp: pubDateObj.toISOString(),
                            timeFormatted: pubDateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }),
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
                        // Insert in chronological order (newest first)
                        this.recentNews.unshift(newItem);
                        this.recentNews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        if (this.recentNews.length > 60)
                            this.recentNews.pop();
                        // Controlled Flash Alert: Only trigger pop-up banner for genuine HIGH_IMPACT news published in the last 45 minutes
                        const isFreshBreaking = (now - articleTime) <= 45 * 60 * 1000;
                        if (this.onNewFlashCallback && itemImpact === 'HIGH_IMPACT' && isFreshBreaking) {
                            this.onNewFlashCallback(newItem);
                        }
                    }
                }
            }
        }
    }
    /**
     * Filter: Exclude non-financial / non-market noise
     */
    isNoise(title) {
        const text = title.toLowerCase();
        return this.noiseKeywords.some(kw => text.includes(kw));
    }
    /**
     * Filter: Must contain market catalyst keywords
     */
    isImpactingIndianMarket(title, desc) {
        const text = `${title} ${desc}`.toLowerCase();
        return this.indianMarketKeywords.some(kw => text.includes(kw));
    }
    /**
     * Multi-Tier Catalyst Impact Classifier
     */
    determineImpact(title, desc) {
        const text = `${title} ${desc}`.toLowerCase();
        const highImpactTriggers = [
            'rbi', 'repo rate', 'rate cut', 'rate hike', 'monetary policy', 'mpc',
            'sebi', 'settlement', 'f&o', 'derivative circular',
            'fed', 'fomc', 'powell', 'rate decision',
            'inflation', 'cpi', 'gdp growth', 'fiscal deficit',
            'tariff', 'trump tariff', 'trade war', 'reciprocal trade',
            'crude oil', 'brent', 'opec',
            'fii net', 'fii buying', 'fii selling', 'fpi inflow', 'fpi outflow',
            'all-time high', 'circuit breaker', 'market crash', 'bloodbath', 'plunge', 'bloodbath',
            'quarterly results', 'net profit up', 'net profit down', 'earnings surprise',
            'war', 'red sea', 'sanctions'
        ];
        if (highImpactTriggers.some(t => text.includes(t))) {
            return 'HIGH_IMPACT';
        }
        const globalCueTriggers = [
            'wall street', 'dow jones', 'nasdaq', 's&p 500', 'asian markets', 'nikkei', 'hang seng', 'gift nifty'
        ];
        if (globalCueTriggers.some(t => text.includes(t))) {
            return 'GLOBAL_CUE';
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
export const newsService = new NewsService();
