import React, { useState } from 'react';
import { MarketProvider } from './context/MarketContext';
import { ThemeProvider } from './context/ThemeContext';
import { TerminalModeProvider } from './context/TerminalModeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HeaderBar } from './components/HeaderBar';
import { OptionChainHeatmap } from './components/OptionChainHeatmap';
import { BreakoutPatternRadar } from './components/BreakoutPatternRadar';
import { TradeGuidanceCard } from './components/TradeGuidanceCard';
import { HeroZeroRadar } from './components/HeroZeroRadar';
import { RightAnalyticsColumn } from './components/RightAnalyticsColumn';
import { SurgeAlertBanner } from './components/SurgeAlertBanner';
import { FlashNewsBanner } from './components/FlashNewsBanner';
import { TargetHitFlashModal } from './components/TargetHitFlashModal';
import { HeroZeroFlashModal } from './components/HeroZeroFlashModal';
import { SquareOffAlertBanner } from './components/SquareOffAlertBanner';
import { HighlightSignalTicker } from './components/HighlightSignalTicker';
import { DisclaimerTicker } from './components/DisclaimerTicker';
import { GlobalIndicesSidebar } from './components/GlobalIndicesSidebar';
import { SplashScreen } from './components/SplashScreen';
import { Layers, Activity } from 'lucide-react';

const DashboardContent: React.FC = () => {
  // Mobile / Tablet Tab Navigation ('HEATMAP' | 'ANALYTICS')
  const [mobileTab, setMobileTab] = useState<'HEATMAP' | 'ANALYTICS'>('HEATMAP');
  const { panelVisibility } = useAuth();

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col selection:bg-accent-cyan selection:text-terminal-bg font-sans antialiased pb-9 w-full max-w-[100vw] overflow-x-hidden">
      {/* App Launch Video Splash Screen */}
      <SplashScreen />

      {/* Right Side Docked International Indices Drawer with Vertical Toggle */}
      {panelVisibility.globalSidebar && <GlobalIndicesSidebar />}

      {/* Emergency Square Off Reversal Banner */}
      {panelVisibility.squareOffBanner && <SquareOffAlertBanner />}

      {/* Target Hit Flash Celebration Modal */}
      <TargetHitFlashModal />

      {/* 0DTE Hero-or-Zero Multiplier Flash Alert Modal */}
      <HeroZeroFlashModal />

      {/* 10-Second Floating Breaking Flash News Banner */}
      {panelVisibility.newsBanner && <FlashNewsBanner />}

      {/* Flashing Top Surge Alert Banner for extreme surge events */}
      {panelVisibility.surgeBanner && <SurgeAlertBanner />}

      {/* Top Header & Navigation Bar */}
      <HeaderBar />

      {/* Live Highlight Trade Signal Ticker (Strike Price, Entry, Exit, Target) */}
      {panelVisibility.highlightSignalTicker && <HighlightSignalTicker />}

      {/* Mobile / Tablet Segmented Tab Switcher (Visible only below XL screens < 1280px) */}
      <div className="xl:hidden px-3 pt-2.5 max-w-[1840px] w-full mx-auto">
        <div className="flex bg-terminal-card border border-terminal-border rounded-xl p-1 font-mono text-xs shadow-md">
          <button
            onClick={() => setMobileTab('HEATMAP')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition ${
              mobileTab === 'HEATMAP'
                ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Option Chain Heatmap</span>
          </button>

          <button
            onClick={() => setMobileTab('ANALYTICS')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition ${
              mobileTab === 'ANALYTICS'
                ? 'bg-amber/20 border border-amber/40 text-amber shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Greeks, Levels & Radar</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Workspace */}
      <main className="flex-1 px-2.5 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 max-w-[1840px] w-full mx-auto flex flex-col space-y-3.5">
        {/* Dual-Pane Institutional Workspace Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 flex-1 items-start">
          {/* Left / Center 8 Columns: Option Chain Heatmap, Breakout Pattern Radar, 0DTE Radar & AI Trade Guidance */}
          <div className={`xl:col-span-8 flex flex-col space-y-3.5 transition-all duration-300 ${mobileTab === 'HEATMAP' ? 'block' : 'hidden xl:block'}`}>
            {panelVisibility.optionChain && <OptionChainHeatmap />}
            {panelVisibility.patternRadar && <BreakoutPatternRadar />}
            {panelVisibility.heroZeroRadar && <HeroZeroRadar />}
            {panelVisibility.tradeGuidance && <TradeGuidanceCard />}
          </div>

          {/* Right 4 Columns: PCR Momentum, Max Pain, Resistance/Support Walls, Theta Meter, Radar & News Wire */}
          <div className={`xl:col-span-4 flex flex-col space-y-3.5 ${mobileTab === 'ANALYTICS' ? 'block' : 'hidden xl:block'}`}>
            {panelVisibility.rightAnalytics && <RightAnalyticsColumn />}
          </div>
        </div>
      </main>

      {/* Terminal Status Footer */}
      <footer className="border-t border-terminal-border bg-terminal-panel/90 px-4 py-2.5 text-[11px] font-mono text-terminal-muted flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto mb-2">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="font-bold text-accent-cyan tracking-wider flex items-center gap-1.5">
            <img src="/favicon-32x32.png" className="w-3.5 h-3.5 object-contain" alt="" />
            <span>FAYDA PRO</span>
          </span>
          <span>•</span>
          <span>Official Exchange Stream</span>
          <span>•</span>
          <span className="text-bull font-semibold">Fyers API v3 Authorized</span>
          <span>•</span>
          <span className="text-terminal-text font-bold">@vertexinfo.co.in (All Rights Reserved)</span>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 text-center">
          <span>Market Hours: <strong className="text-terminal-text font-bold">09:15 – 15:40 IST</strong></span>
        </div>
      </footer>

      {/* Fixed Sticky SEBI Compliance Ticker (Permanently Pinned to Viewport Bottom) */}
      {panelVisibility.sebiTicker && <DisclaimerTicker />}
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TerminalModeProvider>
          <MarketProvider>
            <DashboardContent />
          </MarketProvider>
        </TerminalModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
