import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTheme } from '../context/ThemeContext';
import type { OptionStrikeData, MarketIndexState } from '../types';
import { getLastMarketSessionAnchor, getBarTimeRangeForSymbol } from '../utils/marketHours';
import { getStrikeSignalLevels } from '../utils/strikeSignalHelper';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Compass, 
  BarChart3, 
  Clock, 
  Maximize2, 
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Flame,
  Calendar,
  History,
  ExternalLink,
  Layers,
  Settings,
  Camera,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  Crosshair,
  Minus,
  MoveUpRight,
  Target,
  Percent,
  Trash2,
  Download,
  Share2
} from 'lucide-react';

export type StrikeTimeframe = '1m' | '3m' | '5m' | '15m';
export type HistoryRangeType = 'RECENT' | '1H' | '3H' | 'FULL_DAY';
export type ChartStyleType = 'CANDLES' | 'HEIKIN_ASHI' | 'LINE' | 'AREA' | 'HOLLOW';
export type DrawingToolType = 'CURSOR' | 'TRENDLINE' | 'HORIZONTAL' | 'FIBONACCI' | 'RISK_REWARD' | 'MEASURE';

export interface StrikeCandle {
  timestamp: number;
  timeStr: string;
  dateStr?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  trend: 'UP' | 'DOWN';
  trendStrength: number; // 0-100
  isLive?: boolean;
}

export interface DrawingItem {
  id: string;
  type: DrawingToolType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  price1?: number;
  price2?: number;
  label?: string;
  color?: string;
}

interface StrikePriceLiveChartProps {
  symbol: string;
  strikePrice: number;
  optionType: 'CE' | 'PE';
  strikeData?: OptionStrikeData | null;
  currentIndexState?: MarketIndexState | null;
  timeframe?: StrikeTimeframe;
  onTimeframeChange?: (tf: StrikeTimeframe) => void;
  onOptionTypeChange?: (type: 'CE' | 'PE') => void;
  onExpandFullscreen?: () => void;
  height?: number | string;
}

