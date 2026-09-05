import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import type { IndexSymbol, MarketIndexState, SurgeEvent, DataSourceMode, FyersConfig, DhanConfig, ActiveBroker, NewsItem, TargetHitEvent, SquareOffEvent, HeroZeroSignal, GlobalIndexItem, ActiveTradeTipData, HighProbabilityFlashEvent } from '../types';
import { soundManager } from '../utils/audioAlert';
import { isContractOrSignalExpired } from '../utils/expiryHelper';

interface MarketContextType {
  indices: Record<IndexSymbol, MarketIndexState | null>;
  indicesReceivedAt: Record<string, number>; // client-side ms timestamp when each symbol's data last arrived
  selectedIndex: IndexSymbol;
  setSelectedIndex: (sym: IndexSymbol) => void;
  visibleIndices: IndexSymbol[];
  toggleIndexVisibility: (sym: IndexSymbol) => void;
  setVisibleSymbols: (syms: IndexSymbol[]) => void;
  currentIndexState: MarketIndexState | null;
  recentSurges: SurgeEvent[];
  selectedSurges: SurgeEvent[];
  strikeRange: number;
  setStrikeRange: (range: number) => void;
  isConnected: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  testSound: () => void;
  setOptionExpiry: (expiry: string) => Promise<void>;
  dataSource: DataSourceMode;
  setDataSource: (mode: DataSourceMode) => Promise<void>;
  // Multi-Broker Engine
  activeBroker: ActiveBroker;
  effectiveBroker: 'DHAN' | 'FYERS' | 'SIMULATOR';
  selectBroker: (broker: ActiveBroker) => Promise<void>;
  // Dhan Provider
  dhanConfig: DhanConfig;
  connectDhan: (clientId: string, accessToken: string) => Promise<{ success: boolean; message: string; userName?: string }>;
  disconnectDhan: () => Promise<void>;
  // Fyers Provider
  fyersConfig: FyersConfig;
  connectFyers: (appId: string, accessToken: string, secretKey?: string) => Promise<{ success: boolean; message: string; userName?: string }>;
  exchangeAuthCode: (appId: string, secretKey: string, authCode: string) => Promise<{ success: boolean; message: string; userName?: string; accessToken?: string }>;
  latestExtremeSurge: SurgeEvent | null;
  dismissExtremeBanner: () => void;
  // Flash News Engine
  newsList: NewsItem[];
  latestFlashNews: NewsItem | null;
  dismissFlashNews: () => void;
  // Target Hit Flash Engine
  latestTargetHit: TargetHitEvent | null;
  dismissTargetHit: () => void;
  triggerTestTargetHit: () => void;
  // High-Probability Call/Put Flash Engine
  latestHighProbFlash: HighProbabilityFlashEvent | null;
  dismissHighProbFlash: () => void;
  triggerTestHighProbFlash: (flash?: HighProbabilityFlashEvent) => void;
  // 0DTE Hero-or-Zero Flash Alert Engine
  latestHeroZeroFlash: HeroZeroSignal | null;
  dismissHeroZeroFlash: () => void;
  triggerTestHeroZeroFlash: (signal?: HeroZeroSignal) => void;
  // Emergency Square Off Alert Engine
  latestSquareOffAlert: SquareOffEvent | null;
  dismissSquareOffAlert: () => void;
  // Global International Indices & Macro Context
  globalIndices: GlobalIndexItem[];
  globalMarketContext: import('../types').GlobalMarketContextData | null;
  refreshIndexStates: () => Promise<void>;
  // Active Trade Tip Modal Engine
  activeTradeTipModal: ActiveTradeTipData | null;
  openTradeTipModal: (tip: ActiveTradeTipData) => void;
  closeTradeTipModal: () => void;
  // Live Entity Chart Modal Engine
  activeChartModal: { symbol: string; tipContext?: ActiveTradeTipData } | null;
  openChartModal: (symbol: string, tipContext?: ActiveTradeTipData) => void;
  closeChartModal: () => void;
  // Live Options Data Table Modal Engine
  activeOptionsDataModal: { symbol: string; tipContext?: ActiveTradeTipData } | null;
  openOptionsDataModal: (symbol: string, tipContext?: ActiveTradeTipData) => void;
  closeOptionsDataModal: () => void;
}

import { getApiBase, getWsUrl, PROD_API_BASE, PROD_WS_URL } from '../utils/apiBase';
export { getApiBase, getWsUrl, PROD_API_BASE, PROD_WS_URL };


