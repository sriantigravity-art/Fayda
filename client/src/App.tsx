import React, { useState, useEffect } from 'react';
import { MarketProvider, useMarket } from './context/MarketContext';
import { ThemeProvider } from './context/ThemeContext';
import { TerminalModeProvider, useTerminalMode } from './context/TerminalModeContext';
import { DensityProvider } from './context/DensityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HeaderBar } from './components/HeaderBar';
import { CPRStrip } from './components/CPRStrip';
import { PreMarketRadarCard } from './components/PreMarketRadarCard';
import { OptionChainHeatmap } from './components/OptionChainHeatmap';
import { BreakoutPatternRadar } from './components/BreakoutPatternRadar';
import { UnifiedCallTipsCockpit } from './components/UnifiedCallTipsCockpit';
import { NtmClusterRadar } from './components/NtmClusterRadar';
import { HeroZeroRadar } from './components/HeroZeroRadar';

import { RightAnalyticsColumn } from './components/RightAnalyticsColumn';
import { SurgeAlertBanner } from './components/SurgeAlertBanner';
import { FlashNewsBanner } from './components/FlashNewsBanner';
import { TargetHitFlashModal } from './components/TargetHitFlashModal';
import { HeroZeroFlashModal } from './components/HeroZeroFlashModal';
import { PrimeHighProbabilityFlashModal } from './components/PrimeHighProbabilityFlashModal';
import { SquareOffAlertBanner } from './components/SquareOffAlertBanner';
import { HighlightSignalTicker } from './components/HighlightSignalTicker';
import { DisclaimerTicker } from './components/DisclaimerTicker';
import { GlobalIndicesSidebar } from './components/GlobalIndicesSidebar';
import { SplashScreen } from './components/SplashScreen';
import { MobileNavBar, type MobileTabType } from './components/MobileNavBar';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { FyersModal } from './components/FyersModal';
import { LegalDocumentModal, type LegalDocType } from './components/auth/LegalDocumentModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileEditModal } from './components/profile/UserProfileEditModal';
import { MultiLegStrategyCard } from './components/MultiLegStrategyCard';
import { RadarFeed } from './components/RadarFeed';
import { NewsWireTab } from './components/NewsWireTab';
import { PostMarketTradeJournal } from './components/PostMarketTradeJournal';
import { GlobalMarketContextBanner } from './components/GlobalMarketContextBanner';
import { TradeTipModal } from './components/TradeTipModal';
import { EntityChartModal } from './components/EntityChartModal';
import { OptionsDataTableModal } from './components/OptionsDataTableModal';
import { initMobileAutoFullscreen } from './utils/mobileFullscreen';
import { User, LogOut } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<MobileTabType>('CHAIN');
  const [isMobileRiskOpen, setIsMobileRiskOpen] = useState<boolean>(false);
  const [isMobileFyersOpen, setIsMobileFyersOpen] = useState<boolean>(false);
  const [isMobileLegalOpen, setIsMobileLegalOpen] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');
  const [isMobileAuthOpen, setIsMobileAuthOpen] = useState<boolean>(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState<boolean>(false);
  const { panelVisibility, user, isAuthenticated, logout } = useAuth();
  const { currentIndexState, selectedIndex, activeTradeTipModal, closeTradeTipModal } = useMarket();
  const { isBeginner, isExpert } = useTerminalMode();

  // Automatically request fullscreen on mobile view on page load and initial user touch
  useEffect(() => {
    const cleanup = initMobileAutoFullscreen();
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col selection:bg-accent-sky selection:text-white font-sans antialiased pb-28 md:pb-12 xl:pb-8 w-full max-w-[100vw] overflow-x-hidden">
      {/* Right Side Docked International Indices Drawer with Vertical Toggle */}
      {panelVisibility.globalSidebar && <GlobalIndicesSidebar />}

      {/* Emergency Square Off Reversal Banner */}
      {panelVisibility.squareOffBanner && <SquareOffAlertBanner />}

      {/* Target Hit Flash Celebration Modal */}
      <TargetHitFlashModal />

      {/* 0DTE Hero-or-Zero Multiplier Flash Alert Modal */}
      <HeroZeroFlashModal />

      {/* Dedicated High-Probability Call/Put Flash Alert Modal */}
      <PrimeHighProbabilityFlashModal />

      {/* 10-Second Floating Breaking Flash News Banner */}
      {panelVisibility.newsBanner && <FlashNewsBanner />}

      {/* Flashing Top Surge Alert Banner for extreme surge events */}
      {panelVisibility.surgeBanner && <SurgeAlertBanner />}

      {/* Top Header & Navigation Bar */}
      <HeaderBar />

      {/* Live Global Market & Geopolitical Setup Context Ribbon */}
      <GlobalMarketContextBanner />

      {/* Live Highlight Trade Signal Ticker (Strike Price, Entry, Exit, Target) */}
      {panelVisibility.highlightSignalTicker && <HighlightSignalTicker />}

      {/* Main Terminal Workspace */}
      <main className="flex-1 px-2 sm:px-4 py-2.5 sm:py-3.5 max-w-[1840px] w-full mx-auto flex flex-col space-y-3.5">
        {/* Dual Market Intelligence & Pivot Range Ribbon (Side-by-Side Aligned to Top) */}
        {currentIndexState && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <PreMarketRadarCard
              symbol={selectedIndex}
              preMarket={currentIndexState.preMarketChecklist}
              marketRegime={currentIndexState.marketRegime}
            />
            <CPRStrip
              symbol={selectedIndex}
              spotPrice={currentIndexState.spotPrice}
              cprData={currentIndexState.cprData}
              virginCPRs={currentIndexState.virginCPRs}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* DESKTOP & TABLET ADAPTIVE WORKSPACE (>= 768px) */}
        {/* ========================================================================= */}
        <div className="hidden md:grid md:grid-cols-12 gap-3.5 flex-1 items-start">
          {/* Left Column (8 cols on xl, 7 cols on lg, 12 cols on md) */}
          <div className="md:col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col space-y-3.5">
            {/* Unified Smart Call Tips Under One Roof */}
            {panelVisibility.tradeGuidance && <UnifiedCallTipsCockpit />}

            {/* ATM ±3 Strike Cluster Radar & 09:15 Baseline OI Engine */}
            <NtmClusterRadar />

            {/* High-Density Live Options Matrix & Greeks Heatmap */}
            {panelVisibility.optionChain && <OptionChainHeatmap />}
          </div>

          {/* Right Column (4 cols on xl, 5 cols on lg, 12 cols on md) */}
          <div className="md:col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col space-y-3.5">
            {panelVisibility.rightAnalytics && <RightAnalyticsColumn />}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE DEDICATED TABBED WORKSPACE (< 768px) */}
        {/* ========================================================================= */}
        <div className="md:hidden flex flex-col space-y-3">
          {mobileTab === 'CHAIN' && panelVisibility.optionChain && (
            <div className="flex flex-col space-y-3">
              <NtmClusterRadar />
              <OptionChainHeatmap />
            </div>
          )}
          {mobileTab === 'SIGNALS' && (
            <div className="flex flex-col space-y-3">
              {panelVisibility.tradeGuidance && <UnifiedCallTipsCockpit />}
              <NtmClusterRadar />
            </div>
          )}
          {mobileTab === 'JOURNAL' && <PostMarketTradeJournal isModal={false} />}
          {mobileTab === 'ANALYTICS' && panelVisibility.rightAnalytics && <RightAnalyticsColumn />}
          {mobileTab === 'RADAR' && (
            <div className="flex flex-col space-y-3">
              <RadarFeed />
              {panelVisibility.patternRadar && <BreakoutPatternRadar />}
              {!isBeginner && panelVisibility.heroZeroRadar && <HeroZeroRadar />}
            </div>
          )}
          {mobileTab === 'NEWS' && <NewsWireTab />}
        </div>
      </main>

      {/* Terminal Status & Fayda Pro Terminal Auth Footer */}
      <footer className="border-t border-terminal-border bg-terminal-card px-4 py-3 text-[11px] font-sans text-terminal-muted flex flex-col md:flex-row items-center justify-between gap-3 mt-auto shadow-inner">
        {/* Left: Terminal Branding & Real-time Stream Status */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left">
          <span className="font-bold text-terminal-text tracking-tight flex items-center gap-1.5">
            <img src="/favicon-32x32.png" className="w-4 h-4 object-contain" alt="" />
            <span className="text-xs font-black">FAYDA PRO TERMINAL</span>
          </span>
          <span className="text-terminal-border hidden sm:inline">•</span>
          <span className="hidden sm:inline">Official NSE / BSE Real-time Stream</span>
          <span className="text-terminal-border hidden sm:inline">•</span>
          <span className="text-bull font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
            Fyers API v3 Authorized
          </span>
          <span className="text-terminal-border hidden lg:inline">•</span>
          <span className="hidden lg:inline font-mono text-[10px]">Market Hours: <strong className="text-terminal-text">09:15 – 15:40 IST</strong></span>
        </div>

        {/* Right: Fayda Pro Terminal Auth & User Status */}
        <div className="flex items-center justify-center md:justify-end gap-2 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-xl px-2.5 py-1 gap-2 shadow-sm">
              <button
                type="button"
                onClick={() => setIsProfileEditOpen(true)}
                className="flex items-center space-x-2 hover:opacity-85 transition cursor-pointer"
                title={`Logged in as ${user.fullName} (${user.role}) - Click to edit profile`}
              >
                <div className="w-6 h-6 rounded-full border border-accent-sky/50 bg-accent-sky/20 text-accent-sky font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs text-terminal-text leading-none">{user.fullName}</span>
                  <span className="text-[9px] text-accent-sky font-mono leading-tight uppercase">{user.role || 'Pro Trader'}</span>
                </div>
              </button>

              <div className="h-4 w-[1px] bg-terminal-border mx-0.5" />

              <button
                type="button"
                onClick={logout}
                className="p-1 text-terminal-muted hover:text-bear hover:bg-bear/10 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                title="Sign Out from Fayda Pro"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsMobileAuthOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky font-sans text-xs font-bold transition cursor-pointer shadow-sm"
              title="Sign In to Fayda Pro Terminal with SEBI Consent"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In to Fayda Pro</span>
            </button>
          )}
        </div>
      </footer>

      {/* Fixed Sticky SEBI Compliance Ticker (Permanently Pinned to Viewport Bottom) */}
      {panelVisibility.sebiTicker && <DisclaimerTicker />}

      {/* Dedicated Mobile Native Bottom Nav (Visible only on < 768px) */}
      <MobileNavBar
        activeTab={mobileTab}
        onTabChange={(tab) => setMobileTab(tab)}
        onOpenRiskCalc={() => setIsMobileRiskOpen(true)}
        onOpenFyersModal={() => setIsMobileFyersOpen(true)}
        onOpenLegalModal={(doc) => {
          setActiveLegalDoc(doc);
          setIsMobileLegalOpen(true);
        }}
        onOpenAuthModal={() => setIsMobileAuthOpen(true)}
        onOpenProfileEditModal={() => setIsProfileEditOpen(true)}
      />

      {/* Mobile Risk Calculator Launcher */}
      <RiskCalculatorModal
        isOpen={isMobileRiskOpen}
        onClose={() => setIsMobileRiskOpen(false)}
        defaultLtp={100}
      />

      {/* Mobile Fyers Broker Integration Modal */}
      <FyersModal
        isOpen={isMobileFyersOpen}
        onClose={() => setIsMobileFyersOpen(false)}
      />

      {/* Mobile Legal & SEBI Compliance Modal */}
      <LegalDocumentModal
        isOpen={isMobileLegalOpen}
        onClose={() => setIsMobileLegalOpen(false)}
        initialDoc={activeLegalDoc}
      />

      {/* Mobile Auth Modal */}
      <AuthModal
        isOpen={isMobileAuthOpen}
        onClose={() => setIsMobileAuthOpen(false)}
      />

      {/* User Profile Edit Modal */}
      <UserProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
      />

      {/* Global Interactive Trade Tip Detail Modal */}
      <TradeTipModal
        tip={activeTradeTipModal}
        isOpen={!!activeTradeTipModal}
        onClose={closeTradeTipModal}
      />

      {/* Global Live Entity Interactive Chart Modal */}
      <EntityChartModal />

      {/* Global Live Options Data Table Modal */}
      <OptionsDataTableModal />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TerminalModeProvider>
          <DensityProvider>
            <MarketProvider>
              <DashboardContent />
            </MarketProvider>
          </DensityProvider>
        </TerminalModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