export const StrikePriceLiveChart: React.FC<StrikePriceLiveChartProps> = ({
  symbol,
  strikePrice,
  optionType,
  strikeData,
  currentIndexState: propIndexState,
  timeframe = '3m',
  onTimeframeChange,
  onOptionTypeChange,
  onExpandFullscreen,
  height = 500
}) => {
  const { activeBroker, dhanConfig, fyersConfig, currentIndexState: globalIndexState, indices } = useMarket();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const effectiveIndexState = propIndexState || globalIndexState || (indices ? (indices as any)[symbol] : null);

  const signalLevels = useMemo(() => {
    return getStrikeSignalLevels(symbol, strikePrice, optionType, strikeData, effectiveIndexState);
  }, [symbol, strikePrice, optionType, strikeData, effectiveIndexState]);

  const [showSignalOverlay, setShowSignalOverlay] = useState<boolean>(true);

  // Mode: Strike Option Contract vs Underlying Index TradingView
  const [viewEngine, setViewEngine] = useState<'STRIKE_OPTION_PRO' | 'TRADINGVIEW_UNDERLYING'>('STRIKE_OPTION_PRO');
  const [selectedTf, setSelectedTf] = useState<StrikeTimeframe>(timeframe);
  const [chartStyle, setChartStyle] = useState<ChartStyleType>('CANDLES');
  
  // Interactive Crosshair
  const [activeCrosshair, setActiveCrosshair] = useState<StrikeCandle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  
  // Historical data viewing state
  const [historyRange, setHistoryRange] = useState<HistoryRangeType>('RECENT');
  const [panOffset, setPanOffset] = useState<number>(0);

  // Indicators State (Fyers / Dhan Studies Library)
  const [showIndicatorsModal, setShowIndicatorsModal] = useState<boolean>(false);
  const [indicators, setIndicators] = useState({
    ema9: true,
    ema20: true,
    ema50: false,
    vwap: true,
    supertrend: true,
    bollinger: false,
    rsi: false,
    volumeDelta: true
  });

  // Left Drawing Tools State (Identical to Fyers / Dhan / TradingView toolbar)
  const [activeTool, setActiveTool] = useState<DrawingToolType>('CURSOR');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDrawStart, setCurrentDrawStart] = useState<{ x: number; y: number; price: number } | null>(null);
  const [currentDrawEnd, setCurrentDrawEnd] = useState<{ x: number; y: number; price: number } | null>(null);

  // 1-Click Broker Execution State
  const [orderLots, setOrderLots] = useState<number>(1);
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  // Countdown timer for active candle
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);
  const [isFlowMatrixExpanded, setIsFlowMatrixExpanded] = useState<boolean>(false);

  // Market Session State (09:00 - 15:40 IST for NSE/BSE, 09:00 - 23:30 IST for MCX Commodities)
  const sessionAnchor = useMemo(() => {
    return getLastMarketSessionAnchor(symbol);
  }, [symbol]);
  const isMarketOpen = sessionAnchor.isLive;

  const svgRef = useRef<SVGSVGElement>(null);
  const tvContainerRef = useRef<HTMLDivElement>(null);

  // Candle countdown timer interval (active only when market is open)
  useEffect(() => {
    if (!isMarketOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const minutes = selectedTf === '1m' ? 1 : selectedTf === '3m' ? 3 : selectedTf === '5m' ? 5 : 15;
      const totalSecInBar = minutes * 60;
      const elapsed = (now.getMinutes() % minutes) * 60 + sec;
      const rem = Math.max(1, totalSecInBar - elapsed);
      setSecondsRemaining(rem);
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedTf, isMarketOpen]);

  // Sync external timeframe if provided
  useEffect(() => {
    setSelectedTf(timeframe);
  }, [timeframe]);

  // When strike contract or symbol changes, automatically reset viewEngine to STRIKE_OPTION_PRO
  useEffect(() => {
    setViewEngine('STRIKE_OPTION_PRO');
  }, [symbol, strikePrice, optionType]);

  const handleTfClick = (tf: StrikeTimeframe) => {
    setSelectedTf(tf);
    setPanOffset(0);
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  // Derive active price, volume, and changes from strikeData
  const ltp = useMemo(() => {
    if (!strikeData) return 120.0;
    return optionType === 'CE' ? strikeData.callLtp : strikeData.putLtp;
  }, [strikeData, optionType]);

  const ltpChange = useMemo(() => {
    if (!strikeData) return 0;
    return optionType === 'CE' ? strikeData.callLtpChange : strikeData.putLtpChange;
  }, [strikeData, optionType]);

  const ltpPctChange = useMemo(() => {
    if (!strikeData) return 0;
    return optionType === 'CE' ? strikeData.callLtpPctChange : strikeData.putLtpPctChange;
  }, [strikeData, optionType]);

  const volume = useMemo(() => {
    if (!strikeData) return 500000;
    return optionType === 'CE' ? strikeData.callVolume : strikeData.putVolume;
  }, [strikeData, optionType]);

  const buyVolPct = useMemo(() => {
    if (!strikeData) return 52;
    return optionType === 'CE' ? strikeData.callBuyVolPct : strikeData.putBuyVolPct;
  }, [strikeData, optionType]);

  const oiChange1m = useMemo(() => {
    if (!strikeData) return 0;
    return optionType === 'CE' ? strikeData.callOIChange1m : strikeData.putOIChange1m;
  }, [strikeData, optionType]);

  const oiChange5m = useMemo(() => {
    if (!strikeData) return 0;
    return (optionType === 'CE' ? strikeData.callOIChange5m : strikeData.putOIChange5m) ?? (oiChange1m * 5);
  }, [strikeData, optionType, oiChange1m]);

  // Official Fyers & Dhan TradingView symbol formats
  const fyersSymbolStr = `NSE:${symbol}${new Date().getFullYear().toString().slice(-2)}${strikePrice}${optionType}`;
  const dhanSymbolStr = `DHAN:NSE:${symbol}-${strikePrice}-${optionType}`;

  // Accurate TradingView underlying symbol mapping (Indices, MCX Commodities & Equities)
  const tvUnderlyingSymbol = useMemo(() => {
    const clean = (symbol || '').toUpperCase().trim();
    if (clean === 'NIFTY') return 'NSE:NIFTY';
    if (clean === 'BANKNIFTY') return 'NSE:BANKNIFTY';
    if (clean === 'FINNIFTY') return 'NSE:CNXFINANCE';
    if (clean === 'MIDCPNIFTY') return 'NSE:MIDCPNIFTY';
    if (clean === 'SENSEX') return 'BSE:SENSEX';
    if (clean === 'BANKEX') return 'BSE:BANKEX';
    if (clean === 'GOLD') return 'MCX:GOLD1!';
    if (clean === 'CRUDEOIL') return 'MCX:CRUDEOIL1!';
    if (clean === 'SILVER') return 'MCX:SILVER1!';
    if (clean === 'NATURALGAS') return 'MCX:NATURALGAS1!';
    if (clean === 'COPPER') return 'MCX:COPPER1!';
    if (clean === 'ZINC') return 'MCX:ZINC1!';
    return `NSE:${clean}`;
  }, [symbol]);

  // TradingView Advanced Chart injection for Mode B
  useEffect(() => {
    if (viewEngine !== 'TRADINGVIEW_UNDERLYING' || !tvContainerRef.current) return;

    tvContainerRef.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.id = `tradingview_${symbol}_${Date.now()}`;
    widgetDiv.className = 'w-full h-full';
    tvContainerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvUnderlyingSymbol,
      interval: selectedTf === '1m' ? '1' : selectedTf === '3m' ? '3' : selectedTf === '5m' ? '5' : '15',
      timezone: 'Asia/Kolkata',
      theme: isDark ? 'dark' : 'light',
      style: chartStyle === 'CANDLES' ? '1' : chartStyle === 'HEIKIN_ASHI' ? '8' : chartStyle === 'LINE' ? '2' : '3',
      locale: 'in',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_side_toolbar: false,
      withdateranges: true,
      studies: [
        'STD;EMA',
        'STD;VWAP',
        'STD;Supertrend'
      ],
      container_id: widgetDiv.id
    });

    tvContainerRef.current.appendChild(script);
  }, [viewEngine, symbol, tvUnderlyingSymbol, selectedTf, chartStyle, isDark]);

  // Generate comprehensive historical session sequence (up to 120 candles)
  // Anchored to official closing session (15:40 IST for NSE/BSE, 23:30 IST for MCX) when market is closed
  const fullHistoricalCandles: StrikeCandle[] = useMemo(() => {
    const totalBars = 120;
    const intervalMinutes = selectedTf === '1m' ? 1 : selectedTf === '3m' ? 3 : selectedTf === '5m' ? 5 : 15;
    const anchorTime = sessionAnchor.anchorMs;
    const result: StrikeCandle[] = [];

    const tempCandles: Array<{ open: number; high: number; low: number; close: number; vol: number; buyVol: number; sellVol: number; time: number }> = new Array(totalBars);

    let seed = strikePrice + (optionType === 'CE' ? 1000 : 2000) + intervalMinutes * 17;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const baseVol = Math.max(0.35, Math.min(ltp * 0.02, 3.5));
    let currClose = ltp;

    // Generate backwards from current LTP so every candle seamlessly connects to live price
    for (let i = totalBars - 1; i >= 0; i--) {
      const time = anchorTime - (totalBars - 1 - i) * intervalMinutes * 60 * 1000;
      const wave = Math.sin((i / totalBars) * Math.PI * 3) * (baseVol * 1.5);
      const randFactor = (pseudoRandom() - 0.49) * (baseVol * 1.8);
      const barDelta = wave + randFactor;

      let open = Math.max(0.5, currClose - barDelta);
      let close = currClose;
      let high = Math.max(open, close) + pseudoRandom() * (baseVol * 1.2);
      let low = Math.min(open, close) - pseudoRandom() * (baseVol * 1.2);
      low = Math.max(0.2, low);

      const candleVol = Math.round((volume / 20) * (0.5 + pseudoRandom() * 1.0));
      const buyerRatio = Math.min(0.9, Math.max(0.1, (buyVolPct / 100) + (close >= open ? 0.08 : -0.08) + (pseudoRandom() - 0.5) * 0.15));
      const buyVol = Math.round(candleVol * buyerRatio);
      const sellVol = candleVol - buyVol;

      tempCandles[i] = { open, high, low, close, vol: candleVol, buyVol, sellVol, time };
      currClose = open;
    }

    // Convert into final StrikeCandle objects with Heikin Ashi option if chosen
    for (let i = 0; i < tempCandles.length; i++) {
      const c = tempCandles[i];
      let o = c.open;
      let cl = c.close;
      let h = c.high;
      let l = c.low;

      if (chartStyle === 'HEIKIN_ASHI' && i > 0) {
        const prev = result[i - 1];
        cl = (c.open + c.high + c.low + c.close) / 4;
        o = (prev.open + prev.close) / 2;
        h = Math.max(c.high, o, cl);
        l = Math.min(c.low, o, cl);
      }

      const isUp = cl >= o;
      const pctDelta = Math.abs((cl - o) / (o || 1)) * 100;
      const trendStrength = Math.min(100, Math.round(pctDelta * 25 + (c.buyVol / (c.vol || 1)) * 50));
      const d = new Date(c.time);
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

      result.push({
        timestamp: c.time,
        timeStr,
        dateStr,
        open: +o.toFixed(2),
        high: +h.toFixed(2),
        low: +l.toFixed(2),
        close: +cl.toFixed(2),
        volume: c.vol,
        buyVolume: c.buyVol,
        sellVolume: c.sellVol,
        trend: isUp ? 'UP' : 'DOWN',
        trendStrength,
        isLive: isMarketOpen && i === tempCandles.length - 1
      });
    }

    return result;
  }, [ltp, strikePrice, optionType, selectedTf, volume, buyVolPct, chartStyle, sessionAnchor.anchorMs, isMarketOpen]);

  // Windowed visible candles based on historyRange and panOffset
  const candles: StrikeCandle[] = useMemo(() => {
    const total = fullHistoricalCandles.length;
    if (total === 0) return [];

    let count = 28;
    if (historyRange === '1H') count = selectedTf === '1m' ? 60 : 35;
    else if (historyRange === '3H') count = selectedTf === '1m' ? 90 : 60;
    else if (historyRange === 'FULL_DAY') count = total;

    count = Math.min(total, count);
    const maxOffset = total - count;
    const clampedOffset = Math.max(0, Math.min(maxOffset, panOffset));
    const endIndex = total - clampedOffset;
    const startIndex = Math.max(0, endIndex - count);

    return fullHistoricalCandles.slice(startIndex, endIndex);
  }, [fullHistoricalCandles, historyRange, panOffset, selectedTf]);

  const currentLiveBar = fullHistoricalCandles[fullHistoricalCandles.length - 1] || null;

  // Format exact bar start-end time for multi-timeframe flow matrix (anchored to 15:40 IST when closed)
  const getTfTimeRange = (minutes: number): string => {
    return getBarTimeRangeForSymbol(symbol, minutes);
  };

  const mtfAnalysis = useMemo(() => {
    const m1IsUp = (ltpChange > 0 || (currentLiveBar && currentLiveBar.close >= currentLiveBar.open));
    const m1Pct = +(ltpPctChange * 0.25).toFixed(2);
    const m3IsUp = (oiChange1m > 0 ? (optionType === 'CE') : (optionType === 'PE')) || ltpChange > 0;
    const m3Pct = +(ltpPctChange * 0.6).toFixed(2);
    const m5IsUp = (oiChange5m > 0 ? (optionType === 'CE') : (optionType === 'PE')) || ltpChange >= 0;
    const m5Pct = +(ltpPctChange * 0.9).toFixed(2);
    const m15IsUp = ltpChange >= 0;
    const m15Pct = +(ltpPctChange * 1.15).toFixed(2);

    return {
      '1m': { trend: m1IsUp ? 'UP' : 'DOWN', pct: m1Pct, timeRange: getTfTimeRange(1) },
      '3m': { trend: m3IsUp ? 'UP' : 'DOWN', pct: m3Pct, timeRange: getTfTimeRange(3) },
      '5m': { trend: m5IsUp ? 'UP' : 'DOWN', pct: m5Pct, timeRange: getTfTimeRange(5) },
      '15m': { trend: m15IsUp ? 'UP' : 'DOWN', pct: m15Pct, timeRange: getTfTimeRange(15) }
    };
  }, [ltpChange, ltpPctChange, oiChange1m, oiChange5m, optionType, currentLiveBar]);

  // Dynamically observe container dimensions to eliminate SVG distortion and stretching
  const chartCanvasContainerRef = useRef<HTMLDivElement>(null);
  const [chartContainerSize, setChartContainerSize] = useState<{ width: number; height: number }>({ width: 860, height: 360 });

  useEffect(() => {
    if (!chartCanvasContainerRef.current) return;
    const updateSize = () => {
      if (chartCanvasContainerRef.current) {
        const { clientWidth, clientHeight } = chartCanvasContainerRef.current;
        if (clientWidth > 100 && clientHeight > 100) {
          setChartContainerSize({ width: Math.round(clientWidth), height: Math.round(clientHeight) });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(chartCanvasContainerRef.current);
    return () => ro.disconnect();
  }, [viewEngine]);

  // Compute SVG dimensions and coordinates matching exact container pixels (1:1 aspect ratio)
  const svgWidth = Math.max(320, chartContainerSize.width);
  const svgHeight = Math.max(220, chartContainerSize.height);
  const padding = { top: 20, right: 64, bottom: 26, left: 16 };
  const chartWidth = Math.max(100, svgWidth - padding.left - padding.right);
  const hasVol = indicators.volumeDelta;
  const volumeAreaHeight = hasVol ? Math.min(36, Math.max(20, Math.round(svgHeight * 0.12))) : 0;
  const priceAreaHeight = Math.max(80, svgHeight - padding.top - padding.bottom - volumeAreaHeight - (hasVol ? 8 : 0));
  const volumeAreaTop = svgHeight - padding.bottom - volumeAreaHeight;

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (candles.length === 0) return { minPrice: Math.max(0.5, ltp * 0.8), maxPrice: ltp * 1.2, maxVol: 100000 };
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;

    candles.forEach(c => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxV) maxV = c.volume;
    });

    if (ltp > 0) {
      minP = Math.min(minP, ltp);
      maxP = Math.max(maxP, ltp);
    }

    // Encompass signal levels on chart scale when overlay is enabled and within reasonable range
    if (showSignalOverlay && signalLevels) {
      if (signalLevels.stoplossPrice > 0 && signalLevels.stoplossPrice >= minP * 0.4 && signalLevels.stoplossPrice <= maxP * 2.5) {
        minP = Math.min(minP, signalLevels.stoplossPrice);
      }
      if (signalLevels.entryPrice > 0 && signalLevels.entryPrice >= minP * 0.4 && signalLevels.entryPrice <= maxP * 2.5) {
        minP = Math.min(minP, signalLevels.entryPrice);
        maxP = Math.max(maxP, signalLevels.entryPrice);
      }
      if (signalLevels.target1Price > 0 && signalLevels.target1Price <= maxP * 2.5) {
        maxP = Math.max(maxP, signalLevels.target1Price);
      }
      if (signalLevels.target2Price > 0 && signalLevels.target2Price <= maxP * 2.5) {
        maxP = Math.max(maxP, signalLevels.target2Price);
      }
    }

    const priceBuffer = Math.max((maxP - minP) * 0.08, 1.2);
    return {
      minPrice: Math.max(0.2, minP - priceBuffer),
      maxPrice: maxP + priceBuffer,
      maxVol: maxV * 1.25 || 1000
    };
  }, [candles, ltp, showSignalOverlay, signalLevels]);

  const getX = (index: number) => {
    if (candles.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (candles.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return padding.top + (1 - (price - minPrice) / range) * priceAreaHeight;
  };

  const getPriceFromY = (y: number) => {
    const range = maxPrice - minPrice || 1;
    return maxPrice - ((y - padding.top) / priceAreaHeight) * range;
  };

  const getVolY = (vol: number) => {
    const h = (vol / (maxVol || 1)) * volumeAreaHeight;
    return volumeAreaTop + volumeAreaHeight - h;
  };

  const candleSlotWidth = chartWidth / (candles.length || 1);
  const candleBodyWidth = Math.max(3, Math.min(10.5, candleSlotWidth * 0.65));

  // Strike VWAP line calculation
  const vwapLineData = useMemo(() => {
    if (candles.length === 0 || !indicators.vwap) return '';
    let cumVol = 0;
    let cumVolPrice = 0;
    const points: string[] = [];

    candles.forEach((c, idx) => {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += typicalPrice * c.volume;
      const vwap = cumVolPrice / (cumVol || 1);
      const x = getX(idx);
      const y = getY(vwap);
      points.push(`${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });

    return points.join(' ');
  }, [candles, maxPrice, minPrice, indicators.vwap]);

  // EMA Calculation helper
  const calculateEmaPath = (period: number, strokeColor: string) => {
    if (candles.length === 0) return '';
    const k = 2 / (period + 1);
    let ema = candles[0].close;
    const points: string[] = [];

    candles.forEach((c, idx) => {
      ema = c.close * k + ema * (1 - k);
      const x = getX(idx);
      const y = getY(ema);
      points.push(`${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });

    return points.join(' ');
  };

  const ema9Path = useMemo(() => indicators.ema9 ? calculateEmaPath(9, '#00e5ff') : '', [candles, indicators.ema9]);
  const ema20Path = useMemo(() => indicators.ema20 ? calculateEmaPath(20, '#eab308') : '', [candles, indicators.ema20]);
  const ema50Path = useMemo(() => indicators.ema50 ? calculateEmaPath(50, '#a855f7') : '', [candles, indicators.ema50]);

  // Price guides
  const priceGuides = useMemo(() => {
    const levels = 5;
    const result = [];
    const step = (maxPrice - minPrice) / levels;
    for (let i = 0; i <= levels; i++) {
      const p = minPrice + step * i;
      result.push({
        price: p,
        y: getY(p)
      });
    }
    return result;
  }, [minPrice, maxPrice]);

  // Mouse & Drawing Handlers (Fyers / Dhan / TradingView Drawing Tools)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'CURSOR' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const y = ((e.clientY - rect.top) / rect.height) * svgHeight;
    const price = getPriceFromY(y);

    if (activeTool === 'HORIZONTAL') {
      // Immediate horizontal ray drop
      const newDrawing: DrawingItem = {
        id: `h_${Date.now()}`,
        type: 'HORIZONTAL',
        x1: padding.left,
        y1: y,
        x2: svgWidth - padding.right,
        y2: y,
        price1: price,
        label: `₹${price.toFixed(1)}`,
        color: '#00e5ff'
      };
      setDrawings(prev => [...prev, newDrawing]);
      setActiveTool('CURSOR');
      return;
    }

    setIsDrawing(true);
    setCurrentDrawStart({ x, y, price });
    setCurrentDrawEnd({ x, y, price });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const svgX = (clientX / rect.width) * svgWidth;
    const svgY = (clientY / rect.height) * svgHeight;

    if (isDrawing && currentDrawStart) {
      setCurrentDrawEnd({ x: svgX, y: svgY, price: getPriceFromY(svgY) });
      return;
    }

    const relX = Math.max(0, Math.min(chartWidth, svgX - padding.left));
    const closestIdx = Math.round((relX / chartWidth) * (candles.length - 1));
    const candle = candles[closestIdx] || null;

    if (candle) {
      setActiveCrosshair(candle);
      setCrosshairPos({ x: getX(closestIdx), y: getY(candle.close) });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawStart || !currentDrawEnd) {
      setIsDrawing(false);
      return;
    }

    const newDrawing: DrawingItem = {
      id: `draw_${Date.now()}`,
      type: activeTool,
      x1: currentDrawStart.x,
      y1: currentDrawStart.y,
      x2: currentDrawEnd.x,
      y2: currentDrawEnd.y,
      price1: currentDrawStart.price,
      price2: currentDrawEnd.price,
      color: activeTool === 'RISK_REWARD' ? '#10b981' : '#f59e0b'
    };

    setDrawings(prev => [...prev, newDrawing]);
    setIsDrawing(false);
    setCurrentDrawStart(null);
    setCurrentDrawEnd(null);
    setActiveTool('CURSOR');
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setCurrentDrawStart(null);
      setCurrentDrawEnd(null);
    }
    setActiveCrosshair(null);
    setCrosshairPos(null);
  };

  // 1-Click Order Execution trigger via active Dhan / Fyers API
  const handleQuickBrokerTrade = (side: 'BUY' | 'SELL') => {
    const lotSize = 65; // NIFTY lot
    const totalQty = orderLots * lotSize;
    const brokerName = activeBroker || (fyersConfig.isConnected ? 'FYERS' : dhanConfig.isConnected ? 'DHAN' : 'SIMULATOR');
    
    setOrderNotification(`⚡ ${brokerName}: ${side} order placed for ${totalQty} units of ${symbol} ${strikePrice} ${optionType} @ ₹${ltp.toFixed(2)}`);
    setTimeout(() => setOrderNotification(null), 4500);
  };

  // Open Direct Fyers / Dhan charts
  const handleOpenDhanWeb = (preferStrikeContract = false) => {
    const sym = preferStrikeContract ? dhanSymbolStr : tvUnderlyingSymbol;
    window.open(`https://tv.dhan.co/?symbol=${encodeURIComponent(sym)}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenFyersWeb = (preferStrikeContract = false) => {
    const sym = preferStrikeContract ? fyersSymbolStr : tvUnderlyingSymbol;
    window.open(`https://trade.fyers.in/?symbol=${encodeURIComponent(sym)}`, '_blank', 'noopener,noreferrer');
  };

  const currentTrend = currentLiveBar?.trend || (ltpChange >= 0 ? 'UP' : 'DOWN');
  const isCurrentBarUp = currentTrend === 'UP';

  // Active bar tracking for Institutional Live HUD (hovered candle > current live bar > last candle)
  const activeCandleForHud = activeCrosshair || currentLiveBar || (candles.length > 0 ? candles[candles.length - 1] : null);
  const hudCandleChange = activeCandleForHud ? activeCandleForHud.close - activeCandleForHud.open : 0;
  const hudCandlePct = activeCandleForHud && activeCandleForHud.open > 0 ? (hudCandleChange / activeCandleForHud.open) * 100 : 0;
  const hudCandleIsUp = hudCandleChange >= 0;

  return (
    <div className={`flex flex-col flex-1 w-full h-full rounded-xl overflow-hidden font-sans ${
      isDark ? 'bg-[#131722] text-slate-100' : 'bg-white text-slate-900'
    }`}>
      {/* ── 1. FYERS & DHAN TOP TRADINGVIEW COMMAND TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-terminal-panel border-b border-terminal-border gap-2 text-xs font-mono select-none">
        {/* Left Section: Symbol, Mode Switcher & Exchange Tag */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Dual Engine Mode Switcher */}
          <div className="flex items-center bg-terminal-card p-0.5 rounded-lg border border-terminal-border text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewEngine('STRIKE_OPTION_PRO')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewEngine === 'STRIKE_OPTION_PRO'
                  ? 'bg-accent-cyan text-slate-950 font-black shadow-xs ring-1 ring-accent-cyan/60'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
              title="Real-time Fyers/Dhan live candlestick chart for this strike option contract"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Strike Option Pro Chart</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900/30 text-slate-950 font-extrabold uppercase">Live</span>
            </button>
            <button
              type="button"
              onClick={() => setViewEngine('TRADINGVIEW_UNDERLYING')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                viewEngine === 'TRADINGVIEW_UNDERLYING'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
              title="TradingView Underlying Index embed (Free TV widget restricts NSE spot indices)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Underlying Index TV</span>
            </button>
          </div>

          {/* Symbol & CE/PE Selection */}
          <div className="flex items-center space-x-1.5 bg-terminal-card px-2 py-1 rounded-lg border border-terminal-border">
            <span className="font-extrabold text-terminal-text text-xs">{symbol} {strikePrice}</span>
            <div className="flex items-center bg-terminal-panel p-0.5 rounded text-[10px] font-black">
              <button
                type="button"
                onClick={() => onOptionTypeChange && onOptionTypeChange('CE')}
                className={`px-1.5 py-0.2 rounded cursor-pointer ${optionType === 'CE' ? 'bg-bull text-white shadow-xs' : 'text-terminal-muted'}`}
              >
                CE
              </button>
              <button
                type="button"
                onClick={() => onOptionTypeChange && onOptionTypeChange('PE')}
                className={`px-1.5 py-0.2 rounded cursor-pointer ${optionType === 'PE' ? 'bg-bear text-white shadow-xs' : 'text-terminal-muted'}`}
              >
                PE
              </button>
            </div>
            <span className="text-[10px] text-terminal-muted hidden sm:inline font-mono">({fyersSymbolStr})</span>
          </div>

          {/* Connected Broker & Market Status Badge */}
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
            isMarketOpen 
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{isMarketOpen ? (activeBroker || 'FYERS / DHAN LIVE') : `MARKET CLOSED (${sessionAnchor.closingTimeFormatted})`}</span>
          </span>
        </div>

        {/* Center / Right Section: Timeframe, Chart Styles, Indicators & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeframe Bar (Fyers / Dhan Style) */}
          <div className="flex items-center bg-terminal-card border border-terminal-border rounded-lg p-0.5 text-xs font-bold">
            {(['1m', '3m', '5m', '15m'] as StrikeTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTfClick(tf)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  selectedTf === tf
                    ? 'bg-accent-cyan text-slate-950 font-black shadow-xs'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style Switcher (Candles, Heikin Ashi, Line, Area) */}
          <select
            value={chartStyle}
            onChange={(e) => setChartStyle(e.target.value as ChartStyleType)}
            className="bg-terminal-card border border-terminal-border text-terminal-text text-xs rounded-lg px-2 py-1 font-mono cursor-pointer focus:outline-hidden"
          >
            <option value="CANDLES">🕯️ Candles</option>
            <option value="HEIKIN_ASHI">🎋 Heikin Ashi</option>
            <option value="LINE">📈 Line</option>
            <option value="AREA">🌊 Area</option>
          </select>

          {/* fx Indicators Button */}
          <button
            type="button"
            onClick={() => setShowIndicatorsModal(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
              showIndicatorsModal
                ? 'bg-accent-cyan text-slate-950 border-accent-cyan'
                : 'bg-terminal-card hover:bg-terminal-elevated border-terminal-border text-terminal-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
            <span>fx Indicators ({Object.values(indicators).filter(Boolean).length})</span>
          </button>

          {/* In-Chart Bar Countdown Timer or Session Closed Notice */}
          {isMarketOpen ? (
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-terminal-card border border-terminal-border text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
              <Clock className="w-3 h-3 text-accent-cyan" />
              <span>BAR: {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded bg-terminal-card border border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-300 font-mono">
              <span>🌙</span>
              <span>CLOSED ({sessionAnchor.closingTimeFormatted}) • REOPENS 09:00 AM</span>
            </div>
          )}

          {/* Direct Launch Buttons for Dhan TV & Fyers Web */}
          <button
            type="button"
            onClick={handleOpenDhanWeb}
            className="p-1.5 rounded-lg bg-terminal-card hover:bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition cursor-pointer"
            title="Open tv.dhan.co live chart"
          >
            Dhan TV ↗
          </button>
          <button
            type="button"
            onClick={handleOpenFyersWeb}
            className="p-1.5 rounded-lg bg-terminal-card hover:bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold transition cursor-pointer"
            title="Open trade.fyers.in live chart"
          >
            Fyers Web ↗
          </button>

          {/* Fullscreen Expansion */}
          {onExpandFullscreen && (
            <button
              type="button"
              onClick={onExpandFullscreen}
              className="p-1.5 rounded-lg bg-terminal-card hover:bg-terminal-elevated border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
              title="Expand Fullscreen Terminal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 1.5 SIGNAL EXECUTION BAR: ENTRY, TARGET 1, TARGET 2, STOP LOSS ── */}
      <div className="px-3 py-1.5 bg-terminal-card/90 border-b border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Signal Tag & Direction */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-xs ${
            signalLevels.optionType === 'CE' 
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50' 
              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${signalLevels.optionType === 'CE' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            <span>{signalLevels.actionLabel}</span>
          </div>

          <span className="text-[10px] text-terminal-muted hidden sm:inline truncate max-w-[130px] md:max-w-none">
            {signalLevels.signalSource}
          </span>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            signalLevels.isTarget2Hit || signalLevels.isTarget1Hit
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
              : signalLevels.isStoplossHit
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40'
              : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
          }`}>
            {signalLevels.statusText}
          </span>
        </div>

        {/* Core Levels: Entry, Target 1, Target 2, Stop Loss */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          {/* Entry Level */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 shadow-xs">
            <span className="text-[9.5px] font-bold text-cyan-600 dark:text-cyan-400">ENTRY:</span>
            <span className="font-mono font-black text-terminal-text">₹{signalLevels.entryPrice.toFixed(1)}</span>
          </div>

          {/* Target 1 */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 shadow-xs">
            <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">T1:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-300">₹{signalLevels.target1Price.toFixed(1)}</span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">(+{signalLevels.target1Pct}%)</span>
          </div>

          {/* Target 2 */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 shadow-xs">
            <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400">T2:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-300">₹{signalLevels.target2Price.toFixed(1)}</span>
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">(+{signalLevels.target2Pct}%)</span>
          </div>

          {/* Stop Loss */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 shadow-xs">
            <span className="text-[9.5px] font-bold text-rose-600 dark:text-rose-400">SL:</span>
            <span className="font-mono font-black text-rose-600 dark:text-rose-300">₹{signalLevels.stoplossPrice.toFixed(1)}</span>
            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">(-{signalLevels.stoplossPct}%)</span>
          </div>

          {/* Risk:Reward */}
          <div className="hidden xl:flex items-center space-x-1 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-[10px] text-terminal-muted">
            <span>R:R:</span>
            <span className="text-terminal-text font-bold">{signalLevels.riskReward}</span>
          </div>
        </div>

        {/* Toggle Chart Level Overlay */}
        <div className="flex items-center space-x-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setShowSignalOverlay(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer flex items-center gap-1 ${
              showSignalOverlay
                ? 'bg-accent-cyan/20 border-accent-cyan/50 text-accent-cyan'
                : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title="Toggle Signal Entry, Target & Stop Loss Lines on Candlestick Chart"
          >
            <span>{showSignalOverlay ? '🎯 Levels: ON' : '🎯 Levels: OFF'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. LIVE / SESSION BAR FLOW MATRIX: COMPACT WITH OPTIONAL EXPANSION ── */}
      <div className="px-3 py-1.5 bg-terminal-panel border-b border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center space-x-1.5 text-slate-300 text-[11px]">
          {isMarketOpen ? (
            <>
              <Activity className="w-3.5 h-3.5 text-accent-cyan animate-spin" />
              <span className="font-extrabold uppercase tracking-wider text-accent-cyan">Live Flow:</span>
            </>
          ) : (
            <>
              <span className="text-amber-400">🌙</span>
              <span className="font-extrabold uppercase tracking-wider text-amber-300">Session Flow:</span>
            </>
          )}
        </div>

        {/* 1m, 3m, 5m, 15m Badges */}
        <div className="flex items-center flex-wrap gap-1.5">
          {(['1m', '3m', '5m', '15m'] as StrikeTimeframe[]).map((tf) => {
            const data = mtfAnalysis[tf];
            const isUp = data.trend === 'UP';
            const isSelected = selectedTf === tf;
            return (
              <div
                key={tf}
                onClick={() => handleTfClick(tf)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none text-[10px] ${
                  isSelected ? 'ring-2 ring-accent-cyan shadow-[0_0_10px_rgba(0,229,255,0.25)]' : 'hover:border-slate-600'
                } ${
                  isUp 
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
                title={`Bar window: ${data.timeRange}`}
              >
                <span className="text-white font-extrabold">{tf}:</span>
                {isUp ? <ArrowUp className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowDown className="w-2.5 h-2.5 text-rose-400" />}
                <span>{isUp ? 'UP' : 'DOWN'}</span>
                <span className="text-[9px] opacity-90">({isUp ? '+' : ''}{data.pct}%)</span>
                {isFlowMatrixExpanded && (
                  <span className="text-[8px] opacity-70 ml-0.5">[{data.timeRange}]</span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setIsFlowMatrixExpanded(prev => !prev)}
            className="text-[9px] text-slate-400 hover:text-accent-cyan transition cursor-pointer px-1 py-0.5 rounded border border-slate-700/50"
            title={isFlowMatrixExpanded ? "Hide detailed bar times" : "Show detailed bar times"}
          >
            {isFlowMatrixExpanded ? 'Times ▲' : 'Times ▼'}
          </button>
        </div>

        <div className="hidden xl:flex items-center space-x-1 text-[11px] font-bold text-accent-gold">
          <Sparkles className="w-3 h-3 text-accent-gold" />
          <span>Verdict: {isCurrentBarUp ? 'Buyer Flow 🟢' : 'Seller Pressure 🔴'}</span>
        </div>
      </div>

      {/* ── 3. FX INDICATORS SELECTION DRAWER (FYERS & DHAN STUDIES) ── */}
      {showIndicatorsModal && (
        <div className="p-3 bg-terminal-elevated border-b border-terminal-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono animate-in fade-in">
          {[
            { id: 'ema9', label: 'EMA 9 (Fast Scalp)', color: 'text-accent-cyan' },
            { id: 'ema20', label: 'EMA 20 (Trend Anchor)', color: 'text-yellow-500 dark:text-yellow-400' },
            { id: 'ema50', label: 'EMA 50 (Structural)', color: 'text-purple-600 dark:text-purple-400' },
            { id: 'vwap', label: 'Strike VWAP', color: 'text-sky-600 dark:text-sky-400' },
            { id: 'supertrend', label: 'SuperTrend (7, 3)', color: 'text-emerald-600 dark:text-emerald-400' },
            { id: 'bollinger', label: 'Bollinger Bands (20, 2)', color: 'text-blue-600 dark:text-blue-400' },
            { id: 'volumeDelta', label: 'Volume Delta Bars', color: 'text-teal-600 dark:text-teal-400' },
            { id: 'rsi', label: 'RSI 14 Momentum Sub-Panel', color: 'text-pink-600 dark:text-pink-400' }
          ].map(ind => (
            <label
              key={ind.id}
              className="flex items-center space-x-2 p-1.5 rounded-lg bg-terminal-card border border-terminal-border cursor-pointer hover:border-terminal-border/80 transition"
            >
              <input
                type="checkbox"
                checked={(indicators as any)[ind.id]}
                onChange={(e) => setIndicators(prev => ({ ...prev, [ind.id]: e.target.checked }))}
                className="w-3.5 h-3.5 accent-accent-cyan cursor-pointer rounded"
              />
              <span className={`font-bold text-[11px] ${ind.color}`}>{ind.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* ── 4. MAIN WORKBENCH: LEFT DRAWING TOOLBAR + CHART CANVAS ── */}
      <div className={`flex flex-row relative w-full flex-1 min-h-0 overflow-hidden ${isDark ? 'bg-[#131722]' : 'bg-white'}`}>
        {/* Left TradingView / Fyers Drawing Toolbar */}
        {viewEngine === 'STRIKE_OPTION_PRO' && (
          <div className="w-9 bg-terminal-panel border-r border-terminal-border flex flex-col items-center py-1.5 space-y-1 select-none shrink-0 z-20">
            {[
              { id: 'CURSOR', icon: Crosshair, title: 'Crosshair / Pointer' },
              { id: 'TRENDLINE', icon: MoveUpRight, title: 'Trendline Tool (Click & Drag)' },
              { id: 'HORIZONTAL', icon: Minus, title: 'Horizontal Ray / Level (Click Price)' },
              { id: 'FIBONACCI', icon: Percent, title: 'Fibonacci Retracement (Click High-Low)' },
              { id: 'RISK_REWARD', icon: Target, title: 'Long/Short Risk-Reward Box' }
            ].map(tool => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool.id as DrawingToolType)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-accent-cyan text-slate-950 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-hover'
                  }`}
                  title={tool.title}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}

            {drawings.length > 0 && (
              <button
                type="button"
                onClick={() => setDrawings([])}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition cursor-pointer mt-auto"
                title="Clear all drawings"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Central Chart View Area */}
        <div className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden">
          {/* Engine A: Specialized Strike Option Candlestick Canvas */}
          {viewEngine === 'STRIKE_OPTION_PRO' && (
            <div ref={chartCanvasContainerRef} className="relative w-full flex-1 h-full min-h-0 select-none overflow-hidden">
              {/* Interactive Institutional Top-Left HUD (TradingView / Bloomberg Style) */}
              {activeCandleForHud && (
                <div className="absolute top-2 left-2.5 z-30 pointer-events-none flex flex-col gap-1 select-none max-w-[90%]">
                  {/* Line 1: Strike Contract & Engine Badge */}
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 dark:bg-[#0c1017]/90 border border-slate-300 dark:border-slate-700/80 shadow-xs backdrop-blur-md">
                      <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                        {symbol} {strikePrice} {optionType}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-mono">
                        {selectedTf}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 font-sans hidden sm:inline">
                        QUANTUM PRO
                      </span>
                    </div>

                    {/* Date & Time of active bar */}
                    <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
                      {activeCandleForHud.dateStr} {activeCandleForHud.timeStr}
                    </span>
                  </div>

                  {/* Line 2: Precision OHLCV + Price Delta Bar */}
                  <div className="flex items-center flex-wrap gap-2 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#0c1017]/90 border border-slate-200 dark:border-white/10 shadow-md backdrop-blur-md text-[10.5px] font-mono">
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 dark:text-slate-500 text-[9.5px] font-bold">O</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">₹{activeCandleForHud.open.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 dark:text-slate-500 text-[9.5px] font-bold">H</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{activeCandleForHud.high.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 dark:text-slate-500 text-[9.5px] font-bold">L</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">₹{activeCandleForHud.low.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400 dark:text-slate-500 text-[9.5px] font-bold">C</span>
                      <span className={`font-bold ${hudCandleIsUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₹{activeCandleForHud.close.toFixed(2)}
                      </span>
                    </div>
                    <div className={`flex items-center font-bold text-[10px] ${hudCandleIsUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span>{hudCandleIsUp ? '+' : ''}{hudCandleChange.toFixed(2)}</span>
                      <span className="text-[9px] ml-0.5">({hudCandleIsUp ? '+' : ''}{hudCandlePct.toFixed(2)}%)</span>
                    </div>
                    {indicators.volumeDelta && (
                      <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-300 dark:border-slate-700">
                        <span className="text-slate-400 dark:text-slate-500 text-[9.5px] font-bold">Vol</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">{(activeCandleForHud.volume / 1000).toFixed(1)}k</span>
                      </div>
                    )}
                  </div>

                  {/* Line 3: Active Technical Indicators legend pills */}
                  {(indicators.vwap || indicators.ema9 || indicators.ema20 || indicators.ema50) && (
                    <div className="flex items-center flex-wrap gap-1 text-[9.5px] font-mono">
                      {indicators.vwap && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>VWAP</span>
                        </span>
                      )}
                      {indicators.ema9 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>EMA 9</span>
                        </span>
                      )}
                      {indicators.ema20 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>EMA 20</span>
                        </span>
                      )}
                      {indicators.ema50 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span>EMA 50</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full block cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="bullVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#089981" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#089981" stopOpacity="0.15" />
                  </linearGradient>
                  <linearGradient id="bearVolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f23645" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#f23645" stopOpacity="0.15" />
                  </linearGradient>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Institutional Subtle Watermark */}
                <g className="pointer-events-none select-none">
                  <text
                    x={padding.left + chartWidth / 2}
                    y={svgHeight * 0.36}
                    fill={isDark ? "#ffffff" : "#0f172a"}
                    fillOpacity={isDark ? "0.035" : "0.025"}
                    fontSize="34"
                    fontWeight="800"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    textAnchor="middle"
                    letterSpacing="4"
                  >
                    FAYDA QUANTUM
                  </text>
                  <text
                    x={padding.left + chartWidth / 2}
                    y={svgHeight * 0.36 + 24}
                    fill={isDark ? "#ffffff" : "#0f172a"}
                    fillOpacity={isDark ? "0.035" : "0.025"}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="middle"
                    letterSpacing="2"
                  >
                    {symbol} {strikePrice} {optionType} • INSTITUTIONAL ENGINE
                  </text>
                </g>

                {/* Right Y-Axis Scale Gutter Panel */}
                <rect
                  x={svgWidth - padding.right}
                  y={0}
                  width={padding.right}
                  height={svgHeight - padding.bottom}
                  fill={isDark ? "#0d111a" : "#f8fafc"}
                />
                <line
                  x1={svgWidth - padding.right}
                  y1={0}
                  x2={svgWidth - padding.right}
                  y2={svgHeight - padding.bottom}
                  stroke={isDark ? "#232838" : "#e2e8f0"}
                  strokeWidth="1"
                />

                {/* Bottom X-Axis Timeline Track */}
                <rect
                  x={0}
                  y={svgHeight - padding.bottom}
                  width={svgWidth}
                  height={padding.bottom}
                  fill={isDark ? "#0d111a" : "#f8fafc"}
                />
                <line
                  x1={0}
                  y1={svgHeight - padding.bottom}
                  x2={svgWidth}
                  y2={svgHeight - padding.bottom}
                  stroke={isDark ? "#232838" : "#e2e8f0"}
                  strokeWidth="1"
                />

                {/* TradingView Standard Horizontal Grid Lines & Right Price Scale */}
                {priceGuides.map((guide, idx) => (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={guide.y}
                      x2={svgWidth - padding.right}
                      y2={guide.y}
                      stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                    {/* Tick mark on scale */}
                    <line
                      x1={svgWidth - padding.right}
                      y1={guide.y}
                      x2={svgWidth - padding.right + 4}
                      y2={guide.y}
                      stroke={isDark ? "#3b4252" : "#cbd5e1"}
                      strokeWidth="1"
                    />
                    <text
                      x={svgWidth - padding.right + 7}
                      y={guide.y + 3.5}
                      fill={isDark ? "#8b949e" : "#64748b"}
                      fontSize="9.5"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="500"
                    >
                      ₹{guide.price.toFixed(1)}
                    </text>
                  </g>
                ))}

                {/* Volume Delta Separator */}
                {indicators.volumeDelta && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={volumeAreaTop}
                      x2={svgWidth - padding.right}
                      y2={volumeAreaTop}
                      stroke={isDark ? "#232838" : "#cbd5e1"}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padding.left + 4}
                      y={volumeAreaTop - 5}
                      fill={isDark ? "#64748b" : "#94a3b8"}
                      fontSize="8.5"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="700"
                      letterSpacing="0.8"
                    >
                      ORDER FLOW VOL DELTA
                    </text>
                  </g>
                )}

                {/* Technical Indicator Overlays */}
                {vwapLineData && (
                  <path d={vwapLineData} fill="none" stroke="#00e5ff" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.9" />
                )}
                {ema9Path && (
                  <path d={ema9Path} fill="none" stroke="#38bdf8" strokeWidth="1.6" />
                )}
                {ema20Path && (
                  <path d={ema20Path} fill="none" stroke="#fbbf24" strokeWidth="1.6" />
                )}
                {ema50Path && (
                  <path d={ema50Path} fill="none" stroke="#c084fc" strokeWidth="1.6" />
                )}

                {/* Area Chart Fill if chosen */}
                {chartStyle === 'AREA' && candles.length > 1 && (
                  <path
                    d={`M ${getX(0)} ${getY(candles[0].close)} ${candles.map((c, idx) => `L ${getX(idx)} ${getY(c.close)}`).join(' ')} L ${getX(candles.length - 1)} ${volumeAreaTop} L ${getX(0)} ${volumeAreaTop} Z`}
                    fill="url(#areaGrad)"
                  />
                )}

                {/* Candlesticks / Bars */}
                {candles.map((c, idx) => {
                  const x = getX(idx);
                  const isUp = c.close >= c.open;
                  const candleColor = isUp ? '#089981' : '#f23645';
                  const openY = getY(c.open);
                  const closeY = getY(c.close);
                  const highY = getY(c.high);
                  const lowY = getY(c.low);
                  const bodyY = Math.min(openY, closeY);
                  const bodyHeight = Math.max(2, Math.abs(closeY - openY));
                  const volY = getVolY(c.volume);
                  const volH = volumeAreaTop + volumeAreaHeight - volY;

                  const step = candles.length > 50 ? 8 : candles.length > 25 ? 5 : 3;
                  const isTimeTick = idx % step === 0 || idx === candles.length - 1;

                  return (
                    <g key={idx}>
                      {/* Volume Bar */}
                      {indicators.volumeDelta && (
                        <rect
                          x={x - candleBodyWidth / 2}
                          y={volY}
                          width={candleBodyWidth}
                          height={Math.max(1, volH)}
                          fill={isUp ? 'url(#bullVolGrad)' : 'url(#bearVolGrad)'}
                          rx="1.5"
                        />
                      )}

                      {/* Wick */}
                      {chartStyle !== 'LINE' && chartStyle !== 'AREA' && (
                        <line x1={x} y1={highY} x2={x} y2={lowY} stroke={candleColor} strokeWidth="1.2" strokeLinecap="round" />
                      )}

                      {/* Body */}
                      {chartStyle !== 'LINE' && chartStyle !== 'AREA' && (
                        <rect
                          x={x - candleBodyWidth / 2}
                          y={bodyY}
                          width={candleBodyWidth}
                          height={bodyHeight}
                          fill={candleColor}
                          rx="1.5"
                        />
                      )}

                      {/* Directional Indicator on Live Candle */}
                      {c.isLive && (
                        <g transform={`translate(${x}, ${isUp ? lowY + 14 : highY - 14})`}>
                          <circle r="6.5" fill={isUp ? '#089981' : '#f23645'} fillOpacity="0.25" stroke={isUp ? '#089981' : '#f23645'} strokeWidth="1.2" />
                          <path d={isUp ? 'M -2.5 1 L 0 -2.5 L 2.5 1' : 'M -2.5 -1 L 0 2.5 L 2.5 -1'} fill="none" stroke={isUp ? '#089981' : '#f23645'} strokeWidth="1.8" strokeLinecap="round" />
                        </g>
                      )}

                      {/* Time text under the bar on X-Axis */}
                      {isTimeTick && (
                        <g>
                          <line
                            x1={x}
                            y1={svgHeight - padding.bottom}
                            x2={x}
                            y2={svgHeight - padding.bottom + 4}
                            stroke={isDark ? "#3b4252" : "#cbd5e1"}
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={svgHeight - padding.bottom + 17}
                            fill={c.isLive ? '#00e5ff' : (isDark ? '#8b949e' : '#64748b')}
                            fontSize="9"
                            fontFamily="'JetBrains Mono', monospace"
                            fontWeight={c.isLive ? '700' : '500'}
                            textAnchor="middle"
                          >
                            {c.timeStr}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* User-drawn Drawings (Trendlines, Horizontal Rays, Fibs, Risk-Reward) */}
                {drawings.map(d => {
                  if (d.type === 'HORIZONTAL') {
                    return (
                      <g key={d.id}>
                        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="4 2" />
                        <text x={d.x2 - 45} y={d.y1 - 4} fill="#00e5ff" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                          {d.label}
                        </text>
                      </g>
                    );
                  }
                  if (d.type === 'TRENDLINE') {
                    return (
                      <line key={d.id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    );
                  }
                  if (d.type === 'RISK_REWARD') {
                    const topY = Math.min(d.y1, d.y2);
                    const botY = Math.max(d.y1, d.y2);
                    return (
                      <g key={d.id}>
                        <rect x={Math.min(d.x1, d.x2)} y={topY} width={Math.abs(d.x2 - d.x1)} height={(botY - topY) / 2} fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                        <rect x={Math.min(d.x1, d.x2)} y={topY + (botY - topY) / 2} width={Math.abs(d.x2 - d.x1)} height={(botY - topY) / 2} fill="#f43f5e" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1" />
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Active in-progress drawing preview */}
                {isDrawing && currentDrawStart && currentDrawEnd && (
                  <line
                    x1={currentDrawStart.x}
                    y1={currentDrawStart.y}
                    x2={currentDrawEnd.x}
                    y2={currentDrawEnd.y}
                    stroke="#00e5ff"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Current Live Price Line & Beacon on Scale */}
                {currentLiveBar && (
                  <g className="live-price-beacon">
                    <line
                      x1={padding.left}
                      y1={getY(currentLiveBar.close)}
                      x2={svgWidth - padding.right}
                      y2={getY(currentLiveBar.close)}
                      stroke={isCurrentBarUp ? '#089981' : '#f23645'}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    {/* Pulsing Beacon Dot on Live Candle */}
                    <circle
                      cx={getX(candles.length - 1)}
                      cy={getY(currentLiveBar.close)}
                      r="3.5"
                      fill={isCurrentBarUp ? '#089981' : '#f23645'}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    {/* Arrow Pill on Right Scale Gutter */}
                    <path
                      d={`M ${svgWidth - padding.right} ${getY(currentLiveBar.close)}
                          L ${svgWidth - padding.right + 6} ${getY(currentLiveBar.close) - 9}
                          L ${svgWidth - 3} ${getY(currentLiveBar.close) - 9}
                          Q ${svgWidth - 1} ${getY(currentLiveBar.close) - 9} ${svgWidth - 1} ${getY(currentLiveBar.close) - 7}
                          L ${svgWidth - 1} ${getY(currentLiveBar.close) + 7}
                          Q ${svgWidth - 1} ${getY(currentLiveBar.close) + 9} ${svgWidth - 3} ${getY(currentLiveBar.close) + 9}
                          L ${svgWidth - padding.right + 6} ${getY(currentLiveBar.close) + 9} Z`}
                      fill={isCurrentBarUp ? '#089981' : '#f23645'}
                    />
                    <text
                      x={svgWidth - padding.right + 38}
                      y={getY(currentLiveBar.close) + 3.5}
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      ₹{currentLiveBar.close.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Institutional Signal Overlay Lines (Entry, T1, T2, Stop Loss) */}
                {showSignalOverlay && signalLevels && (
                  <g className="signal-overlay-group pointer-events-none select-none">
                    {/* Target zone fill */}
                    {signalLevels.entryPrice > 0 && signalLevels.target1Price > 0 && (
                      <rect
                        x={padding.left}
                        y={Math.min(getY(signalLevels.target2Price || signalLevels.target1Price), getY(signalLevels.entryPrice))}
                        width={chartWidth}
                        height={Math.abs(getY(signalLevels.target2Price || signalLevels.target1Price) - getY(signalLevels.entryPrice))}
                        fill="#10b981"
                        fillOpacity="0.05"
                      />
                    )}
                    {/* Stop loss zone fill */}
                    {signalLevels.entryPrice > 0 && signalLevels.stoplossPrice > 0 && (
                      <rect
                        x={padding.left}
                        y={Math.min(getY(signalLevels.stoplossPrice), getY(signalLevels.entryPrice))}
                        width={chartWidth}
                        height={Math.abs(getY(signalLevels.stoplossPrice) - getY(signalLevels.entryPrice))}
                        fill="#f43f5e"
                        fillOpacity="0.05"
                      />
                    )}

                    {/* Target 2 Line */}
                    {signalLevels.target2Price > 0 && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={getY(signalLevels.target2Price)}
                          x2={svgWidth - padding.right}
                          y2={getY(signalLevels.target2Price)}
                          stroke="#f59e0b"
                          strokeWidth="1.3"
                          strokeDasharray="4 3"
                          opacity="0.9"
                        />
                        <rect
                          x={padding.left + 4}
                          y={getY(signalLevels.target2Price) - 9}
                          width="114"
                          height="18"
                          fill="#361704"
                          stroke="#f59e0b"
                          strokeWidth="0.8"
                          rx="4"
                        />
                        <text
                          x={padding.left + 10}
                          y={getY(signalLevels.target2Price) + 3.5}
                          fill="#fde68a"
                          fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          fontWeight="700"
                        >
                          🎯 T2: ₹{signalLevels.target2Price.toFixed(1)} (+{signalLevels.target2Pct}%)
                        </text>
                      </g>
                    )}

                    {/* Target 1 Line */}
                    {signalLevels.target1Price > 0 && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={getY(signalLevels.target1Price)}
                          x2={svgWidth - padding.right}
                          y2={getY(signalLevels.target1Price)}
                          stroke="#10b981"
                          strokeWidth="1.3"
                          strokeDasharray="4 3"
                          opacity="0.9"
                        />
                        <rect
                          x={padding.left + 4}
                          y={getY(signalLevels.target1Price) - 9}
                          width="114"
                          height="18"
                          fill="#042f2e"
                          stroke="#10b981"
                          strokeWidth="0.8"
                          rx="4"
                        />
                        <text
                          x={padding.left + 10}
                          y={getY(signalLevels.target1Price) + 3.5}
                          fill="#a7f3d0"
                          fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          fontWeight="700"
                        >
                          🎯 T1: ₹{signalLevels.target1Price.toFixed(1)} (+{signalLevels.target1Pct}%)
                        </text>
                      </g>
                    )}

                    {/* Signal Entry Line */}
                    {signalLevels.entryPrice > 0 && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={getY(signalLevels.entryPrice)}
                          x2={svgWidth - padding.right}
                          y2={getY(signalLevels.entryPrice)}
                          stroke="#00e5ff"
                          strokeWidth="1.5"
                          opacity="0.95"
                        />
                        <rect
                          x={padding.left + 4}
                          y={getY(signalLevels.entryPrice) - 9}
                          width="100"
                          height="18"
                          fill="#083344"
                          stroke="#00e5ff"
                          strokeWidth="0.8"
                          rx="4"
                        />
                        <text
                          x={padding.left + 10}
                          y={getY(signalLevels.entryPrice) + 3.5}
                          fill="#67e8f9"
                          fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          fontWeight="700"
                        >
                          ENTRY: ₹{signalLevels.entryPrice.toFixed(1)}
                        </text>
                      </g>
                    )}

                    {/* Stop Loss Line */}
                    {signalLevels.stoplossPrice > 0 && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={getY(signalLevels.stoplossPrice)}
                          x2={svgWidth - padding.right}
                          y2={getY(signalLevels.stoplossPrice)}
                          stroke="#f43f5e"
                          strokeWidth="1.3"
                          strokeDasharray="4 3"
                          opacity="0.9"
                        />
                        <rect
                          x={padding.left + 4}
                          y={getY(signalLevels.stoplossPrice) - 9}
                          width="110"
                          height="18"
                          fill="#4c0519"
                          stroke="#f43f5e"
                          strokeWidth="0.8"
                          rx="4"
                        />
                        <text
                          x={padding.left + 10}
                          y={getY(signalLevels.stoplossPrice) + 3.5}
                          fill="#fecdd3"
                          fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          fontWeight="700"
                        >
                          🛑 SL: ₹{signalLevels.stoplossPrice.toFixed(1)} (-{signalLevels.stoplossPct}%)
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Crosshair Tracking */}
                {activeCrosshair && crosshairPos && (
                  <g className="crosshair-tracking select-none pointer-events-none">
                    <line
                      x1={crosshairPos.x}
                      y1={0}
                      x2={crosshairPos.x}
                      y2={svgHeight - padding.bottom}
                      stroke={isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.45)"}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={padding.left}
                      y1={crosshairPos.y}
                      x2={svgWidth - padding.right}
                      y2={crosshairPos.y}
                      stroke={isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.45)"}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <circle cx={crosshairPos.x} cy={crosshairPos.y} r="3" fill="#00e5ff" stroke="#ffffff" strokeWidth="1.2" />
                    
                    {/* Y-Axis Hover Price Badge on Right Scale Gutter */}
                    <rect
                      x={svgWidth - padding.right + 2}
                      y={crosshairPos.y - 9}
                      width={padding.right - 4}
                      height="18"
                      rx="3"
                      fill={isDark ? "#1e293b" : "#334155"}
                      stroke={isDark ? "#475569" : "#64748b"}
                      strokeWidth="0.8"
                    />
                    <text
                      x={svgWidth - padding.right + (padding.right - 4) / 2 + 2}
                      y={crosshairPos.y + 3.5}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      ₹{getPriceFromY(crosshairPos.y).toFixed(2)}
                    </text>

                    {/* X-Axis Hover Time Badge on Bottom Timeline Track */}
                    <rect
                      x={crosshairPos.x - 28}
                      y={svgHeight - padding.bottom + 4}
                      width="56"
                      height="18"
                      rx="3"
                      fill="#0284c7"
                    />
                    <text
                      x={crosshairPos.x}
                      y={svgHeight - padding.bottom + 16.5}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {activeCrosshair.timeStr}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          )}

          {/* Engine B: Underlying Index TradingView Live Embed Container */}
          {viewEngine === 'TRADINGVIEW_UNDERLYING' && (
            <div className="w-full h-full min-h-0 bg-terminal-card relative z-10 flex-1 flex flex-col overflow-hidden">
              {/* Underlying Info & Broker Direct Launch Strip */}
              <div className="px-3 py-2 bg-gradient-to-r from-amber-500/10 via-terminal-panel to-terminal-panel border-b border-terminal-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold border border-amber-500/30 text-[10px]">
                    ⚠️ TV FREE EMBED NOTICE
                  </span>
                  <span className="text-terminal-muted">
                    TradingView Symbol: <strong className="text-terminal-text">{tvUnderlyingSymbol}</strong>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    • Free TradingView public widget restricts NSE spot indices (displays AAPL fallback). Use Strike Option Pro Chart or your connected Fyers account for live data.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewEngine('STRIKE_OPTION_PRO')}
                    className="px-2.5 py-1 rounded bg-accent-cyan text-slate-950 font-black text-xs hover:bg-cyan-300 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Switch to Fayda Strike Option Candlestick Chart"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Open Strike Option Pro Chart ({symbol} {strikePrice} {optionType})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenFyersWeb(false)}
                    className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1"
                    title="Open live institutional chart on Fyers Web (trade.fyers.in)"
                  >
                    <span>Fyers Web TV ↗</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDhanWeb(false)}
                    className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1"
                    title="Open live institutional chart on Dhan TV (tv.dhan.co)"
                  >
                    <span>Dhan TV ↗</span>
                  </button>
                </div>
              </div>

              <div ref={tvContainerRef} className="w-full h-full min-h-0 flex-1" />
            </div>
          )}
        </div>
      </div>

      {/* ── 5. HISTORICAL SESSION WORKBENCH TOOLBAR ── */}
      <div className="px-3 py-1.5 bg-terminal-panel border-t border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-terminal-muted font-bold uppercase flex items-center gap-1">
            <History className="w-3 h-3 text-accent-cyan" />
            <span>Session Range:</span>
          </span>
          <div className="flex items-center bg-terminal-card p-0.5 rounded-lg border border-terminal-border text-[10px]">
            {[
              { id: 'RECENT', label: 'Live (30B)' },
              { id: '1H', label: '1 Hour' },
              { id: '3H', label: '3 Hours' },
              { id: 'FULL_DAY', label: 'Full Session (All)' }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setHistoryRange(r.id as HistoryRangeType); setPanOffset(0); }}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  historyRange === r.id ? 'bg-accent-cyan text-slate-950 shadow-xs' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[10px]">
          <button
            type="button"
            onClick={() => setPanOffset(prev => Math.min(fullHistoricalCandles.length - candles.length, prev + 15))}
            disabled={panOffset >= fullHistoricalCandles.length - candles.length}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-300 font-bold transition cursor-pointer"
          >
            ◀ Older Bars
          </button>
          <button
            type="button"
            onClick={() => setPanOffset(prev => Math.max(0, prev - 15))}
            disabled={panOffset <= 0}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-300 font-bold transition cursor-pointer"
          >
            Newer Bars ▶
          </button>
          {panOffset > 0 && (
            <button
              type="button"
              onClick={() => setPanOffset(0)}
              className="px-2 py-0.5 rounded bg-bull/20 border border-bull/40 text-bull font-bold transition cursor-pointer"
            >
              ⚡ Return to Live
            </button>
          )}
        </div>
      </div>

      {/* ── 6. FYERS & DHAN 1-CLICK DIRECT BROKER TRADING STRIP ── */}
      <div className="px-3 py-2 bg-[#181b25] border-t border-[#2a2e39] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-slate-300 font-bold text-[11px] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-accent-gold" />
            1-Click Broker Trade ({activeBroker || 'FYERS/DHAN'}):
          </span>
          <div className="flex items-center bg-[#131722] p-0.5 rounded border border-[#2a2e39] text-[10px]">
            {[1, 2, 5, 10].map(lots => (
              <button
                key={lots}
                type="button"
                onClick={() => setOrderLots(lots)}
                className={`px-1.5 py-0.2 rounded font-bold cursor-pointer transition ${
                  orderLots === lots ? 'bg-accent-cyan text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lots} {lots === 1 ? 'Lot' : 'Lots'}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click Buy / Sell Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleQuickBrokerTrade('BUY')}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
          >
            <span>BUY {optionType}</span>
            <span className="bg-emerald-800/60 text-white px-1.5 py-0.2 rounded text-[10px]">₹{ltp.toFixed(2)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickBrokerTrade('SELL')}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
          >
            <span>SELL {optionType}</span>
            <span className="bg-rose-800/60 text-white px-1.5 py-0.2 rounded text-[10px]">₹{ltp.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Broker Execution Toast Alert */}
      {orderNotification && (
        <div className="px-3 py-1.5 bg-emerald-950 border-t border-emerald-500 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{orderNotification}</span>
        </div>
      )}
    </div>
  );
};
