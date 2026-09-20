import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { StrikePriceLiveChart, type StrikeTimeframe } from './StrikePriceLiveChart';
import { StrikeAnalyticsRightPanel } from './StrikeAnalyticsRightPanel';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  BarChart3, 
  Compass, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

export const StrikePriceLiveChartModal: React.FC = () => {
  const { 
    activeStrikeChartModal, 
    closeStrikeChartModal, 
    indices 
  } = useMarket();

  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<StrikeTimeframe>('3m');
  const [activeOptionType, setActiveOptionType] = useState<'CE' | 'PE'>('CE');

  // Sync state when modal opens
  useEffect(() => {
    if (activeStrikeChartModal) {
      setActiveOptionType(activeStrikeChartModal.optionType || 'CE');
      setIsFullscreen(true);
    }
  }, [activeStrikeChartModal]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      closeStrikeChartModal();
    }, 200);
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeStrikeChartModal && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStrikeChartModal, isClosing]);

  if (!activeStrikeChartModal && !isClosing) return null;

  const symbol = activeStrikeChartModal?.symbol || 'NIFTY';
  const strikePrice = activeStrikeChartModal?.strikePrice || 24500;
  const currentIndexState = indices[symbol];
  
  // Find strikeData from currentIndexState if not directly provided
  const strikeData = activeStrikeChartModal?.strikeData || 
    currentIndexState?.strikes?.find(s => s.strikePrice === strikePrice) || null;

  return createPortal(
    <div className={`fixed inset-0 z-[120000] flex items-center justify-center overflow-hidden transition-all ${
      isFullscreen ? 'p-0 w-screen h-screen' : 'p-2 sm:p-4 md:p-6'
    }`}>
      {/* Backdrop */}
      <div 
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-all ${
          isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'
        }`}
      />

      {/* Modal Window */}
      <div 
        className={`relative bg-slate-950 border border-accent-cyan/40 shadow-[0_0_80px_rgba(0,229,255,0.25)] overflow-hidden flex flex-col z-10 transition-all ${
          isFullscreen 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0' 
            : 'w-full max-w-7xl h-[94vh] max-h-[950px] rounded-2xl'
        } ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
      >
        {/* Top Highlight Navigation Header */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 gap-2 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-base sm:text-lg text-white">
                  {symbol} {strikePrice} {activeOptionType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40">
                  INSTITUTIONAL ALPHA WORKBENCH
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Live Strike Premium Chart & Order Flow Confluence Radar
              </span>
            </div>
          </div>

          {/* Controls: Fullscreen & Close */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isFullscreen ? 'Restore Size' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 border border-slate-700 text-slate-300 transition cursor-pointer"
              title="Close Modal (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Grid: Chart (Left) + Intelligence (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-y-auto bg-slate-950 min-h-0">
          {/* Left Column (8 of 12 cols): Interactive Candlestick Chart */}
          <div className="lg:col-span-8 flex flex-col min-h-[460px] h-full">
            <StrikePriceLiveChart
              symbol={symbol}
              strikePrice={strikePrice}
              optionType={activeOptionType}
              strikeData={strikeData}
              currentIndexState={currentIndexState}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onOptionTypeChange={setActiveOptionType}
              height="100%"
            />
          </div>

          {/* Right Column (4 of 12 cols): Live Strike Intelligence Panel */}
          <div className="lg:col-span-4 flex flex-col min-h-[460px] h-full overflow-hidden">
            <StrikeAnalyticsRightPanel
              symbol={symbol}
              strikePrice={strikePrice}
              optionType={activeOptionType}
              strikeData={strikeData}
              currentIndexState={currentIndexState}
              selectedTimeframe={timeframe}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
