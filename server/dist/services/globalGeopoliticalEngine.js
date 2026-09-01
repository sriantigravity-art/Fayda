// Pre-calibrated Global & Geopolitical Exposure Matrix for Key Indian Universe
export const COMPANY_EXPOSURE_DATABASE = {
    'TCS': {
        symbol: 'TCS',
        name: 'Tata Consultancy Services',
        sector: 'IT Services',
        usRevenuePct: 52,
        exportPct: 92,
        importPct: 4,
        h1bExposure: 65,
        crudeSensitivity: -5,
        usdSensitivity: 75,
        tariffExposure: 15,
        chinaExposure: -10,
        defenseExposure: 5
    },
    'INFY': {
        symbol: 'INFY',
        name: 'Infosys Ltd',
        sector: 'IT Services',
        usRevenuePct: 61,
        exportPct: 95,
        importPct: 3,
        h1bExposure: 72,
        crudeSensitivity: -5,
        usdSensitivity: 80,
        tariffExposure: 18,
        chinaExposure: -10,
        defenseExposure: 5
    },
    'WIPRO': {
        symbol: 'WIPRO',
        name: 'Wipro Ltd',
        sector: 'IT Services',
        usRevenuePct: 58,
        exportPct: 90,
        importPct: 5,
        h1bExposure: 68,
        crudeSensitivity: -5,
        usdSensitivity: 70,
        tariffExposure: 15,
        chinaExposure: -5,
        defenseExposure: 5
    },
    'RELIANCE': {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        sector: 'Oil, Gas & Retail',
        usRevenuePct: 12,
        exportPct: 32,
        importPct: 45,
        h1bExposure: 5,
        crudeSensitivity: 40,
        usdSensitivity: 35,
        tariffExposure: 20,
        chinaExposure: 25,
        defenseExposure: 10
    },
    'HDFCBANK': {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        sector: 'Banking & Financials',
        usRevenuePct: 0,
        exportPct: 0,
        importPct: 0,
        h1bExposure: 0,
        crudeSensitivity: -30,
        usdSensitivity: -25,
        tariffExposure: 5,
        chinaExposure: 0,
        defenseExposure: 0
    },
    'ICICIBANK': {
        symbol: 'ICICIBANK',
        name: 'ICICI Bank Ltd',
        sector: 'Banking & Financials',
        usRevenuePct: 0,
        exportPct: 0,
        importPct: 0,
        h1bExposure: 0,
        crudeSensitivity: -30,
        usdSensitivity: -20,
        tariffExposure: 5,
        chinaExposure: 0,
        defenseExposure: 0
    },
    'SBIN': {
        symbol: 'SBIN',
        name: 'State Bank of India',
        sector: 'PSU Banking',
        usRevenuePct: 0,
        exportPct: 0,
        importPct: 0,
        h1bExposure: 0,
        crudeSensitivity: -35,
        usdSensitivity: -25,
        tariffExposure: 5,
        chinaExposure: 0,
        defenseExposure: 15
    },
    'TATAMOTORS': {
        symbol: 'TATAMOTORS',
        name: 'Tata Motors Ltd (JLR)',
        sector: 'Automobiles',
        usRevenuePct: 24,
        exportPct: 65,
        importPct: 30,
        h1bExposure: 10,
        crudeSensitivity: -45,
        usdSensitivity: 50,
        tariffExposure: 60,
        chinaExposure: 40,
        defenseExposure: 25
    },
    'TATASTEEL': {
        symbol: 'TATASTEEL',
        name: 'Tata Steel Ltd',
        sector: 'Metals & Mining',
        usRevenuePct: 8,
        exportPct: 35,
        importPct: 25,
        h1bExposure: 0,
        crudeSensitivity: -20,
        usdSensitivity: 30,
        tariffExposure: 70,
        chinaExposure: 85,
        defenseExposure: 15
    },
    'SUNPHARMA': {
        symbol: 'SUNPHARMA',
        name: 'Sun Pharmaceutical Industries',
        sector: 'Pharma & Healthcare',
        usRevenuePct: 32,
        exportPct: 65,
        importPct: 20,
        h1bExposure: 15,
        crudeSensitivity: -10,
        usdSensitivity: 60,
        tariffExposure: 25,
        chinaExposure: 15,
        defenseExposure: 0
    },
    'ASIANPAINT': {
        symbol: 'ASIANPAINT',
        name: 'Asian Paints Ltd',
        sector: 'Paints & Chemicals',
        usRevenuePct: 2,
        exportPct: 5,
        importPct: 40,
        h1bExposure: 0,
        crudeSensitivity: -85,
        usdSensitivity: -40,
        tariffExposure: 5,
        chinaExposure: 10,
        defenseExposure: 0
    },
    'BPCL': {
        symbol: 'BPCL',
        name: 'Bharat Petroleum Corp',
        sector: 'Oil Marketing (OMC)',
        usRevenuePct: 0,
        exportPct: 8,
        importPct: 75,
        h1bExposure: 0,
        crudeSensitivity: -90,
        usdSensitivity: -60,
        tariffExposure: 5,
        chinaExposure: 0,
        defenseExposure: 0
    },
    'LT': {
        symbol: 'LT',
        name: 'Larsen & Toubro Ltd',
        sector: 'Infrastructure & Capital Goods',
        usRevenuePct: 6,
        exportPct: 38,
        importPct: 15,
        h1bExposure: 10,
        crudeSensitivity: -25,
        usdSensitivity: 35,
        tariffExposure: 20,
        chinaExposure: 10,
        defenseExposure: 65
    },
    'HAL': {
        symbol: 'HAL',
        name: 'Hindustan Aeronautics Ltd',
        sector: 'Aerospace & Defence',
        usRevenuePct: 2,
        exportPct: 8,
        importPct: 35,
        h1bExposure: 0,
        crudeSensitivity: -10,
        usdSensitivity: -20,
        tariffExposure: 10,
        chinaExposure: 0,
        defenseExposure: 95
    }
};
export class GlobalGeopoliticalEngine {
    /**
     * Main Dispatcher for Global & Macro News
     */
    analyzeNews(title, desc, currentRiskMode = 'NEUTRAL') {
        const text = `${title} ${desc}`.toLowerCase();
        // 1. TRUMP & US TARIFF POLICY ENGINE
        if (text.includes('trump') || text.includes('tariff') || text.includes('reciprocal trade') || text.includes('trade war') || text.includes('us trade')) {
            return this.analyzeTrumpTariffPolicy(title, desc, text, currentRiskMode);
        }
        // 2. H-1B, L-1 & US IMMIGRATION POLICY ENGINE
        if (text.includes('h-1b') || text.includes('h1b') || text.includes('visa') || text.includes('immigration') || (text.includes('it') && (text.includes('workload') || text.includes('jobs to reduce') || text.includes('layoff')))) {
            return this.analyzeH1bAndTechWorkload(title, desc, text, currentRiskMode);
        }
        // 3. CRUDE OIL, OPEC+ & COMMODITIES ENGINE
        if (text.includes('crude') || text.includes('oil') || text.includes('brent') || text.includes('opec') || text.includes('wti') || text.includes('petroleum')) {
            return this.analyzeCrudeCommodity(title, desc, text, currentRiskMode);
        }
        // 4. US FED, FOMC & GLOBAL CENTRAL BANKS ENGINE
        if (text.includes('fed') || text.includes('fomc') || text.includes('powell') || text.includes('treasury yield') || text.includes('ecb') || text.includes('dxy')) {
            return this.analyzeFedAndGlobalMacro(title, desc, text, currentRiskMode);
        }
        // 5. GEOPOLITICAL, WAR, RUSSIA, MIDDLE EAST & RED SEA ENGINE
        if (text.includes('war') || text.includes('russia') || text.includes('ukraine') || text.includes('middle east') || text.includes('israel') || text.includes('iran') || text.includes('red sea') || text.includes('hormuz') || text.includes('pakistan') || text.includes('border')) {
            return this.analyzeGeopoliticalWar(title, desc, text, currentRiskMode);
        }
        // 6. CHINA STIMULUS & INDUSTRIAL POLICY ENGINE
        if (text.includes('china') && (text.includes('stimulus') || text.includes('steel') || text.includes('pmi') || text.includes('property') || text.includes('yuan'))) {
            return this.analyzeChinaStimulus(title, desc, text, currentRiskMode);
        }
        // 7. FII / FPI INSTITUTIONAL CAPITAL FLOWS
        if (text.includes('fii') || text.includes('fpi') || text.includes('foreign institutional') || text.includes('dii flow')) {
            return this.analyzeFiiCapitalFlows(title, desc, text, currentRiskMode);
        }
        // 8. RBI & DOMESTIC MONETARY POLICY
        if (text.includes('rbi') || text.includes('repo rate') || text.includes('monetary policy committee') || text.includes('mpc')) {
            return this.analyzeRbiMonetaryPolicy(title, desc, text, currentRiskMode);
        }
        // 9. DEFAULT CORPORATE / SECTOR MICRO TRANSMISSION
        return this.analyzeGenericDomesticNews(title, desc, text, currentRiskMode);
    }
    /**
     * 1. TRUMP & TARIFF ENGINE
     * Dissect: Country -> Product -> Indian Exporter -> Competitor Tariff Differential -> Relative Advantage
     */
    analyzeTrumpTariffPolicy(title, desc, text, riskMode) {
        const isRelief = text.includes('exempt') || text.includes('cut tariff') || text.includes('lower tariff') || text.includes('deal') || text.includes('relief');
        const isSteelOrMetal = text.includes('steel') || text.includes('metal') || text.includes('aluminum');
        const isPharma = text.includes('pharma') || text.includes('drug') || text.includes('medicine');
        let fundamentalScore = isRelief ? 45 : -40;
        let globalContextScore = riskMode === 'RISK_OFF' ? -35 : -15;
        let marketReactionScore = isRelief ? 30 : -25;
        let impactStamp = isRelief ? 'POSITIVE' : isPharma ? 'NEUTRAL' : 'NEGATIVE';
        let steps = [];
        let whyIndia = '';
        let transmissionMechanism = '';
        let beneficiarySectors = [];
        let vulnerableSectors = [];
        if (isPharma && (text.includes('exempt') || !isSteelOrMetal)) {
            impactStamp = 'POSITIVE';
            fundamentalScore = 55;
            steps = ['Trump Tariff Announcement', 'Pharma Generics Exempted', 'US Revenue Intact (Sun Pharma, Dr Reddy)', 'Relative Advantage vs China'];
            whyIndia = 'US healthcare cost-containment relies on Indian generics; tariffs on competitors create relative market share gains.';
            transmissionMechanism = 'Exemption preservation -> Stable US Dollar realization -> High operating EBITDA margins for Indian generic exporters.';
            beneficiarySectors = ['Pharma & Healthcare (SUNPHARMA, DRREDDY, CIPLA)', 'FMCG Defensives'];
            vulnerableSectors = ['Metal Exporters'];
        }
        else if (isSteelOrMetal) {
            impactStamp = 'NEGATIVE';
            fundamentalScore = -65;
            steps = ['US Steel Tariff Hike', 'Export Landed Cost Rises', 'US Demand Compression', 'Tata Steel & JSW Revenue Margin Squeeze'];
            whyIndia = 'Higher US tariff creates margin compression on direct Indian hot-rolled and cold-rolled coil exports.';
            transmissionMechanism = 'Direct border tariff -> Landed price inflation -> Volume contraction for Indian primary steelmakers.';
            beneficiarySectors = ['Domestic Construction & Infra (Lower Domestic Steel Cost)'];
            vulnerableSectors = ['Metals & Mining (TATASTEEL, JSWSTEEL, HINDALCO)'];
        }
        else {
            steps = ['Trump Trade Policy', 'Global Reciprocal Tariffs', 'Export Sector Realization Watch', 'Portfolio Reallocation to Domestic Themes'];
            whyIndia = 'Tariff reviews prompt institutional rotation from export-reliant cyclicals into domestic consumption, Banks & Infra.';
            transmissionMechanism = 'Export friction -> INR trade balance expectations -> Selective sector outperformance.';
            beneficiarySectors = ['Domestic Consumption (FMCG)', 'Private Banks (HDFCBANK, ICICIBANK)'];
            vulnerableSectors = ['IT Services', 'Metal Exporters', 'Auto Ancillaries'];
        }
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + 0.20 * (isRelief ? 30 : -20));
        return {
            category: 'US_POLITICS_TARIFFS',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 88,
                eventConfidence: 92,
                impactConfidence: 84
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Metals', 'Pharma', 'IT Services', 'Auto Components'],
                mostExposedCompanies: ['TATASTEEL', 'JSWSTEEL', 'SUNPHARMA', 'TATAMOTORS'],
                signalConflict: isPharma ? {
                    hasConflict: true,
                    conflictType: 'COMMODITY_VS_INDEX',
                    description: 'Pharma generic exemptions act as defensive shelter while broader tariff sentiment weighs on cyclicals.'
                } : undefined
            },
            beneficiarySectors,
            vulnerableSectors,
            indianMarketImpact: `Strategic tariff transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isRelief ? 'Supportive trigger for export heavyweights with selective US market share expansion.' : 'Sector rotation alert: Domestic capital allocators rotate into Banks and FMCG defensives.',
            relatedGlobalEvents: ['🌍 US Trade Representative Policy', '🌍 DXY Dollar Index', '🌍 US-China Tariff Gap']
        };
    }
    /**
     * 2. H-1B & TECH WORKLOAD / AI DISRUPTION ENGINE
     * Dissect: AI Workload Reduction / Visa Restrictions -> Billable Hours Compression -> T&M Margins -> Company Specific Sensitivity
     */
    analyzeH1bAndTechWorkload(title, desc, text, riskMode) {
        const isJobCutOrWorkloadDrop = text.includes('jobs to reduce') || text.includes('workload') || text.includes('cut jobs') || text.includes('reduce') || text.includes('layoff') || text.includes('hiring freeze');
        const isVisaRestriction = text.includes('h-1b') || text.includes('visa restriction') || text.includes('higher fee') || text.includes('curb');
        let fundamentalScore = -65;
        let globalContextScore = riskMode === 'RISK_OFF' ? -40 : -20;
        let marketReactionScore = -50;
        let impactStamp = 'NEGATIVE';
        const steps = isJobCutOrWorkloadDrop
            ? ['AI Automation Adoption', 'Workload Contraction', 'Time & Material (T&M) Billing Deflation', 'IT Contract Top-Line Compression', 'TCS / Infosys Multiple De-rating']
            : ['US H-1B Fee / Rule Tightening', 'Onsite Hiring Cost Inflation', 'Operating Margin Compression', 'High-H1B Dependency IT Majors Impacted'];
        const whyIndia = isJobCutOrWorkloadDrop
            ? 'Indian IT giants derive 60%+ revenue from billable hours (FTE model). AI-led workload cuts cause top-line deflation exceeding wage savings.'
            : 'US represents 55-65% of Indian IT revenue; higher visa frictions compress onsite margins and force offshore delivery restructuring.';
        const transmissionMechanism = isJobCutOrWorkloadDrop
            ? 'Client AI productivity discounts (20-30%) -> Contract TCV deflation -> Reduced linear hiring velocity -> Prolonged sector P/E de-rating.'
            : 'Onsite compliance & local subcontractor costs ↑ -> Operating EBIT margin pressure (-60 to -110 bps) for IT services.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore - 15);
        return {
            category: 'H1B_IMMIGRATION',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 92,
                eventConfidence: 94,
                impactConfidence: 90
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['IT Services (High H-1B / FTE)', 'BPM & BPO (Genpact, Firstsource)'],
                mostExposedCompanies: ['INFY', 'TCS', 'WIPRO', 'LTIM'],
                signalConflict: {
                    hasConflict: true,
                    conflictType: 'FUNDAMENTAL_VS_MACRO',
                    description: 'Near-term employee cost cuts are overshadowed by medium-term billable contract revenue deflation.'
                }
            },
            beneficiarySectors: ['Enterprise End-Buyers (Budget Savers)', 'Cloud Hyperscalers'],
            vulnerableSectors: ['IT Services (TCS, INFY, WIPRO)', 'BPO & BPM (Genpact, WNS)'],
            indianMarketImpact: `Deflationary billing transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: 'Institutional funds favor rotation into domestic CapEx, Banks, and Infrastructure over export IT.',
            relatedGlobalEvents: ['🌍 US Enterprise IT Budget Survey', '🌍 NASDAQ Tech Valuation Multiple', '🌍 USD/INR Currency Move']
        };
    }
    /**
     * 3. CRUDE OIL, OPEC+ & COMMODITIES ENGINE
     * Dissect: Brent / WTI Shift -> CAD -> INR -> Inflation -> RBI -> OMCs/Paints vs Upstream Oil
     */
    analyzeCrudeCommodity(title, desc, text, riskMode) {
        const isDrop = text.includes('fall') || text.includes('drop') || text.includes('soften') || text.includes('plunge') || text.includes('slide') || text.includes('ease');
        const isSurge = text.includes('surge') || text.includes('jump') || text.includes('rally') || text.includes('spike') || text.includes('high') || text.includes('cut output');
        const isPositiveForIndia = isDrop && !isSurge;
        const fundamentalScore = isPositiveForIndia ? 70 : -60;
        const globalContextScore = isPositiveForIndia ? 40 : -45;
        const marketReactionScore = isPositiveForIndia ? 50 : -40;
        const impactStamp = isPositiveForIndia ? 'POSITIVE' : 'NEGATIVE';
        const steps = isPositiveForIndia
            ? ['Brent Crude Softens', 'India Oil Import Bill Drops', 'Current Account Deficit (CAD) Narrows', 'INR Appreciates & Inflation Cools', 'Margin Expansion for Paints & OMCs']
            : ['Crude Oil Spikes', 'India Import Bill Expands', 'Trade Deficit & INR Pressure', 'Input Cost Inflation for Manufacturers', 'OMC & Paint Margins Squeezed'];
        const whyIndia = 'India imports 85%+ of its domestic crude consumption. Every $10/bbl drop saves India ~$14B in foreign exchange and cools CPI inflation.';
        const transmissionMechanism = isPositiveForIndia
            ? 'Lower input prices -> Direct gross margin expansion (+200 to +350 bps) for Paints, OMCs, Tyres, and Aviation.'
            : 'Elevated input costs -> Margin contraction for chemical/paint manufacturers and higher domestic fuel subsidy/under-recovery risk.';
        const beneficiarySectors = isPositiveForIndia
            ? ['Paints & Adhesives (ASIANPAINT, BERGER)', 'Oil Marketing (BPCL, IOC, HPCL)', 'Aviation (INDIGO)', 'Automobiles (MARUTI, TATAMOTORS)']
            : ['Upstream Oil Explorers (ONGC, OIL, RELIANCE)'];
        const vulnerableSectors = isPositiveForIndia
            ? ['Upstream Explorers (ONGC, OIL)']
            : ['Paints & Chemicals (ASIANPAINT)', 'Aviation', 'OMCs (BPCL, IOC)', 'Tyres'];
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + (isPositiveForIndia ? 25 : -25));
        return {
            category: 'CRUDE_COMMODITY',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 95,
                eventConfidence: 96,
                impactConfidence: 94
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Oil Marketing', 'Paints & Coatings', 'Aviation', 'Upstream Energy'],
                mostExposedCompanies: ['BPCL', 'IOC', 'ASIANPAINT', 'RELIANCE'],
                signalConflict: {
                    hasConflict: true,
                    conflictType: 'COMMODITY_VS_INDEX',
                    description: isPositiveForIndia
                        ? 'Crude drop is highly bullish for broader Indian indices but causes mild profit booking in upstream exploration (ONGC).'
                        : 'Crude surge benefits Reliance/ONGC but creates inflationary headwinds for 80% of Nifty heavyweights.'
                }
            },
            beneficiarySectors,
            vulnerableSectors,
            indianMarketImpact: `Macro import transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isPositiveForIndia
                ? 'Broad-based tailwind for domestic rate sensitives and consumer cyclicals; strengthens INR support.'
                : 'Bearish macro headwind exerting margin pressure across consumer and transport sectors.',
            relatedGlobalEvents: ['🌍 OPEC+ Production Quotas', '🌍 US Strategic Petroleum Reserve (SPR)', '🌍 Middle East Strait of Hormuz Flows']
        };
    }
    /**
     * 4. US FED & GLOBAL CENTRAL BANKS ENGINE
     * Dissect: Expected vs Actual Rate & Guidance -> FII Inflows -> Multiple Expansion/Compression
     */
    analyzeFedAndGlobalMacro(title, desc, text, riskMode) {
        const isDovish = text.includes('cut rate') || text.includes('dovish') || text.includes('pause') || text.includes('ease') || text.includes('lower yields');
        const isHawkish = text.includes('hike rate') || text.includes('hawkish') || text.includes('sticky inflation') || text.includes('higher for longer');
        const isPositive = isDovish && !isHawkish;
        const fundamentalScore = isPositive ? 60 : -55;
        const globalContextScore = isPositive ? 50 : -45;
        const marketReactionScore = isPositive ? 45 : -35;
        const impactStamp = isPositive ? 'POSITIVE' : 'NEGATIVE';
        const steps = isPositive
            ? ['US Fed Dovish Pivot / Rate Cut', 'US 10Y Yields & DXY Soften', 'Global Liquidity Flows to Emerging Markets', 'FII Inflows Accelerate into Dalal Street', 'Nifty & Bank Nifty Multiples Expand']
            : ['US Fed Hawkish / Yields Spike', 'US Dollar Index (DXY) Surges', 'Emerging Market Outflows Triggered', 'FII Cash Selling Pressure on Nifty Heavyweights', 'Valuation Multiple Compression'];
        const whyIndia = 'FIIs manage over $700B in Indian assets. When US real yields fall, emerging market carry trade expands, directing liquidity to Indian large caps.';
        const transmissionMechanism = isPositive
            ? 'Cheaper global capital -> Strong FII equity buying in Bank Nifty & Large-cap heavyweights -> Valuation multiple expansion.'
            : 'Higher US yields -> Dollar repatriation -> FII net selling in cash segment -> Support level tests for benchmark indices.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + (isPositive ? 20 : -20));
        return {
            category: 'FED_RATES_MACRO',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 90,
                eventConfidence: 92,
                impactConfidence: 88
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Banking & Financials', 'Nifty 50 Large-Caps', 'Tech Exporters'],
                mostExposedCompanies: ['HDFCBANK', 'ICICIBANK', 'RELIANCE', 'INFY']
            },
            beneficiarySectors: isPositive ? ['Private Banks (HDFCBANK, ICICI)', 'Nifty Heavyweights', 'High-Growth Tech'] : ['US Dollar Earning IT Defensives'],
            vulnerableSectors: isPositive ? [] : ['Rate Sensitives', 'High-Beta Midcaps', 'High Debt Capital Goods'],
            indianMarketImpact: `Capital flow transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isPositive ? 'Supportive liquidity backdrop triggering short-covering rallies across Nifty & Bank Nifty contracts.' : 'Defensive stance recommended; watch FII cash flow data near key moving averages.',
            relatedGlobalEvents: ['🌍 US 10-Year Treasury Yield', '🌍 DXY US Dollar Index', '🌍 FII Cash Segment Daily Flow']
        };
    }
    /**
     * 5. GEOPOLITICAL, WAR, RUSSIA & MIDDLE EAST ENGINE
     * Severity (0-7): Safe haven flows (Gold/USD) -> Oil supply risk -> Indian CAD/INR -> Sector transmission
     */
    analyzeGeopoliticalWar(title, desc, text, riskMode) {
        const isDeescalation = text.includes('ceasefire') || text.includes('peace') || text.includes('de-escalat') || text.includes('reopening') || text.includes('deal');
        const isEscalation = text.includes('strike') || text.includes('attack') || text.includes('conflict') || text.includes('sanction') || text.includes('missile') || text.includes('blockade');
        const isPositive = isDeescalation && !isEscalation;
        const fundamentalScore = isPositive ? 50 : -70;
        const globalContextScore = isPositive ? 40 : -60;
        const marketReactionScore = isPositive ? 35 : -50;
        const impactStamp = isPositive ? 'POSITIVE' : 'NEGATIVE';
        const steps = isPositive
            ? ['Geopolitical De-escalation / Ceasefire', 'Safe-Haven Risk Premium Cools', 'Shipping Routes & Oil Supply Stabilize', 'Brent Crude Eases', 'Dalal Street Equity Relief Rally']
            : ['Geopolitical Escalation Event', 'Oil & Shipping Disruption Risk', 'Global Risk-Off: VIX & Gold Surge', 'INR Depreciation & Inflation Risk', 'Defensive Shift on Dalal Street'];
        const whyIndia = 'Geopolitical tensions in Middle East or Eastern Europe directly threaten 80%+ of India oil and energy import shipping lanes, triggering INR and CAD volatility.';
        const transmissionMechanism = isPositive
            ? 'Risk premium compression -> Stable crude supply & lower maritime insurance costs -> Broad equity market relief.'
            : 'Elevated shipping freight & war risk premiums -> Spike in Brent crude & USD/INR -> Institutional de-risking from high-beta equities.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + (isPositive ? 15 : -30));
        return {
            category: 'GEOPOLITICS_WAR',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 88,
                eventConfidence: 90,
                impactConfidence: 86
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Defence & Aerospace (HAL, BEL)', 'Shipping & Logistics', 'Aviation', 'Oil Marketing'],
                mostExposedCompanies: ['HAL', 'BEL', 'BPCL', 'ASIANPAINT']
            },
            beneficiarySectors: isPositive ? ['Aviation', 'Paints', 'OMCs', 'Consumer Cyclicals'] : ['Defence & Aerospace (HAL, BEL)', 'Gold & Jewellers', 'Upstream Oil'],
            vulnerableSectors: isPositive ? ['Defence pure-plays (sentiment cooling)'] : ['Airlines', 'Paints', 'Rate-Sensitives', 'Import-Heavy Manufacturers'],
            indianMarketImpact: `Supply chain & risk premium transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isPositive ? 'Relief rally with expansion in consumer discretionary risk appetite.' : 'Risk-off mode: Portfolio allocation favors Defence, Gold NBFCs, and Cash defensives.',
            relatedGlobalEvents: ['🌍 Strait of Hormuz / Red Sea Transit', '🌍 Crude Oil Risk Premium', '🌍 CBOE VIX Volatility Index']
        };
    }
    /**
     * 6. CHINA STIMULUS & INDUSTRIAL POLICY ENGINE
     */
    analyzeChinaStimulus(title, desc, text, riskMode) {
        const isStimulus = text.includes('stimulus') || text.includes('rate cut') || text.includes('support') || text.includes('boost');
        const fundamentalScore = isStimulus ? 40 : -30;
        const globalContextScore = isStimulus ? 30 : -20;
        const marketReactionScore = isStimulus ? 25 : -15;
        const impactStamp = isStimulus ? 'POSITIVE' : 'NEUTRAL';
        const steps = [
            'China PBOC / Fiscal Stimulus Unveiled',
            'Global Industrial Commodity Demand Revives',
            'LME Copper, Aluminum & Steel Prices Firm Up',
            'Tata Steel & Hindalco Realizations Improve'
        ];
        const whyIndia = 'China produces 55% of global steel. Chinese domestic stimulus prevents metal dumping into Asian markets, supporting Indian steelmaker realizations.';
        const transmissionMechanism = 'Stronger Chinese domestic absorption -> Higher global metal benchmark prices -> Direct EBITDA expansion for Tata Steel, JSW, and Hindalco.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + 10);
        return {
            category: 'CHINA_STIMULUS',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 85,
                eventConfidence: 88,
                impactConfidence: 82
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Metals & Mining (TATASTEEL, JSWSTEEL, HINDALCO)', 'Chemicals', 'Capital Goods'],
                mostExposedCompanies: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL']
            },
            beneficiarySectors: ['Metals & Mining (TATASTEEL, JSWSTEEL, HINDALCO)', 'Commodity Producers'],
            vulnerableSectors: ['Metal Consumers (Auto & Construction facing higher raw material prices)'],
            indianMarketImpact: `Commodity pricing transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: 'Bullish catalyst for Nifty Metal index; watch for call buying momentum in primary steel and non-ferrous producers.',
            relatedGlobalEvents: ['🌍 LME Metal Benchmark Prices', '🌍 China Caixin Manufacturing PMI', '🌍 Yuan USD Exchange Rate']
        };
    }
    /**
     * 7. FII / FPI INSTITUTIONAL FLOWS ENGINE
     */
    analyzeFiiCapitalFlows(title, desc, text, riskMode) {
        const isBuying = text.includes('net buy') || text.includes('inflow') || text.includes('rebound') || text.includes('invest') || text.includes('record buying');
        const isSelling = text.includes('net sell') || text.includes('outflow') || text.includes('pull out') || text.includes('dump');
        const isPositive = isBuying && !isSelling;
        const fundamentalScore = isPositive ? 65 : -60;
        const globalContextScore = isPositive ? 45 : -40;
        const marketReactionScore = isPositive ? 50 : -45;
        const impactStamp = isPositive ? 'POSITIVE' : 'NEGATIVE';
        const steps = isPositive
            ? ['FII Net Buying in Cash Segment', 'Institutional Large-Cap Demand Absorbs Supply', 'Key Moving Average Floors Defended', 'Index Heavyweight Valuation Expansion']
            : ['FII Distribution & Net Cash Outflows', 'Overhead Selling Pressure at Resistance Strikes', 'DII Absorption Test', 'Range-Bound Option Writing Favored'];
        const whyIndia = 'Institutional FII flows dictate momentum in Nifty 50 and Bank Nifty derivative contracts and large-cap spot prices.';
        const transmissionMechanism = isPositive
            ? 'Direct cash market equity accumulation -> Absorbs intraday selling -> Triggers short covering across ATM option strikes.'
            : 'Cash market selling -> Elevated supply at overhead resistance -> Index consolidation and option premium decay.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + (isPositive ? 20 : -20));
        return {
            category: 'FII_FLOWS',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 94,
                eventConfidence: 96,
                impactConfidence: 92
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Nifty 50 Heavyweights', 'Private Banks', 'IT Services'],
                mostExposedCompanies: ['HDFCBANK', 'RELIANCE', 'ICICIBANK', 'INFY', 'LT']
            },
            beneficiarySectors: isPositive ? ['Nifty Index Leaders (Reliance, HDFC Bank, ICICI Bank, L&T)'] : [],
            vulnerableSectors: isPositive ? [] : ['High-Beta Equities', 'Overleveraged Midcaps'],
            indianMarketImpact: `Liquidity flow transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isPositive ? 'Strong liquidity booster supporting bullish continuation towards upper resistance zones.' : 'Caution on breakout longs; market favors range-bound option writing strategies.',
            relatedGlobalEvents: ['🌍 Emerging Market ETF Flows (EEM)', '🌍 USD/INR Currency Stance', '🌍 US 10Y Yield Trajectory']
        };
    }
    /**
     * 8. RBI & DOMESTIC MONETARY POLICY
     */
    analyzeRbiMonetaryPolicy(title, desc, text, riskMode) {
        const isBull = text.includes('cut') || text.includes('pause') || text.includes('liquidity') || text.includes('growth') || text.includes('resilience') || text.includes('stability');
        const isBear = text.includes('hike') || text.includes('tighten') || text.includes('inflation concern');
        const fundamentalScore = isBull ? 65 : -55;
        const globalContextScore = riskMode === 'RISK_OFF' ? -20 : 25;
        const marketReactionScore = isBull ? 50 : -40;
        const impactStamp = isBull ? 'POSITIVE' : 'NEGATIVE';
        const steps = isBull
            ? ['RBI Accommodative / Status Quo Stance', 'Domestic Liquidity & Lending Rates Stable', 'Credit Growth Momentum Intact', 'Bank Nifty & Rate-Sensitives Outperform']
            : ['RBI Hawkish Tightening', 'Cost of Funds Rises for Banks & NBFCs', 'Loan Growth Moderation', 'Rate-Sensitive Valuation Pressure'];
        const whyIndia = 'RBI monetary policy governs borrowing costs for Indian corporations and consumers, driving 35%+ of Nifty weightage (Financials & Auto).';
        const transmissionMechanism = isBull
            ? 'Stable monetary policy -> Predictable Net Interest Margins (NIM) -> Continued 14-16% credit growth velocity for top private lenders.'
            : 'Higher cost of capital -> Margin pressure on NBFCs and high-debt real estate & infrastructure developers.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore + 15);
        return {
            category: 'RBI_POLICY',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 92,
                eventConfidence: 95,
                impactConfidence: 90
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Banking & Financials (Bank Nifty)', 'Automobiles', 'Real Estate & Housing'],
                mostExposedCompanies: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'LT']
            },
            beneficiarySectors: isBull ? ['Bank Nifty (HDFC, ICICI, SBI)', 'Auto & Mobility', 'Housing & Real Estate'] : [],
            vulnerableSectors: isBull ? [] : ['Rate-Sensitive NBFCs', 'High-Debt Infra'],
            indianMarketImpact: `Monetary transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isBull ? 'High-conviction structural tailwind for Bank Nifty and rate-sensitive indices.' : 'Headwind for Financials; expect defensive rotation into FMCG and Pharma.',
            relatedGlobalEvents: ['🌍 India CPI Inflation Print', '🌍 Systemic Banking Liquidity', '🌍 RBI MPC Resolution']
        };
    }
    /**
     * 9. DEFAULT DOMESTIC / MICRO CORPORATE NEWS
     */
    analyzeGenericDomesticNews(title, desc, text, riskMode) {
        const isPositive = text.includes('profit') || text.includes('growth') || text.includes('win') || text.includes('order') || text.includes('upgrade') || text.includes('record');
        const isNegative = text.includes('loss') || text.includes('penalty') || text.includes('probe') || text.includes('fraud') || text.includes('downgrade') || text.includes('slump');
        const fundamentalScore = isPositive ? 50 : isNegative ? -50 : 10;
        const globalContextScore = riskMode === 'RISK_OFF' ? -30 : 0;
        const marketReactionScore = isPositive ? 35 : isNegative ? -35 : 5;
        const impactStamp = isPositive ? 'POSITIVE' : isNegative ? 'NEGATIVE' : 'NEUTRAL';
        const steps = [
            'Corporate Development Announced',
            'Fundamental Earnings / Operational Realization',
            'Sectoral Reallocation on Dalal Street'
        ];
        const whyIndia = 'Direct corporate operational performance impacting listed benchmark equity valuations.';
        const transmissionMechanism = isPositive
            ? 'Revenue / order book accretion directly enhancing forward earnings per share (EPS) visibility.'
            : 'Operational friction or regulatory compliance penalty compressing operating cash flows.';
        const finalFaydaScore = Math.round(0.35 * fundamentalScore + 0.25 * globalContextScore + 0.20 * marketReactionScore);
        return {
            category: 'INDIAN_INDICES',
            impactStamp,
            layeredScores: {
                fundamentalScore,
                globalContextScore,
                marketReactionScore,
                finalFaydaScore,
                confidenceScore: 82,
                eventConfidence: 85,
                impactConfidence: 80
            },
            transmissionPath: {
                steps,
                whyIndia,
                transmissionMechanism,
                mostExposedSectors: ['Domestic Listed Equities'],
                mostExposedCompanies: []
            },
            beneficiarySectors: isPositive ? ['Listed Equities'] : [],
            vulnerableSectors: isNegative ? ['Affected Companies'] : [],
            indianMarketImpact: `Corporate fundamental transmission: ${transmissionMechanism}`,
            dalalStreetOutlook: isPositive ? 'Constructive fundamental update supporting selective stock-picking demand.' : 'Caution on affected company shares; monitor institutional volume reaction.',
            relatedGlobalEvents: ['🌍 Domestic Market Sentiment', '🌍 Benchmark Nifty 50 Level']
        };
    }
}
export const globalGeopoliticalEngine = new GlobalGeopoliticalEngine();
