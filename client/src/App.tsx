import React, { useState } from 'react';
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

const DashboardContent: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<MobileTabType>('CHAIN');
  const [isMobileRiskOpen, setIsMobileRiskOpen] = useState<boolean>(false);
  const [isMobileFyersOpen, setIsMobileFyersOpen] = useState<boolean>(false);
  const [isMobileLegalOpen, setIsMobileLegalOpen] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');
  const [isMobileAuthOpen, setIsMobileAuthOpen] = useState<boolean>(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState<boolean>(false);
  const { panelVisibility } = useAuth();
  const { currentIndexState, selectedIndex } = useMarket();
  const { isBeginner, isExpert } = useTerminalMode();

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
        {/* Pre-Market Preparation Radar & Market Structure Ribbon */}
        {currentIndexState && (
          <PreMarketRadarCard
            symbol={selectedIndex}
            preMarket={currentIndexState.preMarketChecklist}
            marketRegime={currentIndexState.marketRegime}
          />
        )}

        {/* Central Pivot Range (CPR) & Floor Pivots Strip */}
        {currentIndexState && (
          <CPRStrip
            symbol={selectedIndex}
            spotPrice={currentIndexState.spotPrice}
            cprData={currentIndexState.cprData}
            virginCPRs={currentIndexState.virginCPRs}
          />
        )}

        {/* ========================================================================= */}
        {/* DESKTOP & TABLET ADAPTIVE WORKSPACE (>= 768px) */}
        {/* ========================================================================= */}
        <div className="hidden md:grid md:grid-cols-12 gap-3.5 flex-1 items-start">
          {/* Left Column (8 cols on xl, 7 cols on lg, 12 cols on md) */}
          <div className="md:col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col space-y-3.5">
            {isBeginner ? (
              <>
                {/* Beginner Mode Layout: Guidance First -> Protected Spreads -> Simplified Chain -> Educational Journal */}
                {panelVisibility.tradeGuidance && <TradeGuidanceCard />}
                <MultiLegStrategyCard />
                {panelVisibility.optionChain && <OptionChainHeatmap />}
                <PostMarketTradeJournal isModal={false} />
              </>
            ) : isExpert ? (
              <>
                {/* Expert Mode Layout: High-density Chain Matrix -> Multi-Leg Spreads & Arb -> Confluence & Trap Detector -> 0DTE Gamma */}
                {panelVisibility.optionChain && <OptionChainHeatmap />}
                <MultiLegStrategyCard />
                {panelVisibility.tradeGuidance && <TradeGuidanceCard />}
                {panelVisibility.heroZeroRadar && <HeroZeroRadar />}
                {panelVisibility.patternRadar && <BreakoutPatternRadar />}
              </>
            ) : (
              <>
                {/* Intermediate Mode Layout: Balanced Technical Flow & Multi-Leg Spreads */}
                {panelVisibility.tradeGuidance && <TradeGuidanceCard />}
                <MultiLegStrategyCard />
                {panelVisibility.optionChain && <OptionChainHeatmap />}
                {panelVisibility.patternRadar && <BreakoutPatternRadar />}
                {panelVisibility.heroZeroRadar && <HeroZeroRadar />}
              </>
            )}
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
          {mobileTab === 'CHAIN' && panelVisibility.optionChain && <OptionChainHeatmap />}
          {mobileTab === 'SIGNALS' && panelVisibility.tradeGuidance && <TradeGuidanceCard />}
          {mobileTab === 'JOURNAL' && <PostMarketTradeJournal isModal={false} />}
          {mobileTab === 'ANALYTICS' && panelVisibility.rightAnalytics && <RightAnalyticsColumn />}
          {mobileTab === 'RADAR' && (
            <div className="flex flex-col space-y-3">
              {/* Real-Time Flash Surge & Activity Radar Feed on Mobile */}
              <RadarFeed />
              {panelVisibility.patternRadar && <BreakoutPatternRadar />}
              {!isBeginner && panelVisibility.heroZeroRadar && <HeroZeroRadar />}
            </div>
          )}
          {mobileTab === 'NEWS' && <NewsWireTab />}
        </div>
      </main>

      {/* Terminal Status Footer */}
      <footer className="border-t border-terminal-border bg-terminal-card px-4 py-2.5 text-[11px] font-sans text-terminal-muted flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="font-bold text-terminal-text tracking-tight flex items-center gap-1.5">
            <img src="/favicon-32x32.png" className="w-3.5 h-3.5 object-contain" alt="" />
            <span>FAYDA PRO</span>
          </span>
          <span>•</span>
          <span>Official NSE / BSE Real-time Stream</span>
          <span>•</span>
          <span className="text-bull font-semibold">Fyers API v3 Authorized</span>
          <span>•</span>
          <span>@vertexinfo.co.in</span>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 text-center font-mono">
          <span>Market Hours: <strong className="text-terminal-text">09:15 – 15:40 IST</strong></span>
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