const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [indices, setIndices] = useState<Record<IndexSymbol, MarketIndexState | null>>({
    NIFTY: null,
    BANKNIFTY: null,
    SENSEX: null,
    BANKEX: null,
    FINNIFTY: null,
    MIDCPNIFTY: null,
    NIFTYNXT50: null
  });

  // Client-side receive timestamps — records Date.now() when each symbol's data last arrived.
  // Used for freshness checks in UI components. More reliable than server-side updatedAtIso
  // because it works even when older server cache entries don't have that field.
  const [indicesReceivedAt, setIndicesReceivedAt] = useState<Record<string, number>>({});
  const [selectedIndex, setSelectedIndex] = useState<IndexSymbol>('NIFTY');

  const [visibleIndices, setVisibleIndices] = useState<IndexSymbol[]>(() => {
    const saved = localStorage.getItem('oi_radar_visible_indices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['NIFTY', 'BANKNIFTY', 'SENSEX', 'BANKEX', 'FINNIFTY', 'MIDCPNIFTY'];
  });

  const visibleIndicesRef = useRef<IndexSymbol[]>(visibleIndices);
  useEffect(() => {
    visibleIndicesRef.current = visibleIndices;
  }, [visibleIndices]);

  const [recentSurges, setRecentSurges] = useState<SurgeEvent[]>([]);
  const [strikeRange, setStrikeRange] = useState<number>(200);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dataSource, setDataSourceState] = useState<DataSourceMode>('FYERS_LIVE');
  const [fyersConfig, setFyersConfig] = useState<FyersConfig>({
    appId: '',
    accessToken: '',
    isConnected: false
  });

  // Dhan & Multi-Broker Platform States
  const [dhanConfig, setDhanConfig] = useState<DhanConfig>({
    clientId: '',
    accessToken: '',
    isConnected: false
  });
  const [activeBroker, setActiveBroker] = useState<ActiveBroker>('DHAN');
  const [effectiveBroker, setEffectiveBroker] = useState<'DHAN' | 'FYERS' | 'SIMULATOR'>('SIMULATOR');

  const [latestExtremeSurge, setLatestExtremeSurge] = useState<SurgeEvent | null>(null);

  // Flash News State
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [latestFlashNews, setLatestFlashNews] = useState<NewsItem | null>(null);

  // Target Hit Flash Engine State
  const [latestTargetHit, setLatestTargetHit] = useState<TargetHitEvent | null>(null);
  const hitTargetsSetRef = useRef<Set<string>>(new Set());

  // High-Probability Prime Call/Put Flash Engine State
  const [latestHighProbFlash, setLatestHighProbFlash] = useState<HighProbabilityFlashEvent | null>(null);
  const dismissHighProbFlash = useCallback(() => {
    setLatestHighProbFlash(null);
  }, []);
  const triggerTestHighProbFlash = useCallback((flash?: HighProbabilityFlashEvent) => {
    if (flash) {
      setLatestHighProbFlash(flash);
    } else {
      setLatestHighProbFlash({
        id: `test-highprob-${Date.now()}`,
        symbol: 'NIFTY',
        direction: 'CALL',
        timestamp: new Date().toISOString(),
        tip: {
          id: `test-tip-${Date.now()}`,
          symbol: 'NIFTY',
          tier: 'PRIMARY_MOMENTUM',
          tierLabel: '🟢 Prime High-Probability CALL',
          session: 'MID_MORNING_TREND',
          sessionName: 'Mid-Morning Trend Session',
          action: 'BUY_CALL',
          contractSymbol: 'NIFTY 24200 CE',
          strikePrice: 24200,
          optionType: 'CE',
          entryTime: new Date().toISOString(),
          entryTimeFormatted: '11:15 AM IST',
          entryPrice: 124.50,
          entryRange: '₹122.00 - ₹124.50',
          currentLtp: 124.50,
          stoplossPrice: 102.00,
          stoplossPct: 18,
          target1Price: 159.00,
          target1Pct: 28,
          target2Price: 193.00,
          target2Pct: 55,
          riskReward: '1:2.5',
          confluenceScore: 92,
          status: 'ACTIVE',
          strategyMatches: {
            faydaRadarConfluence: true,
            oiActivitySurge: true,
            faydaStrategy9Ema: true,
            multiTimeframeBreakout: true,
            multiLegSpreadConfirmed: false,
            gammaExplosionConfirmed: false
          },
          strategyTag: 'Institutional Call Covering & Bullish Pivot',
          explanations: {
            beginner: 'High Probability CALL: Buy 1 Lot of 24200 CE near ₹124.50. SL ₹102.00. T1 ₹159.00.',
            intermediate: 'Confluence 92%: Heavy Call covering with positive 1-min delta order flow.',
            expert: 'Delta +0.52, Gamma 0.045, R:R 1:2.5 supported by institutional VWAP anchor.'
          }
        }
      });
    }
    soundManager.playExtremeAlert();
  }, []);

  useEffect(() => {
    (window as any).__triggerTestHighProbFlash = triggerTestHighProbFlash;
  }, [triggerTestHighProbFlash]);

  // Square Off Emergency Alert Engine State
  const [latestSquareOffAlert, setLatestSquareOffAlert] = useState<SquareOffEvent | null>(null);
  const slTriggeredSetRef = useRef<Set<string>>(new Set());

  // Global International Indices State
  const [globalIndices, setGlobalIndices] = useState<GlobalIndexItem[]>([]);
  const [globalMarketContext, setGlobalMarketContext] = useState<import('../types').GlobalMarketContextData | null>(null);

  // Active Trade Tip Modal Engine State
  const [activeTradeTipModal, setActiveTradeTipModal] = useState<ActiveTradeTipData | null>(null);
  const openTradeTipModal = useCallback((tip: ActiveTradeTipData) => {
    setActiveTradeTipModal(tip);
  }, []);
  const closeTradeTipModal = useCallback(() => {
    setActiveTradeTipModal(null);
  }, []);

  // Live Entity Chart Modal Engine State
  const [activeChartModal, setActiveChartModal] = useState<{ symbol: string; tipContext?: ActiveTradeTipData } | null>(null);
  const openChartModal = useCallback((symbol: string, tipContext?: ActiveTradeTipData) => {
    setActiveChartModal({ symbol, tipContext });
  }, []);
  const closeChartModal = useCallback(() => {
    setActiveChartModal(null);
  }, []);

  // Live Options Data Table Modal Engine State
  const [activeOptionsDataModal, setActiveOptionsDataModal] = useState<{ symbol: string; tipContext?: ActiveTradeTipData } | null>(null);
  const openOptionsDataModal = useCallback((symbol: string, tipContext?: ActiveTradeTipData) => {
    setActiveOptionsDataModal({ symbol, tipContext });
  }, []);
  const closeOptionsDataModal = useCallback(() => {
    setActiveOptionsDataModal(null);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const toggleIndexVisibility = useCallback((sym: IndexSymbol) => {
    setVisibleIndices((prev) => {
      let next: IndexSymbol[];
      if (prev.includes(sym)) {
        if (prev.length === 1) return prev;
        next = prev.filter((s) => s !== sym);
      } else {
        next = [...prev, sym];
      }
      localStorage.setItem('oi_radar_visible_indices', JSON.stringify(next));

      if (!next.includes(selectedIndex)) {
        setSelectedIndex(next[0]);
      }
      return next;
    });
  }, [selectedIndex]);

  const setVisibleSymbols = useCallback((symbols: IndexSymbol[]) => {
    if (!symbols || symbols.length === 0) return;
    setVisibleIndices(symbols);
    localStorage.setItem('oi_radar_visible_indices', JSON.stringify(symbols));
    if (!symbols.includes(selectedIndex)) {
      setSelectedIndex(symbols[0]);
    }
  }, [selectedIndex]);

  // 0DTE Hero-or-Zero Flash Alert Engine State
  const [latestHeroZeroFlash, setLatestHeroZeroFlash] = useState<HeroZeroSignal | null>(null);

  const dismissFlashNews = useCallback(() => {
    setLatestFlashNews(null);
  }, []);

  const dismissTargetHit = useCallback(() => {
    setLatestTargetHit(null);
  }, []);

  const dismissHeroZeroFlash = useCallback(() => {
    setLatestHeroZeroFlash(null);
  }, []);

  const dismissSquareOffAlert = useCallback(() => {
    setLatestSquareOffAlert(null);
  }, []);

  const dismissExtremeBanner = useCallback(() => {
    setLatestExtremeSurge(null);
  }, []);

  const triggerTestHeroZeroFlash = useCallback((customSignal?: HeroZeroSignal) => {
    if (customSignal) {
      setLatestHeroZeroFlash(customSignal);
      if (!isMuted) soundManager.playTargetHitAlert();
      return;
    }

    const currentIdx = indices[selectedIndex] || indices['NIFTY'];
    const atm = currentIdx?.atmStrike || 24200;
    const step = currentIdx?.strikeStep || 50;
    const targetStrike = atm + step;
    const ltp = 18.5;

    const demoSignal: HeroZeroSignal = {
      id: `hz-demo-${Date.now()}`,
      symbol: selectedIndex,
      contractSymbol: `${selectedIndex} ${targetStrike} CE`,
      strike: targetStrike,
      optionType: 'CE',
      ltp,
      entryZone: `₹${ltp.toFixed(2)} - ₹${(ltp * 1.05).toFixed(2)}`,
      stoploss: +(ltp * 0.5).toFixed(2),
      stoplossPct: 50,
      target1x: +(ltp * 2.0).toFixed(2),
      target3x: +(ltp * 3.5).toFixed(2),
      target5x: +(ltp * 5.0).toFixed(2),
      gamma: 0.048,
      gammaScore: 95,
      volume: 680000,
      volumeVelocity: 4.6,
      oiChange1m: -180000,
      oiChangePct: -14.2,
      isShortSqueeze: true,
      squeezeType: 'SHORT_COVERING_CE',
      requiredSpotMovePts: Math.round(step * 0.75),
      riskReward: '1:5.0',
      conviction: 'EXTREME',
      rationale: `Massive Call writers squeeze triggered at ${targetStrike} CE (-14.2% OI). Instant 3.5x–5x 0DTE Gamma explosion in progress!`
    };

    setLatestHeroZeroFlash(demoSignal);
    if (!isMuted) soundManager.playTargetHitAlert();
  }, [selectedIndex, indices, isMuted]);

  const triggerTestTargetHit = () => {
    const isBull = true;
    const currentIdx = indices[selectedIndex] || indices['NIFTY'];
    const atm = currentIdx?.atmStrike || 24500;
    const ltp = 148.5;
    const entry = 110.0;
    const target = 145.0;

    const testHit: TargetHitEvent = {
      id: `th-demo-${Date.now()}`,
      symbol: `${selectedIndex} ${atm} CE`,
      indexSymbol: selectedIndex,
      action: 'BUY CALL',
      isBull,
      entryPrice: entry,
      targetPrice: target,
      currentLtp: ltp,
      stoplossPrice: 92.0,
      pointsGained: +(ltp - entry).toFixed(2),
      roiPct: +(((ltp - entry) / entry) * 100).toFixed(2),
      timestamp: new Date().toISOString(),
      timeFormatted: formatISTTime(null, { showSeconds: true }),
      targetNumber: 1
    };

    setLatestTargetHit(testHit);
    if (!isMuted) {
      soundManager.playTargetHitAlert();
    }
  };

  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsUrl = getWsUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to Live OI & Flash News Engine');
      setIsConnected(true);
      try {
        ws.send(JSON.stringify({ type: 'SET_ACTIVE_SYMBOL', symbol: selectedIndex }));
      } catch {}
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'INITIAL_STATE') {
          if (msg.recentSurges && msg.recentSurges.length > 0) {
            const activeSurges = msg.recentSurges.filter((s: SurgeEvent) => !isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes));
            setRecentSurges(activeSurges);
            const latest = activeSurges.find((s: SurgeEvent) => (s.surgeLevel === 'EXTREME' || s.surgeLevel === 'STRONG') && (s.surgeScore ?? 0) >= 60);
            if (latest) {
              setLatestExtremeSurge(latest);
            }
          }
          if (msg.recentNews) setNewsList(msg.recentNews);
          if (msg.globalIndices) setGlobalIndices(msg.globalIndices);
          if (msg.globalMarketContext) setGlobalMarketContext(msg.globalMarketContext);
          if (msg.dataSource) setDataSourceState(msg.dataSource);
          if (msg.fyersConfig) setFyersConfig(msg.fyersConfig);
          if (msg.dhanConfig) setDhanConfig(msg.dhanConfig);
          if (msg.activeBroker) setActiveBroker(msg.activeBroker);
          if (msg.effectiveBroker) setEffectiveBroker(msg.effectiveBroker);
        } else if (msg.type === 'BROKER_UPDATE') {
          if (msg.dhanConfig) setDhanConfig(msg.dhanConfig);
          if (msg.fyersConfig) setFyersConfig(msg.fyersConfig);
          if (msg.activeBroker) setActiveBroker(msg.activeBroker);
          if (msg.effectiveBroker) setEffectiveBroker(msg.effectiveBroker);
          if (msg.dataSource) setDataSourceState(msg.dataSource);
        } else if (msg.type === 'GLOBAL_INDICES_UPDATE') {
          if (msg.globalIndices) setGlobalIndices(msg.globalIndices);
        } else if (msg.type === 'GLOBAL_MARKET_CONTEXT_UPDATE') {
          if (msg.globalMarketContext) setGlobalMarketContext(msg.globalMarketContext);
        } else if (msg.type === 'QUOTES_UPDATE') {
          if (Array.isArray(msg.quotes)) {
            const now = Date.now();
            setIndices((prev) => {
              let changed = false;
              const next = { ...prev };
              for (const q of msg.quotes) {
                const cur = next[q.symbol];
                if (cur) {
                  if (cur.spotPrice !== q.price || cur.change !== q.change) {
                    next[q.symbol] = {
                      ...cur,
                      spotPrice: q.price,
                      change: q.change,
                      pctChange: q.pctChange
                    };
                    changed = true;
                  }
                }
              }
              return changed ? next : prev;
            });
            setIndicesReceivedAt((prev) => {
              const next = { ...prev };
              for (const q of msg.quotes) {
                next[q.symbol] = now;
              }
              return next;
            });
          }
        } else if (msg.type === 'INDEX_UPDATE') {
          const { symbol, indexState, newSurges } = msg;
          setIndices((prev) => ({ ...prev, [symbol]: indexState }));
          // Stamp client-side receive time — used by UI to determine if data is fresh
          setIndicesReceivedAt((prev) => ({ ...prev, [symbol]: Date.now() }));

          // Check Trade Recommendations Target Hits
          if (indexState && indexState.recommendedTrades) {
            const checkAndTriggerTarget = (pick: any, isBull: boolean) => {
              if (!pick || !pick.strike) return;
              const strikeRow = indexState.strikes?.find((s: any) => s.strikePrice === pick.strike);
              if (!strikeRow) return;

              const liveLtp = isBull ? strikeRow.callLtp : strikeRow.putLtp;
              // ✅ FIX: Extract first number from '₹52.75 (+28%)' → 52.75
              // Old regex /[^0-9.]/ merged digits: '52.7528' → target never hit
              const parsePrice = (s: string) => {
                const m = String(s || '').match(/[\d]+(?:\.[\d]+)?/);
                return m ? parseFloat(m[0]) : 0;
              };
              const entryNum = parseFloat(String(pick.recommendedEntry || '').match(/[\d]+(?:\.[\d]+)?/)?.[0] || '0') || (liveLtp * 0.85);
              const targetNum = parsePrice(pick.target) || (entryNum * 1.30);
              const stoplossNum = parsePrice(pick.stoploss) || (entryNum * 0.88);

              if (liveLtp > 0 && targetNum > 0 && liveLtp >= targetNum) {
                const targetKey = `${symbol}_${isBull ? 'CE' : 'PE'}_${pick.strike}_${Math.round(targetNum)}`;
                if (!hitTargetsSetRef.current.has(targetKey)) {
                  hitTargetsSetRef.current.add(targetKey);
                  
                  const points = +(liveLtp - entryNum).toFixed(2);
                  const roi = +(((liveLtp - entryNum) / entryNum) * 100).toFixed(2);

                  const hitEvent: TargetHitEvent = {
                    id: `th-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    symbol: `${symbol} ${pick.strike} ${isBull ? 'CE' : 'PE'}`,
                    indexSymbol: symbol,
                    action: isBull ? 'BUY CALL' : 'BUY PUT',
                    isBull,
                    entryPrice: +entryNum.toFixed(2),
                    targetPrice: +targetNum.toFixed(2),
                    currentLtp: +liveLtp.toFixed(2),
                    stoplossPrice: +stoplossNum.toFixed(2),
                    pointsGained: points,
                    roiPct: roi,
                    timestamp: new Date().toISOString(),
                    timeFormatted: formatISTTime(null, { showSeconds: true }),
                    targetNumber: 1
                  };

                  setLatestTargetHit(hitEvent);
                  if (!isMuted) {
                    soundManager.playTargetHitAlert();
                  }
                }
              }

              // SL: require confirmed -5% drawdown from entry to prevent false triggers from option noise
              if (liveLtp > 0 && stoplossNum > 0 && liveLtp <= stoplossNum) {
                const drawdownPct = ((entryNum - liveLtp) / entryNum) * 100;
                if (drawdownPct < 5.0) return; // ignore tiny noise oscillations below 5%
                const slKey = `sl_${symbol}_${isBull ? 'CE' : 'PE'}_${pick.strike}_${Math.round(stoplossNum)}`;
                if (!slTriggeredSetRef.current.has(slKey)) {
                  slTriggeredSetRef.current.add(slKey);

                  const lossPts = +(entryNum - liveLtp).toFixed(2);
                  const lossPct = +(((entryNum - liveLtp) / entryNum) * 100).toFixed(2);

                  const slEvent: SquareOffEvent = {
                    id: `sq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    symbol: `${symbol} ${pick.strike} ${isBull ? 'CE' : 'PE'}`,
                    indexSymbol: symbol,
                    action: isBull ? 'BUY CALL' : 'BUY PUT',
                    entryPrice: +entryNum.toFixed(2),
                    stoplossPrice: +stoplossNum.toFixed(2),
                    currentLtp: +liveLtp.toFixed(2),
                    lossPoints: lossPts,
                    lossPct: lossPct,
                    reason: `Stoploss breached at ₹${liveLtp.toFixed(2)} (below ₹${stoplossNum.toFixed(2)} threshold). Sudden counter-trend institutional pressure detected.`,
                    timestamp: new Date().toISOString(),
                    timeFormatted: formatISTTime(null, { showSeconds: true })
                  };

                  setLatestSquareOffAlert(slEvent);
                  if (!isMuted) {
                    soundManager.playExtremeAlert();
                  }
                }
              }
            };

            if (indexState.recommendedTrades.bullishPick) {
              checkAndTriggerTarget(indexState.recommendedTrades.bullishPick, true);
            }
            if (indexState.recommendedTrades.bearishPick) {
              checkAndTriggerTarget(indexState.recommendedTrades.bearishPick, false);
            }
          }

          if (newSurges && newSurges.length > 0) {
            const atm = indexState?.atmStrike;
            const symCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
            const maxRange = symCfg?.defaultRange ? symCfg.defaultRange * 2.5 : 500;
            const validSurges = (atm 
              ? newSurges.filter((s: SurgeEvent) => Math.abs(s.strikePrice - atm) <= maxRange)
              : newSurges
            ).filter((s: SurgeEvent) => !isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes));

            setRecentSurges((prev) => {
              const map = new Map<string, SurgeEvent>();
              validSurges.forEach((s: SurgeEvent) => map.set(s.id, s));
              prev.forEach((s: SurgeEvent) => {
                if (!map.has(s.id) && !isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes)) {
                  map.set(s.id, s);
                }
              });
              return Array.from(map.values()).slice(0, 80);
            });

            // Only trigger flash surge for High-Quality Institutional Momentum (Score >= 60)
            const visibleExtreme = validSurges.find(
              (s: SurgeEvent) => s.surgeLevel === 'EXTREME' && (s.surgeScore ?? 0) >= 60 && !isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes)
            );

            if (visibleExtreme) {
              soundManager.playExtremeAlert();
              setLatestExtremeSurge(visibleExtreme);
            } else {
              const visibleStrong = validSurges.find(
                (s: SurgeEvent) => s.surgeLevel === 'STRONG' && (s.surgeScore ?? 0) >= 60 && !isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes)
              );
              if (visibleStrong) {
                soundManager.playStrongAlert();
                setLatestExtremeSurge(visibleStrong);
              }
            }
          }
        } else if (msg.type === 'FLASH_NEWS') {
          if (msg.newsItem) {
            setNewsList((prev) => [msg.newsItem, ...prev.filter(n => n.id !== msg.newsItem.id)].slice(0, 50));
            setLatestFlashNews(msg.newsItem);
            if (!isMuted) {
              soundManager.playStrongAlert();
            }
          }
        } else if (msg.type === 'DATA_SOURCE_UPDATE') {
          if (msg.dataSource) setDataSourceState(msg.dataSource);
        } else if (msg.type === 'FYERS_STATUS') {
          if (msg.fyersConfig) setFyersConfig(msg.fyersConfig);
          if (msg.dataSource) setDataSourceState(msg.dataSource);

        } else if (msg.type === 'HIGH_PROB_FLASH') {
          if (msg.highProbFlash) {
            setLatestHighProbFlash(msg.highProbFlash);
            if (!isMuted) {
              soundManager.playExtremeAlert();
            }
          }
        } else if (msg.type === 'MARKET_OPEN') {
          // 9:15 AM IST — server cleared all caches. Force full UI refresh.
          console.log('[Market] 🔔 Market opened — refreshing all data...');
          // Trigger immediate re-fetch of all index states
          refreshIndexStates();
          // Optional: play a distinct "market open" bell if not muted
          if (!isMuted) soundManager.play('marketOpen').catch(() => {});
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
    };

    ws.onerror = () => {
      // Browsers fire generic Error events on WS closing; handled seamlessly by onclose reconnect
      try {
        ws.close();
      } catch {}
    };
  }, [isMuted]);

  useEffect(() => {
    connectWs();

    // Immediate initial state fetch via HTTP REST for instant load
    fetch(`${getApiBase()}/api/index-states`)
      .then((r) => r.json())
      .then((states) => {
        if (states && Object.keys(states).length > 0) {
          setIndices((prev) => ({ ...prev, ...states }));
          const now = Date.now();
          const stamps: Record<string, number> = {};
          Object.keys(states).forEach(k => { stamps[k] = now; });
          setIndicesReceivedAt((prev) => ({ ...prev, ...stamps }));
        }
      })
      .catch(() => {});

    // Listen to mobile wake / visibility change / online events
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectWs();
        }
        fetch(`${getApiBase()}/api/index-states`)
          .then((r) => r.json())
          .then((states) => {
            if (states && Object.keys(states).length > 0) {
              setIndices((prev) => ({ ...prev, ...states }));
              const now = Date.now();
              const stamps: Record<string, number> = {};
              Object.keys(states).forEach(k => { stamps[k] = now; });
              setIndicesReceivedAt((prev) => ({ ...prev, ...stamps }));
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleResume);

    // Always poll all symbol states every 5 seconds.
    // The WebSocket only pushes INDEX_UPDATE for the *selected* symbol, so
    // non-selected indices (mini ticker strip, dropdown) stay stale without this.
    const pollInterval = setInterval(() => {
      fetch(`${getApiBase()}/api/index-states`)
        .then((r) => r.json())
        .then((states) => {
          if (states && Object.keys(states).length > 0) {
            setIndices((prev) => ({ ...prev, ...states }));
            const now = Date.now();
            const stamps: Record<string, number> = {};
            Object.keys(states).forEach(k => { stamps[k] = now; });
            setIndicesReceivedAt((prev) => ({ ...prev, ...stamps }));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleResume);
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  // When selected symbol changes, notify backend via WebSocket and REST
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'SET_ACTIVE_SYMBOL', symbol: selectedIndex }));
      } catch {}
    }

    fetch(`${getApiBase()}/api/index-state?symbol=${selectedIndex}`)
      .then((r) => r.json())
      .then((st) => {
        if (st) {
          setIndices((prev) => ({ ...prev, [selectedIndex]: st }));
          setIndicesReceivedAt((prev) => ({ ...prev, [selectedIndex]: Date.now() }));
        }
      })
      .catch(() => {});

    fetch(`${getApiBase()}/api/symbol/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: selectedIndex })
    }).catch(() => {});
  }, [selectedIndex]);

  const handleSelectSymbol = useCallback((sym: IndexSymbol) => {
    setSelectedIndex(sym);
    setVisibleIndices((prev) => {
      if (!prev.includes(sym)) {
        const next = [...prev, sym];
        localStorage.setItem('oi_radar_visible_indices', JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
    if (cfg) {
      setStrikeRange(cfg.defaultRange);
    } else {
      setStrikeRange(100);
    }
  }, [selectedIndex]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const testSound = () => {
    soundManager.playExtremeAlert();
  };

  const fetchBackendJson = async (endpointPath: string, method = 'POST', data?: any): Promise<any> => {
    const apiBase = getApiBase();
    const body = data ? JSON.stringify(data) : undefined;
    const headers: HeadersInit = { 
      'Content-Type': 'application/json',
      'x-admin-key': localStorage.getItem('fayda_admin_key') || 'fayda-terminal-admin-2026'
    };

    const candidates = [
      `${apiBase}${endpointPath}`,
      endpointPath,
      `${PROD_API_BASE}${endpointPath}`,
      `http://localhost:3001${endpointPath}`
    ];

    let lastError = '';

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method, headers, body });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          return json;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    return {
      success: false,
      message: lastError || 'Unable to connect to backend server. Please verify network connection.'
    };
  };

  const setOptionExpiry = async (expiry: string) => {
    try {
      await fetchBackendJson('/api/expiry', 'POST', { symbol: selectedIndex, expiry });
    } catch (e) {
      console.error('Failed to set option expiry:', e);
    }
  };

  const setDataSource = async (mode: DataSourceMode) => {
    setDataSourceState(mode);
    try {
      await fetchBackendJson('/api/datasource', 'POST', { mode });
    } catch (e) {
      console.error('Failed to set data source:', e);
    }
  };

  const connectFyers = async (appId: string, accessToken: string, secretKey?: string) => {
    try {
      const json = await fetchBackendJson('/api/fyers/connect', 'POST', { appId, accessToken, secretKey });
      if (json.success) {
        setFyersConfig({
          appId: appId.includes('-') ? appId : `${appId}-100`,
          secretKey,
          accessToken,
          isConnected: true,
          userName: json.userName
        });
      }
      return json;
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  };

  const exchangeAuthCode = async (appId: string, secretKey: string, authCode: string) => {
    try {
      const json = await fetchBackendJson('/api/fyers/exchange-authcode', 'POST', { appId, secretKey, authCode });
      if (json.success) {
        setFyersConfig({
          appId: appId.includes('-') ? appId : `${appId}-100`,
          secretKey,
          accessToken: json.accessToken || '',
          isConnected: true,
          userName: json.userName
        });
      }
      return json;
    } catch (err: any) {
      return { success: false, message: err.message || 'Auth code exchange failed' };
    }
  };

  const connectDhan = async (clientId: string, accessToken: string) => {
    try {
      const json = await fetchBackendJson('/api/dhan/connect', 'POST', { clientId, accessToken });
      if (json.success) {
        setDhanConfig({
          clientId,
          accessToken,
          isConnected: true,
          userName: json.config?.userName || `Dhan Trader (${clientId})`,
          lastConnected: new Date().toISOString()
        });
        setActiveBroker('DHAN');
        setEffectiveBroker('DHAN');
      }
      return json;
    } catch (err: any) {
      return { success: false, message: err.message || 'Dhan connection failed' };
    }
  };

  const disconnectDhan = async () => {
    try {
      await fetchBackendJson('/api/dhan/disconnect', 'POST', {});
      setDhanConfig({
        clientId: '',
        accessToken: '',
        isConnected: false
      });
      if (activeBroker === 'DHAN') {
        setActiveBroker(fyersConfig.isConnected ? 'FYERS' : 'SIMULATOR');
        setEffectiveBroker(fyersConfig.isConnected ? 'FYERS' : 'SIMULATOR');
      }
    } catch (err) {
      console.warn('Dhan disconnect error:', err);
    }
  };

  const selectBroker = async (broker: ActiveBroker) => {
    setActiveBroker(broker);
    try {
      await fetchBackendJson('/api/broker/select', 'POST', { broker });
    } catch (err) {
      console.warn('Broker select error:', err);
    }
  };

  const selectedSurges = recentSurges.filter((s) => s.indexSymbol === selectedIndex);

  const refreshIndexStates = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/index-states`);
      if (res.ok) {
        const states = await res.json();
        if (states && Object.keys(states).length > 0) {
          setIndices((prev) => ({ ...prev, ...states }));
          const now = Date.now();
          const stamps: Record<string, number> = {};
          Object.keys(states).forEach(k => { stamps[k] = now; });
          setIndicesReceivedAt((prev) => ({ ...prev, ...stamps }));
        }
      }
    } catch {}
  }, []);

  return (
    <MarketContext.Provider
      value={{
        indices,
        indicesReceivedAt,
        selectedIndex,
        setSelectedIndex: handleSelectSymbol,
        visibleIndices,
        toggleIndexVisibility,
        setVisibleSymbols,
        currentIndexState: indices[selectedIndex],
        recentSurges,
        selectedSurges,
        strikeRange,
        setStrikeRange,
        isConnected,
        isMuted,
        toggleMute,
        testSound,
        setOptionExpiry,
        dataSource,
        setDataSource,
        activeBroker,
        effectiveBroker,
        selectBroker,
        dhanConfig,
        connectDhan,
        disconnectDhan,
        fyersConfig,
        connectFyers,
        exchangeAuthCode,
        latestExtremeSurge,
        dismissExtremeBanner,
        newsList,
        latestFlashNews,
        dismissFlashNews,
        latestTargetHit,
        dismissTargetHit,
        triggerTestTargetHit,
        latestHighProbFlash,
        dismissHighProbFlash,
        triggerTestHighProbFlash,
        latestHeroZeroFlash,
        dismissHeroZeroFlash,
        triggerTestHeroZeroFlash,
        latestSquareOffAlert,
        dismissSquareOffAlert,
        globalIndices,
        globalMarketContext,
        refreshIndexStates,
        activeTradeTipModal,
        openTradeTipModal,
        closeTradeTipModal,
        activeChartModal,
        openChartModal,
        closeChartModal,
        activeOptionsDataModal,
        openOptionsDataModal,
        closeOptionsDataModal
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    console.warn('[MarketContext] Hook invoked outside provider, returning fallback');
    return {
      indices: {},
      indicesReceivedAt: {},
      selectedIndex: 'NIFTY',
      setSelectedIndex: () => {},
      visibleIndices: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'],
      toggleIndexVisibility: () => {},
      currentIndexState: null,
      isConnected: true,
      lastUpdated: new Date().toISOString(),
      isMuted: false,
      toggleMute: () => {},
      testSound: () => {},
      latestSurgeEvent: null,
      dismissSurgeAlert: () => {},
      strikeRange: 200,
      setStrikeRange: () => {},
      setOptionExpiry: () => {},
      newsList: [],
      dataSource: 'NSE_FREE',
      setDataSource: () => {},
      activeBroker: 'DHAN',
      effectiveBroker: 'SIMULATOR',
      selectBroker: async () => {},
      dhanConfig: { clientId: '', accessToken: '', isConnected: false },
      connectDhan: async () => ({ success: false, message: 'Fallback' }),
      disconnectDhan: async () => {},
      fyersConfig: { isConfigured: false, appId: '', hasToken: false },
      setFyersConfig: () => {},
      latestTargetHitEvent: null,
      dismissTargetHitAlert: () => {},
      triggerTestTargetHit: () => {},
      latestHeroZeroEvent: null,
      dismissHeroZeroAlert: () => {},
      triggerTestHeroZeroFlash: () => {},
      latestSquareOffAlert: null,
      dismissSquareOffAlert: () => {},
      globalIndices: [],
      globalMarketContext: null,
      activeTradeTipModal: null,
      openTradeTipModal: () => {},
      closeTradeTipModal: () => {},
      activeChartModal: null,
      openChartModal: () => {},
      closeChartModal: () => {},
      activeOptionsDataModal: null,
      openOptionsDataModal: () => {},
      closeOptionsDataModal: () => {}
    };
  }
  return context;
};
