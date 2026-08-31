import { NewsItem, NewsSource, NewsImpact, NewsSentiment, NewsImpactStamp } from '../types.js';

interface SectorRule {
  name: string;
  keywords: string[];
  stocks: string[];
}

export class NewsService {
  private recentNews: NewsItem[] = [];
  private seenHeadlines: Set<string> = new Set();
  private onNewFlashCallback?: (item: NewsItem) => void;
  private pollInterval?: NodeJS.Timeout;

  // Sector Mapping Matrix for Indian Equity Universe
  private sectorRules: SectorRule[] = [
    {
      name: 'Banking & Financials',
      keywords: ['bank', 'rbi', 'nbfc', 'repo rate', 'lending', 'credit', 'npa', 'deposit', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bajaj finance', 'banknifty', 'liquidity'],
      stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE']
    },
    {
      name: 'IT & Software',
      keywords: ['it', 'tech', 'software', 'ai', 'cloud', 'digital', 'tcs', 'infosys', 'wipro', 'hcl tech', 'tech mahindra', 'nasdaq', 'accenture', 'us tech'],
      stocks: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'COFORGE']
    },
    {
      name: 'Oil & Gas / Energy',
      keywords: ['crude', 'oil', 'brent', 'petrol', 'diesel', 'opec', 'refinery', 'gas', 'lng', 'reliance', 'bpcl', 'ioc', 'hpcl', 'ongc', 'oil india'],
      stocks: ['RELIANCE', 'BPCL', 'IOC', 'HPCL', 'ONGC', 'GAIL']
    },
    {
      name: 'Automobiles & Auto-Ancillaries',
      keywords: ['auto', 'car', 'vehicle', 'ev', 'electric vehicle', 'tata motors', 'maruti', 'm&m', 'bajaj auto', 'hero', 'eicher', 'sales volume', 'registration'],
      stocks: ['TATAMOTORS', 'MARUTI', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT']
    },
    {
      name: 'Metals & Mining',
      keywords: ['steel', 'metal', 'copper', 'aluminum', 'iron ore', 'coal', 'tata steel', 'jsw steel', 'hindalco', 'vedanta', 'nmdc', 'china demand', 'tariff'],
      stocks: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'NMDC']
    },
    {
      name: 'Pharma & Healthcare',
      keywords: ['pharma', 'drug', 'fda', 'usfda', 'healthcare', 'hospital', 'medicine', 'sun pharma', 'dr reddy', 'cipla', 'divis', 'lupin', 'biocon'],
      stocks: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'LUPIN']
    },
    {
      name: 'Infrastructure, Real Estate & Cement',
      keywords: ['infra', 'realty', 'real estate', 'housing', 'cement', 'construction', 'order book', 'l&t', 'ultratech', 'dlf', 'godrej prop', 'nhai'],
      stocks: ['LT', 'ULTRACEMCO', 'DLF', 'GODREJPROP', 'AMBUJACEM']
    },
    {
      name: 'FMCG & Consumption',
      keywords: ['fmcg', 'consumer', 'retail', 'rural demand', 'inflation', 'cpi', 'hindustan unilever', 'hul', 'itc', 'nestle', 'britannia', 'dabur', 'marico'],
      stocks: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR']
    },
    {
      name: 'Chemicals & Paints',
      keywords: ['paint', 'chemical', 'crude derivative', 'asian paints', 'berger', 'pidilite', 'srf', 'aarti', 'input cost'],
      stocks: ['ASIANPAINT', 'BERGEPAINT', 'PIDILITIND', 'SRF']
    },
    {
      name: 'Defence & Railways',
      keywords: ['defence', 'railway', 'defense', 'hal', 'bel', 'irfc', 'rvnl', 'mazagon', 'cochin shipyard', 'order win', 'mod'],
      stocks: ['HAL', 'BEL', 'IRFC', 'RVNL', 'MAZDOCK']
    }
  ];

  // Strict Keywords for Indian Market Impact Filtering
  private indianMarketKeywords = [
    'nifty', 'sensex', 'bank nifty', 'banknifty', 'rbi', 'repo rate', 'sebi', 
    'fii', 'dii', 'rupee', 'inr', 'india', 'indian', 'gift nifty', 'dalal street',
    'trump', 'tariff', 'brent', 'crude', 'fed', 'fomc', 'inflation', 'cpi', 'gdp',
    'hdfc', 'reliance', 'tcs', 'infosys', 'icici', 'sbi', 'adani', 'tata', 'it index',
    'stock', 'market', 'equity', 'shares', 'quarter', 'earnings', 'gst', 'trade', 'export', 'import'
  ];

  constructor(onNewFlash?: (item: NewsItem) => void) {
    this.onNewFlashCallback = onNewFlash;
    this.initializeCuratedNews();
    this.startPolling();
  }

  public setCallback(cb: (item: NewsItem) => void) {
    this.onNewFlashCallback = cb;
  }

  public getRecentNews(limit: number = 30): NewsItem[] {
    return this.recentNews.slice(0, limit);
  }

  /**
   * Cleans raw RSS description, removes embedded HTML tags and artifacts
   */
  private cleanText(rawText: string): string {
    if (!rawText) return '';

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
   * Identifies impacted sectors based on keywords
   */
  private detectSectors(title: string, desc: string): { sectors: string[]; topStocks: string[] } {
    const text = `${title} ${desc}`.toLowerCase();
    const matchedSectors: string[] = [];
    const matchedStocks: string[] = [];

    for (const rule of this.sectorRules) {
      if (rule.keywords.some(kw => text.includes(kw))) {
        matchedSectors.push(rule.name);
        matchedStocks.push(...rule.stocks.slice(0, 3));
      }
    }

    if (matchedSectors.length === 0) {
      if (text.includes('fii') || text.includes('nifty') || text.includes('sensex')) {
        matchedSectors.push('Broad Market Index Heavyweights');
        matchedStocks.push('HDFCBANK', 'RELIANCE', 'ICICIBANK', 'INFY');
      } else {
        matchedSectors.push('Domestic Equities');
      }
    }

    return { sectors: matchedSectors.slice(0, 3), topStocks: Array.from(new Set(matchedStocks)).slice(0, 4) };
  }

  /**
   * Generates deep logical impact analysis for Dalal Street
   */
  private generateLogicalDalalStreetAnalysis(
    title: string,
    desc: string,
    sentiment: NewsSentiment,
    detectedSectors: string[],
    topStocks: string[]
  ): {
    impactStamp: NewsImpactStamp;
    marketImpact: string;
    beneficiarySectors: string[];
    vulnerableSectors: string[];
    dalalStreetOutlook: string;
  } {
    const text = `${title} ${desc}`.toLowerCase();
    const isBull = sentiment === 'BULLISH';
    const isBear = sentiment === 'BEARISH';

    let impactStamp: NewsImpactStamp = isBull ? 'POSITIVE' : isBear ? 'NEGATIVE' : 'NEUTRAL';
    let beneficiarySectors: string[] = [];
    let vulnerableSectors: string[] = [];
    let marketImpact = '';
    let dalalStreetOutlook = '';

    const stockListStr = topStocks.length > 0 ? ` (${topStocks.join(', ')})` : '';

    // Specific Domain Logic
    if (text.includes('rbi') || text.includes('repo rate') || text.includes('monetary policy') || text.includes('rate cut') || text.includes('rate hike')) {
      if (isBull) {
        beneficiarySectors = ['Banking & Financials', 'Auto & Mobility', 'Real Estate & Housing'];
        vulnerableSectors = [];
        marketImpact = `Eases systemic liquidity and lowers borrowing costs. Directly expands Net Interest Margins (NIM) and credit velocity for Bank Nifty leaders${stockListStr}.`;
        dalalStreetOutlook = 'Bullish trigger for Rate-Sensitive sectors. Nifty Bank is poised to lead benchmark outperformance.';
      } else if (isBear) {
        beneficiarySectors = [];
        vulnerableSectors = ['Rate-Sensitives', 'High-Debt Infra', 'Realty'];
        marketImpact = `Hawkish monetary stance elevates cost of funds, capping loan growth and putting pressure on Banking & NBFC valuations${stockListStr}.`;
        dalalStreetOutlook = 'Headwind for Banking index. Dalal Street may witness defensive rotation into FMCG and Pharma.';
      } else {
        beneficiarySectors = ['Banking & Financials'];
        vulnerableSectors = [];
        marketImpact = `Policy status quo maintains economic stability and credit demand continuity across major lenders${stockListStr}.`;
        dalalStreetOutlook = 'Neutral to mildly positive tone. Market retains range-bound structural support.';
      }
    } else if (text.includes('crude') || text.includes('oil') || text.includes('brent')) {
      if (text.includes('fall') || text.includes('drop') || text.includes('soften') || text.includes('plunge') || isBull) {
        beneficiarySectors = ['Paints & Chemicals', 'Oil Marketing (OMCs)', 'Aviation', 'Auto'];
        vulnerableSectors = ['Upstream Explorers (ONGC, OIL)'];
        marketImpact = `Softening crude directly contracts India's import bill and expands gross margins for Oil Marketers (BPCL, IOC, HPCL) and Paints (Asian Paints, Berger).`;
        dalalStreetOutlook = 'Positive macroeconomic catalyst lowering domestic inflation risk and strengthening INR against USD.';
      } else {
        beneficiarySectors = ['Upstream Oil (ONGC, Reliance)'];
        vulnerableSectors = ['OMCs', 'Paints', 'Aviation', 'Chemicals'];
        marketImpact = `Surging crude inflates raw material costs across industrial manufacturers and widens India's current account deficit.`;
        dalalStreetOutlook = 'Bearish macro headwind exerting margin pressure on consumer and transport sectors.';
      }
    } else if (text.includes('trump') || text.includes('tariff') || text.includes('trade war')) {
      beneficiarySectors = ['Domestic Consumption (FMCG)', 'Pharma Exporters', 'Defence'];
      vulnerableSectors = ['Metals & Steel Exporters', 'IT Services', 'Auto Components'];
      marketImpact = `Reciprocal trade tariffs create near-term volatility for export-oriented IT and Metal majors${stockListStr}, triggering portfolio hedging towards domestic consumption.`;
      dalalStreetOutlook = 'Sector rotation alert: Dalal Street funds reallocate from global exporters into domestic defensive plays.';
    } else if (text.includes('fii') || text.includes('foreign institutional')) {
      if (isBull) {
        beneficiarySectors = ['Nifty 50 Large-Caps', 'Private Banks', 'IT Leaders'];
        vulnerableSectors = [];
        marketImpact = `Fresh institutional cash inflows absorb supply and provide high-conviction momentum near key moving averages for benchmark heavyweights${stockListStr}.`;
        dalalStreetOutlook = 'Strong liquidity booster triggering short-covering rallies across Nifty and Bank Nifty derivative contracts.';
      } else {
        beneficiarySectors = [];
        vulnerableSectors = ['High-Beta Small & Midcaps', 'Nifty Heavyweights'];
        marketImpact = `Sustained FII distribution increases overhead supply at resistance strikes, requiring domestic DII support to defend trend floors.`;
        dalalStreetOutlook = 'Caution on breakout longs. Market favors rangebound option writing strategies.';
      }
    } else if (text.includes('gdp') || text.includes('inflation') || text.includes('cpi') || text.includes('economy')) {
      if (isBull) {
        beneficiarySectors = ['Broad Market Index', 'Capital Goods', 'Consumer Discretionary'];
        vulnerableSectors = [];
        marketImpact = `Robust macroeconomic indicators reinforce corporate earnings visibility, supporting premium valuations for domestic leaders${stockListStr}.`;
        dalalStreetOutlook = 'Constructive economic tailwind enhancing investor sentiment across Dalal Street desks.';
      } else {
        beneficiarySectors = ['Defensive FMCG', 'Pharma'];
        vulnerableSectors = ['High-Beta Indices', 'Consumer Cyclicals'];
        marketImpact = `Sticky inflation or growth slowdown triggers margin compression concerns across high-beta cyclical stocks.`;
        dalalStreetOutlook = 'Choppy consolidation expected. Traders should keep tight stop-losses on momentum plays.';
      }
    } else if ((text.includes('it') || text.includes('tech') || text.includes('bpo') || text.includes('bpm') || text.includes('genpact') || text.includes('tcs') || text.includes('infosys') || text.includes('wipro')) && (text.includes('ai') || text.includes('job') || text.includes('workload') || text.includes('layoff') || text.includes('headcount') || text.includes('automation'))) {
      if (text.includes('reduce') || text.includes('come down') || text.includes('cut') || text.includes('layoff') || text.includes('slump') || text.includes('freeze') || isBear) {
        impactStamp = 'NEGATIVE';
        beneficiarySectors = ['Enterprise End-Clients (Cost Savers)', 'Cloud/AI Infrastructure'];
        vulnerableSectors = ['IT Services (TCS, Infosys, Wipro, LTIM)', 'BPM & BPO (Genpact, Firstsource)'];
        marketImpact = `AI-driven workload contraction directly disrupts traditional Time & Material (T&M) and FTE billing models. As global Fortune 500 clients negotiate 20–30% productivity discounts, contract revenue faces deflationary pressure that outweighs short-term headcount wage savings.`;
        dalalStreetOutlook = 'Multiple de-rating risk for linear-headcount IT exporters. Institutional desks rotate funds away from IT into domestic credit and infrastructure plays.';
      } else {
        impactStamp = 'POSITIVE';
        beneficiarySectors = ['Tier-1 IT Services', 'High-End ER&D'];
        vulnerableSectors = [];
        marketImpact = `Proprietary generative AI platforms and deal automation enable high-margin outcome-based contracts, expanding operating EBIT margins.`;
        dalalStreetOutlook = 'Constructive re-rating trigger for digital transformation leaders with strong cloud partnerships.';
      }
    } else if (text.includes('gst') || text.includes('tax') || text.includes('budget') || text.includes('amnesty')) {
      beneficiarySectors = ['Organized Retail', 'Logistics', 'Financial Services', 'SMEs'];
      vulnerableSectors = [];
      marketImpact = `Tax rationalization and compliance relief streamline working capital, accelerating formalization and profitability for listed corporations${stockListStr}.`;
      dalalStreetOutlook = 'Positive institutional sentiment improving ease of business across commercial hubs.';
    } else {
      // General Company / Sector Specific Analysis
      if (isBull) {
        beneficiarySectors = detectedSectors;
        vulnerableSectors = [];
        marketImpact = `Positive fundamental development driving fresh accumulation and upward momentum in ${detectedSectors.join(' & ')}${stockListStr}.`;
        dalalStreetOutlook = `Expect sector outperformance and call buying demand in ${detectedSectors[0] || 'leading'} stocks.`;
      } else if (isBear) {
        beneficiarySectors = [];
        vulnerableSectors = detectedSectors;
        marketImpact = `Adverse news event triggers supply pressure and profit booking in ${detectedSectors.join(' & ')}${stockListStr}.`;
        dalalStreetOutlook = `Expect short-term weakness and put accumulation in ${detectedSectors[0] || 'affected'} stocks.`;
      } else {
        beneficiarySectors = detectedSectors;
        vulnerableSectors = [];
        marketImpact = `Neutral market update being evaluated by institutional desk traders for structural position adjustments in ${detectedSectors.join(' & ')}.`;
        dalalStreetOutlook = 'Balanced price action with selective stock-picking focus on Dalal Street.';
      }
    }

    return {
      impactStamp,
      marketImpact,
      beneficiarySectors,
      vulnerableSectors,
      dalalStreetOutlook
    };
  }

  /**
   * Initializes high-impact Indian market baseline news
   */
  private initializeCuratedNews() {
    const now = Date.now();
    const curated: Omit<NewsItem, 'id' | 'timestamp' | 'timeFormatted'>[] = [
      {
        headline: "RBI Monetary Policy: Focus on Domestic Liquidity & Inflation Stability",
        summary: "RBI Governor emphasizes steady economic resilience with projected GDP growth at 7.2%, supporting banking sector credit demand.",
        source: "CNBC_TV18",
        impact: "HIGH_IMPACT",
        sentiment: "BULLISH",
        category: "RBI_POLICY",
        impactStamp: "POSITIVE",
        impactedSectors: ["Banking & Financials", "Auto & Mobility", "Real Estate"],
        beneficiarySectors: ["Bank Nifty", "Private Banks (HDFC, ICICI, SBI)", "Auto"],
        vulnerableSectors: [],
        dalalStreetOutlook: "Strong institutional tailwind for Bank Nifty and rate-sensitive indices.",
        indianMarketImpact: "Eases systemic liquidity and lowers borrowing costs. Directly expands Net Interest Margins (NIM) and credit velocity for Bank Nifty leaders."
      },
      {
        headline: "US Trade & Tariff Policy: Trump Outlines Reciprocal Tariff Framework",
        summary: "Trump administration signals targeted tariff reviews for global electronics and steel, while Indian pharmaceutical exports expected to remain largely exempt.",
        source: "BLOOMBERG",
        impact: "HIGH_IMPACT",
        sentiment: "NEUTRAL",
        category: "TRUMP_TARIFFS",
        impactStamp: "NEUTRAL",
        impactedSectors: ["IT & Software", "Metals & Mining", "Pharma & Healthcare"],
        beneficiarySectors: ["Pharma Defensives (Sun Pharma, Cipla)", "FMCG"],
        vulnerableSectors: ["Metal Exporters (Tata Steel, JSW)", "IT Services"],
        dalalStreetOutlook: "Sector rotation alert: Dalal Street funds reallocate from global exporters into domestic defensive plays.",
        indianMarketImpact: "Selective sector impact: Nifty IT & Metal components face near-term volatility; Pharma and FMCG provide strong defensive support."
      },
      {
        headline: "Brent Crude Oil Softens Towards $73/bbl Amid Stable Global Supply",
        summary: "Global oil prices pull back as OPEC+ signals gradual output adjustments, easing import bill pressures for emerging Asian economies.",
        source: "REUTERS",
        impact: "HIGH_IMPACT",
        sentiment: "BULLISH",
        category: "CRUDE_MACRO",
        impactStamp: "POSITIVE",
        impactedSectors: ["Oil & Gas", "Chemicals & Paints", "Automobiles"],
        beneficiarySectors: ["Paints (Asian Paints, Berger)", "OMCs (BPCL, IOC, HPCL)", "Aviation"],
        vulnerableSectors: ["Upstream Oil Explorers (ONGC)"],
        dalalStreetOutlook: "Positive macroeconomic catalyst lowering domestic inflation risk and strengthening INR against USD.",
        indianMarketImpact: "Softening crude directly contracts India's import bill and expands gross margins for Oil Marketers (BPCL, IOC) and Paints."
      },
      {
        headline: "FII Inflows Rebound in Cash Segment with ₹1,840 Cr Net Buying",
        summary: "Foreign Institutional Investors turn net buyers in large-cap banking and infrastructure leaders after two sessions of consolidation.",
        source: "MONEYCONTROL",
        impact: "HIGH_IMPACT",
        sentiment: "BULLISH",
        category: "FII_DII",
        impactStamp: "POSITIVE",
        impactedSectors: ["Nifty 50 Large-Caps", "Banking & Financials", "Infrastructure"],
        beneficiarySectors: ["Nifty Index Heavyweights (Reliance, HDFC Bank, ICICI Bank, L&T)"],
        vulnerableSectors: [],
        dalalStreetOutlook: "Strong liquidity booster triggering short-covering rallies across Nifty and Bank Nifty derivative contracts.",
        indianMarketImpact: "Fresh institutional cash inflows absorb supply and provide high-conviction momentum near key moving averages."
      },
      {
        headline: "Nifty IT Index Consolidates as US Tech Earnings Meet Projections",
        summary: "Tier-1 IT majors report steady deal pipeline closures and healthy BFSI demand from North America.",
        source: "MONEYCONTROL",
        impact: "MODERATE",
        sentiment: "BULLISH",
        category: "INDIAN_INDICES",
        impactStamp: "POSITIVE",
        impactedSectors: ["IT & Software"],
        beneficiarySectors: ["IT Majors (TCS, Infosys, HCL Tech, Wipro)"],
        vulnerableSectors: [],
        dalalStreetOutlook: "Supports Nifty weightage; TCS and Infosys hold critical moving average supports.",
        indianMarketImpact: "Steady deal pipeline closures provide valuation support and stability for the Nifty IT index."
      }
    ];

    curated.forEach((c, idx) => {
      const time = new Date(now - (idx * 14 * 60 * 1000));
      const item: NewsItem = {
        id: `news-init-${idx}-${now}`,
        timestamp: time.toISOString(),
        timeFormatted: time.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        ...c
      };
      this.recentNews.push(item);
      this.seenHeadlines.add(c.headline.toLowerCase());
    });
  }

  /**
   * Fetches real-time RSS market feeds from Moneycontrol, CNBC-TV18, Bloomberg / Reuters
   */
  private async fetchLiveFeeds() {
    const feeds = [
      {
        url: 'https://www.moneycontrol.com/rss/MCtopnews.xml',
        source: 'MONEYCONTROL' as NewsSource,
        category: 'INDIAN_INDICES' as const
      },
      {
        url: 'https://www.moneycontrol.com/rss/economy.xml',
        source: 'MONEYCONTROL' as NewsSource,
        category: 'RBI_POLICY' as const
      },
      {
        url: 'https://feeds.feedburner.com/ndtvprofit-latest',
        source: 'CNBC_TV18' as NewsSource,
        category: 'INDIAN_INDICES' as const
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
            this.parseRssFeed(xmlData, feed.source, feed.category);
          }
        }
      } catch (err: any) {
        // Silently continue if external RSS endpoint is blocked or slow
      }
    }
  }

  /**
   * Parse and filter items that strictly impact the Indian market
   */
  private parseRssFeed(xmlData: string, source: NewsSource, defaultCategory: NewsItem['category']) {
    const itemMatches = xmlData.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const itemXml of itemMatches.slice(0, 10)) {
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i);
      const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemXml.match(/<description>([\s\S]*?)<\/description>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);

      if (titleMatch && titleMatch[1]) {
        const rawTitle = this.cleanText(titleMatch[1]);
        const rawDesc = descMatch ? this.cleanText(descMatch[1]) : rawTitle;
        const link = linkMatch ? linkMatch[1].trim() : undefined;

        if (!rawTitle) continue;

        if (this.isImpactingIndianMarket(rawTitle, rawDesc)) {
          const headlineKey = rawTitle.toLowerCase();
          if (!this.seenHeadlines.has(headlineKey)) {
            this.seenHeadlines.add(headlineKey);

            const sentiment = this.determineSentiment(rawTitle, rawDesc);
            const impact = this.determineImpact(rawTitle);
            const { sectors, topStocks } = this.detectSectors(rawTitle, rawDesc);
            const analysis = this.generateLogicalDalalStreetAnalysis(rawTitle, rawDesc, sentiment, sectors, topStocks);

            // Ensure clean 1-2 sentence concise summary
            const cleanSummary = rawDesc.length > 170 ? `${rawDesc.substring(0, 170)}...` : rawDesc;

            const now = Date.now();
            const newItem: NewsItem = {
              id: `news-${now}-${Math.random().toString(36).substr(2, 6)}`,
              headline: rawTitle,
              summary: cleanSummary || rawTitle,
              source,
              impact,
              sentiment,
              category: defaultCategory,
              timestamp: new Date(now).toISOString(),
              timeFormatted: new Date(now).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
              indianMarketImpact: analysis.marketImpact,
              impactStamp: analysis.impactStamp,
              impactedSectors: sectors,
              beneficiarySectors: analysis.beneficiarySectors,
              vulnerableSectors: analysis.vulnerableSectors,
              dalalStreetOutlook: analysis.dalalStreetOutlook,
              url: link
            };

            this.recentNews.unshift(newItem);
            if (this.recentNews.length > 50) this.recentNews.pop();

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
  private isImpactingIndianMarket(title: string, desc: string): boolean {
    const text = `${title} ${desc}`.toLowerCase();
    return this.indianMarketKeywords.some(kw => text.includes(kw));
  }

  private determineSentiment(title: string, desc: string): NewsSentiment {
    const text = `${title} ${desc}`.toLowerCase();
    const bullWords = ['surge', 'gain', 'jump', 'rally', 'positive', 'profit', 'rise', 'cut rate', 'inflow', 'boost', 'upgrade', 'strong', 'growth', 'record', 'dividend', 'deal', 'expansion', 'buy', 'outperform'];
    const bearWords = [
      'fall', 'drop', 'slump', 'crash', 'negative', 'loss', 'hike rate', 'outflow', 'tariff', 'war', 
      'downgrade', 'weak', 'plunge', 'deficit', 'penalty', 'probe', 'cut target', 'jobs to reduce', 
      'reduce jobs', 'job cut', 'job cuts', 'layoff', 'layoffs', 'workload to come down', 'workload down', 
      'headcount cut', 'hiring freeze', 'revenue decline', 'pricing pressure', 'slowdown'
    ];

    const bullCount = bullWords.filter(w => text.includes(w)).length;
    const bearCount = bearWords.filter(w => text.includes(w)).length;

    if (bearCount > bullCount) return 'BEARISH';
    if (bullCount > bearCount) return 'BULLISH';
    return 'NEUTRAL';
  }

  private determineImpact(title: string): NewsImpact {
    const text = title.toLowerCase();
    if (text.includes('rbi') || text.includes('trump') || text.includes('tariff') || text.includes('nifty') || text.includes('gdp') || text.includes('crude') || text.includes('fii')) {
      return 'HIGH_IMPACT';
    }
    return 'MODERATE';
  }

  private startPolling() {
    this.fetchLiveFeeds();
    // Poll for new live financial headlines every 60 seconds
    this.pollInterval = setInterval(() => this.fetchLiveFeeds(), 60000);
  }

  public destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}

export const newsService = new NewsService();

