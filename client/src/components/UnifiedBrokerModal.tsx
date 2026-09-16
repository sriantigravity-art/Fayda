import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { 
  KeyRound, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Zap, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  HelpCircle,
  Radio,
  Sliders,
  ShieldCheck,
  Check,
  Clock,
  CalendarClock,
  Repeat2,
  Copy
} from 'lucide-react';
import type { ActiveBroker } from '../types';

// ── Token expiry helpers ──────────────────────────────────────────────────────

/** Formats time remaining until an ISO date string as "Xh Ym" or "Expired" */
function formatTimeRemaining(isoExpiry: string | undefined): { label: string; urgent: boolean; expired: boolean } {
  if (!isoExpiry) return { label: 'Unknown', urgent: false, expired: false };
  const msRemaining = new Date(isoExpiry).getTime() - Date.now();
  if (msRemaining <= 0) return { label: 'EXPIRED', urgent: true, expired: true };
  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const urgent = totalMinutes < 120; // < 2 hours
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return { label: `${days}d ${remH}h`, urgent: false, expired: false };
  }
  return { label: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, urgent, expired: false };
}

/** Returns a Dhan token expiry ISO (30 days from issuedAt for Data API, 1 day for free) */
function dhanTokenExpiresAt(issuedAt: string | undefined, hasDataApi: boolean | undefined): string | undefined {
  if (!issuedAt) return undefined;
  const issued = new Date(issuedAt).getTime();
  // Dhan free tokens ~1 day, Data API tokens up to 30 days
  const validityMs = hasDataApi ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(issued + validityMs).toISOString();
}

interface UnifiedBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBroker?: 'DHAN' | 'FYERS';
}

export const UnifiedBrokerModal: React.FC<UnifiedBrokerModalProps> = ({ 
  isOpen, 
  onClose,
  defaultBroker = 'DHAN'
}) => {
  const { 
    dhanConfig, 
    connectDhan, 
    disconnectDhan, 
    fyersConfig, 
    connectFyers, 
    exchangeAuthCode, 
    refreshFyersToken,
    saveFyersPin,
    testFyersRenewal,
    activeBroker, 
    effectiveBroker,
    selectBroker 
  } = useMarket();

  const [selectedTab, setSelectedTab] = useState<'DHAN' | 'FYERS' | 'ANGEL' | 'ZERODHA' | 'SIMULATOR'>('DHAN');

  // Dhan Form States
  const [dhanClientId, setDhanClientId] = useState<string>(() => {
    return dhanConfig.clientId || localStorage.getItem('dhan_client_id') || '';
  });
  const [dhanAccessToken, setDhanAccessToken] = useState<string>('');
  const [showDhanToken, setShowDhanToken] = useState(false);
  const [dhanLoading, setDhanLoading] = useState(false);
  const [dhanStatusMsg, setDhanStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Fyers Form States
  const [fyersAppId, setFyersAppId] = useState<string>(() => {
    return fyersConfig.appId || localStorage.getItem('fyers_app_id') || 'KMSSMU5OGR-100';
  });
  const [fyersSecretKey, setFyersSecretKey] = useState<string>('MVADUMZWBM');
  const [fyersAuthCode, setFyersAuthCode] = useState<string>('');
  const [fyersAccessToken, setFyersAccessToken] = useState<string>('');
  const [showFyersSecret, setShowFyersSecret] = useState(false);
  const [showFyersToken, setShowFyersToken] = useState(false);
  const [fyersLoading, setFyersLoading] = useState(false);
  const [fyersStatusMsg, setFyersStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [fyersSubTab, setFyersSubTab] = useState<'ONE_CLICK' | 'AUTH_CODE' | 'DIRECT_TOKEN'>('ONE_CLICK');
  const [fyersPin, setFyersPin] = useState<string>(() => {
    try { return localStorage.getItem('fyers_pin') || ''; } catch { return ''; }
  });
  const [rememberPin, setRememberPin] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(0);
  const [isListeningClipboard, setIsListeningClipboard] = useState<boolean>(false);

  // SEC-06 Remediation: Purge any legacy secrets accidentally stored in localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('fyers_secret_key');
      localStorage.removeItem('fyers_access_token');
      localStorage.removeItem('dhan_access_token');
    } catch {}
  }, []);

  useEffect(() => {
    if (defaultBroker) {
      setSelectedTab(defaultBroker);
    }
  }, [defaultBroker]);

  useEffect(() => {
    if (dhanConfig.clientId) setDhanClientId(dhanConfig.clientId);
  }, [dhanConfig]);

  useEffect(() => {
    if (fyersConfig.appId) setFyersAppId(fyersConfig.appId);
  }, [fyersConfig]);

  // ── Live countdown ticker (updates every minute) ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // ── Dhan Handlers ──
  const handleConnectDhan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dhanClientId.trim() || !dhanAccessToken.trim()) {
      setDhanStatusMsg({ success: false, text: 'Please enter both Dhan Client ID and Access Token' });
      return;
    }

    setDhanLoading(true);
    setDhanStatusMsg(null);

    try {
      localStorage.setItem('dhan_client_id', dhanClientId.trim());

      const res = await connectDhan(dhanClientId.trim(), dhanAccessToken.trim());
      setDhanLoading(false);

      if (res.success) {
        setDhanStatusMsg({ 
          success: true, 
          text: `✅ Connected to DhanHQ as ${res.userName || dhanClientId}! Real-time option chain active.` 
        });
      } else {
        setDhanStatusMsg({ success: false, text: `❌ ${res.message}` });
      }
    } catch (err: any) {
      setDhanLoading(false);
      setDhanStatusMsg({ success: false, text: `❌ ${err.message || 'Connection failed'}` });
    }
  };

  const handleDisconnectDhan = async () => {
    await disconnectDhan();
    setDhanStatusMsg({ success: true, text: 'Disconnected from Dhan. Switched to fallback.' });
  };

  // ── Fyers Handlers ──
  const handleConnectFyers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyersAppId.trim() || !fyersAccessToken.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter both Fyers App ID and Access Token' });
      return;
    }

    const token = fyersAccessToken.trim();
    if (token.includes('auth_code=') || token.startsWith('http')) {
      setFyersStatusMsg({
        success: false,
        text: '⚠️ You pasted an Auth Code or redirect URL into the Access Token field. Please switch to "Option 1: Generate Auth Code" to exchange it for an Access Token.'
      });
      return;
    }

    if (!token.includes('.') && token.length < 50) {
      setFyersStatusMsg({
        success: false,
        text: '⚠️ Fyers Access Tokens are long JWT strings (starting with eyJ...). If you only have your App ID & Secret Key, please use "Option 1: Generate Auth Code" to connect.'
      });
      return;
    }

    setFyersLoading(true);
    setFyersStatusMsg(null);

    const cleanAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : `${fyersAppId.trim()}-100`;
    localStorage.setItem('fyers_app_id', cleanAppId);

    const res = await connectFyers(cleanAppId, token, fyersSecretKey.trim());
    setFyersLoading(false);

    if (res.success) {
      setFyersStatusMsg({ success: true, text: `✅ Connected to Fyers as ${res.userName || 'Trader'}!` });
      selectBroker('FYERS');
    } else {
      const cleanText = res.message?.includes('Unexpected token') || res.message?.includes('is not valid JSON')
        ? 'Could not authenticate with Fyers servers. Please check your credentials.'
        : res.message;
      setFyersStatusMsg({ success: false, text: `❌ ${cleanText}` });
    }
  };

  const triggerFyersExchangeWithCode = async (rawCode: string) => {
    let code = rawCode.trim();
    if (code.includes('auth_code=')) {
      try {
        const urlObj = code.startsWith('http') ? new URL(code) : new URL(`http://dummy.com?${code}`);
        const extracted = urlObj.searchParams.get('auth_code');
        if (extracted) {
          code = extracted.trim();
        } else {
          const match = code.match(/auth_code=([^&#\s]+)/);
          if (match && match[1]) code = decodeURIComponent(match[1]).trim();
        }
      } catch {
        const match = code.match(/auth_code=([^&#\s]+)/);
        if (match && match[1]) code = decodeURIComponent(match[1]).trim();
      }
    }
    setFyersAuthCode(code);
    setFyersLoading(true);
    setFyersStatusMsg(null);

    const cleanAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : `${fyersAppId.trim()}-100`;
    const res = await exchangeAuthCode(cleanAppId, (fyersSecretKey.trim() || 'MVADUMZWBM'), code, fyersPin.trim());
    setFyersLoading(false);

    if (res.success) {
      setFyersStatusMsg({ success: true, text: `✅ Fyers Connected as ${res.userName || 'Trader'}! Daily 9:00 AM auto-renewal is ACTIVE on trading days.` });
      selectBroker('FYERS');
      setIsListeningClipboard(false);
      setCountdown(0);
    } else {
      let cleanText = res.message || 'Authentication failed.';
      if (cleanText.includes('Unexpected token') || cleanText.includes('is not valid JSON')) {
        cleanText = 'Fyers authentication returned an unexpected response. Auth codes expire in 2 minutes and can only be used once.';
      }
      setFyersStatusMsg({ success: false, text: `❌ ${cleanText}` });
    }
  };

  const handleFyersExchange = () => {
    if (!fyersAuthCode.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter or paste the Auth Code / Redirect URL.' });
      return;
    }
    triggerFyersExchangeWithCode(fyersAuthCode);
  };

  const handleFyersOneClickRefresh = async () => {
    if (!fyersPin.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter your 4-digit Fyers PIN.' });
      return;
    }
    setFyersLoading(true);
    setFyersStatusMsg(null);
    try {
      if (rememberPin) {
        try { localStorage.setItem('fyers_pin', fyersPin.trim()); } catch {}
      }
      // Save PIN permanently to server configuration and execute immediate renewal
      const res = await saveFyersPin(fyersPin.trim());
      setFyersLoading(false);
      if (res.success) {
        setFyersStatusMsg({ success: true, text: `✅ Fyers Connected & PIN Saved! Active as ${res.userName || 'Trader'}. Daily 9:00 AM auto-renewal is now ACTIVE on all trading days.` });
        selectBroker('FYERS');
      } else {
        setFyersStatusMsg({ success: false, text: `❌ ${res.message || 'Token refresh failed. Please verify PIN.'}` });
      }
    } catch (err: any) {
      setFyersLoading(false);
      setFyersStatusMsg({ success: false, text: `❌ ${err.message || 'Connection failed'}` });
    }
  };

  const handleTestFyersRenewal = async () => {
    setFyersLoading(true);
    setFyersStatusMsg(null);
    try {
      const res = await testFyersRenewal();
      setFyersLoading(false);
      if (res.success) {
        setFyersStatusMsg({ success: true, text: `✅ Daily 9:00 AM Auto-Renewal Test Passed! Connected as ${fyersConfig.userName || 'Trader'}.` });
      } else {
        setFyersStatusMsg({ success: false, text: `❌ Auto-Renewal Test: ${res.message || 'Verification failed. Please check PIN.'}` });
      }
    } catch (err: any) {
      setFyersLoading(false);
      setFyersStatusMsg({ success: false, text: `❌ ${err.message || 'Test failed'}` });
    }
  };

  const handleLaunchFyersLogin = () => {
    setIsListeningClipboard(true);
    setCountdown(120);
    window.open(fyersLoginUrl, '_blank', 'width=650,height=800');
  };

  const handlePasteFromClipboardAndConnect = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setFyersStatusMsg({ success: false, text: 'Clipboard access not allowed by browser. Please paste the code manually.' });
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        setFyersStatusMsg({ success: false, text: 'Clipboard is empty. Copy the Fyers redirect URL after logging in.' });
        return;
      }
      await triggerFyersExchangeWithCode(clipText.trim());
    } catch (err: any) {
      setFyersStatusMsg({ success: false, text: `Clipboard error: ${err.message || 'Unable to read clipboard'}` });
    }
  };

  // Auto-detect Fyers URL / auth code in clipboard when switching back to app window
  useEffect(() => {
    if (!isOpen || selectedTab !== 'FYERS' || !isListeningClipboard) return;

    const handleWindowFocus = async () => {
      try {
        if (navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text && (text.includes('auth_code=') || text.includes('trade.fyers.in') || (text.length > 50 && text.startsWith('eyJ')))) {
            console.log('[Fyers] Auto-detected Fyers auth code in clipboard on window focus!');
            triggerFyersExchangeWithCode(text.trim());
          }
        }
      } catch {}
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [isOpen, selectedTab, isListeningClipboard, fyersSecretKey, fyersAppId]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const normalizedFyersAppId = fyersAppId.trim().includes('-') ? fyersAppId.trim() : (fyersAppId.trim() ? `${fyersAppId.trim()}-100` : 'KMSSMU5OGR-100');
  const fyersLoginUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${normalizedFyersAppId}&redirect_uri=https://trade.fyers.in/api-login/redirect-uri/index.html&response_type=code&state=sample_state`;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-terminal-card border border-terminal-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border bg-terminal-panel/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-terminal-text flex items-center gap-2">
                <span>Unified Broker & Live Data Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  MULTI-BROKER READY
                </span>
              </h2>
              <p className="text-xs text-terminal-muted mt-0.5">
                Connect your Indian broker account for zero-latency tick data & 1-click execution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Provider Selector Bar */}
        <div className="px-5 py-3 border-b border-terminal-border bg-terminal-bg/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-mono text-terminal-muted flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Active Real-Time Provider:</span>
          </span>
          <div className="flex items-center gap-1.5 bg-terminal-panel p-1 rounded-xl border border-terminal-border text-xs font-mono font-bold flex-wrap">
            <button
              type="button"
              onClick={() => selectBroker('DHAN')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'DHAN'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dhanConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Dhan {dhanConfig.isConnected && '(Live)'}</span>
            </button>

            <button
              type="button"
              onClick={() => selectBroker('FYERS')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'FYERS'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${fyersConfig.isConnected ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>Fyers {fyersConfig.isConnected && '(Live)'}</span>
            </button>

            {/* Angel One — Coming Soon */}
            <button
              type="button"
              disabled
              title="Angel One integration coming soon"
              className="px-3 py-1 rounded-lg flex items-center gap-1.5 text-terminal-muted/50 cursor-not-allowed opacity-60"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500/40" />
              <span>Angel One</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500/60 border border-amber-500/20 font-bold">SOON</span>
            </button>

            {/* Zerodha — Coming Soon */}
            <button
              type="button"
              disabled
              title="Zerodha integration coming soon"
              className="px-3 py-1 rounded-lg flex items-center gap-1.5 text-terminal-muted/50 cursor-not-allowed opacity-60"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500/40" />
              <span>Zerodha</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-500/60 border border-rose-500/20 font-bold">SOON</span>
            </button>

            <button
              type="button"
              onClick={() => selectBroker('SIMULATOR')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeBroker === 'SIMULATOR'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span>Exchange Simulator</span>
            </button>
          </div>
        </div>

        {/* Broker Tabs */}
        <div className="flex border-b border-terminal-border bg-terminal-panel/40 px-5 pt-2 gap-2 text-xs font-mono overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTab('DHAN')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'DHAN'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>🟢 Dhan (DhanHQ v2)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('FYERS')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'FYERS'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>🔵 Fyers (API v3)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('ANGEL')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'ANGEL'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span>🟠 Angel One</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('ZERODHA')}
            className={`px-4 py-2 rounded-t-xl font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              selectedTab === 'ZERODHA'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-terminal-card'
                : 'border-transparent text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <span>🔴 Zerodha (Kite)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              PAID
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4 min-w-0">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DHAN (DHANHQ API v2)                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'DHAN' && (
            <div className="space-y-4">
              {/* Dhan Active Status Banner */}
              {dhanConfig.isConnected ? (
                <div className="space-y-2">
                  <div className={`p-4 rounded-xl ${dhanConfig.hasDataApi === false ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'} flex items-center justify-between flex-wrap gap-3`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl ${dhanConfig.hasDataApi === false ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'} flex items-center justify-center`}>
                        {dhanConfig.hasDataApi === false ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-terminal-text">
                            {dhanConfig.hasDataApi === false ? 'Dhan Trading API Connected' : 'DhanHQ Connected & Streaming'}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${dhanConfig.hasDataApi === false ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'}`}>
                            {dhanConfig.hasDataApi === false ? 'TRADING ONLY' : 'LIVE 25 REQ/S'}
                          </span>
                          {/* Token validity badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            dhanConfig.hasDataApi
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                              : 'bg-orange-500/10 text-orange-500 border border-orange-500/25'
                          }`}>
                            {dhanConfig.hasDataApi ? '30-DAY TOKEN' : '1-DAY TOKEN'}
                          </span>
                        </div>
                        <p className="text-xs text-terminal-muted mt-0.5">
                          Client ID: <strong className="text-terminal-text font-mono">{dhanConfig.clientId}</strong> • 
                          User: <strong className="text-terminal-text">{dhanConfig.userName || 'Active'}</strong>
                        </p>
                        {/* Expiry countdown */}
                        {(() => {
                          const expiresAt = dhanConfig.tokenExpiresAt || dhanTokenExpiresAt(dhanConfig.tokenIssuedAt, dhanConfig.hasDataApi);
                          const { label, urgent, expired } = formatTimeRemaining(expiresAt);
                          return (
                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-mono font-semibold ${
                              expired ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-terminal-muted'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {expired ? '⚠️ Token expired — please reconnect' : `Token expires in: ${label}`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeBroker !== 'DHAN' && (
                        <button
                          type="button"
                          onClick={() => selectBroker('DHAN')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDisconnectDhan}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 font-mono text-xs font-bold transition cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Expired token warning */}
                  {(() => {
                    const expiresAt = dhanConfig.tokenExpiresAt || dhanTokenExpiresAt(dhanConfig.tokenIssuedAt, dhanConfig.hasDataApi);
                    const { expired, urgent } = formatTimeRemaining(expiresAt);
                    if (!expired && !urgent) return null;
                    return (
                      <div className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                        expired 
                          ? 'bg-red-500/10 border-red-500/30 text-red-500'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {expired
                            ? '⛔ Dhan token has expired. Please generate a new access token from web.dhan.co and reconnect.'
                            : '⚠️ Dhan token expiring soon. Generate a fresh token before market open tomorrow.'}
                        </span>
                      </div>
                    );
                  })()}

                  {dhanConfig.hasDataApi === false && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-terminal-text space-y-1.5 font-mono">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Dhan Error 806: Market Data API Not Subscribed</span>
                      </div>
                      <p className="text-terminal-muted text-[11px] leading-relaxed">
                        Dhan provides Trading APIs for free, but charges ₹499/mo for live Option Chain &amp; LTP Data API.
                        To stream live data directly from Dhan, visit <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">web.dhan.co</a> &gt; Profile &gt; <strong>DhanHQ Trading APIs</strong> &gt; <strong>Data API</strong> tab &gt; <strong>Subscribe</strong>, then regenerate a fresh token.
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        ✅ In the meantime, Fayda is streaming live real-time option chains seamlessly using the official NSE live feed!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-accent-cyan/5 to-transparent border border-emerald-500/20 flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-terminal-text">
                      Why Connect Dhan? (100% Free Lifetime Trading API)
                    </p>
                    <p className="text-terminal-muted">
                      Dhan provides dedicated native Option Chain endpoints with tick-by-tick Open Interest, Greeks, and instant order placement. Tokens last up to 30 days!
                    </p>
                  </div>
                </div>
              )}

              {/* Dhan Connection Form */}
              <form onSubmit={handleConnectDhan} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono font-bold text-terminal-text mb-1">
                    Dhan Client ID (10 Digits)
                  </label>
                  <input
                    type="text"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    placeholder="e.g. 1000123456"
                    className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono font-bold text-terminal-text">
                      Dhan Access Token (JWT Token)
                    </label>
                    <a
                      href="https://web.dhan.co/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open web.dhan.co</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showDhanToken ? "text" : "password"}
                      value={dhanAccessToken}
                      onChange={(e) => setDhanAccessToken(e.target.value)}
                      placeholder="Paste your token from DhanHQ Trading APIs"
                      className="w-full px-3 py-2 pr-10 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDhanToken(!showDhanToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                    >
                      {showDhanToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Instructions Box */}
                <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-xs font-mono">
                  <span className="font-bold text-terminal-text flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>How to get your free DhanHQ token in 30 seconds:</span>
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-terminal-muted text-[11px]">
                    <li>Login to <a href="https://web.dhan.co" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">web.dhan.co</a>.</li>
                    <li>Click your Profile icon on top right &gt; Select <strong>"DhanHQ Trading APIs"</strong>.</li>
                    <li>Click <strong>"Generate Access Token"</strong>, copy it, and paste it in the box above!</li>
                  </ol>
                  {/* Token lifetime info */}
                  <div className="pt-1 border-t border-terminal-border/50 space-y-1 text-[10px]">
                    <div className="flex items-center gap-1.5 text-orange-500 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>Free tier tokens expire in ~1 day — regenerate daily for uninterrupted access.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-500 font-semibold">
                      <CalendarClock className="w-3 h-3" />
                      <span>Data API subscribers (₹499/mo) get 30-day tokens — set and forget!</span>
                    </div>
                  </div>
                </div>

                {dhanStatusMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-mono ${
                    dhanStatusMsg.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}>
                    {dhanStatusMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={dhanLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {dhanLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating with DhanHQ Servers...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Connect DhanHQ Live Feed</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: FYERS (API v3)                                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'FYERS' && (
            <div className="space-y-4">
              {/* Fyers Status Banner */}
              {fyersConfig.isConnected ? (
                <div className="space-y-2">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className="font-bold text-sm text-terminal-text">Fyers API v3 Connected</span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40">
                            ACTIVE
                          </span>
                          {/* Daily token badge */}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-500/10 text-orange-500 border border-orange-500/25">
                            1-DAY TOKEN
                          </span>
                          {/* Auto-renewal badge */}
                          {fyersConfig.hasRefreshToken && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                              <Repeat2 className="w-2.5 h-2.5" />
                              9:00 AM AUTO-RENEW ACTIVE
                            </span>
                          )}
                          {fyersConfig.hasPin && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/25">
                              PIN SAVED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-terminal-muted mt-0.5">
                          App ID: <strong className="text-terminal-text font-mono">{fyersConfig.appId}</strong> • User: <strong className="text-terminal-text">{fyersConfig.userName || 'Trader'}</strong>
                        </p>
                        {/* Next Scheduled 9:00 AM Renewal */}
                        {fyersConfig.nextDailyRenewalAt && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            <CalendarClock className="w-3 h-3" />
                            <span>Next 9:00 AM Renewal: {new Date(fyersConfig.nextDailyRenewalAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })} at 09:00:00 AM IST (Trading Day)</span>
                          </div>
                        )}
                        {/* Expiry countdown */}
                        {(() => {
                          const { label, urgent, expired } = formatTimeRemaining(fyersConfig.tokenExpiresAt);
                          if (!fyersConfig.tokenExpiresAt) return null;
                          return (
                            <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-mono font-semibold ${
                              expired ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-terminal-muted'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {expired 
                                ? fyersConfig.hasRefreshToken 
                                  ? '⏳ Daily token expired — auto-renewal runs at 9:00 AM IST on trading days'
                                  : '⚠️ Token expired — please reconnect'
                                : `Token expires in: ${label}${fyersConfig.hasRefreshToken ? ' (daily 9:00 AM renewal active)' : ''}`
                              }
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeBroker !== 'FYERS' && (
                        <button
                          type="button"
                          onClick={() => selectBroker('FYERS')}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-bold text-xs hover:bg-sky-600 transition cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expired token warning */}
                  {(() => {
                    const { expired, urgent } = formatTimeRemaining(fyersConfig.tokenExpiresAt);
                    if (!fyersConfig.tokenExpiresAt || (!expired && !urgent)) return null;
                    return (
                      <div className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                        expired
                          ? 'bg-red-500/10 border-red-500/30 text-red-500'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {expired
                            ? fyersConfig.hasRefreshToken
                              ? '⏳ Daily token expired. Server will auto-renew at 9:00 AM IST on the next trading day using your saved PIN. No manual action needed!'
                              : '⛔ Session expired. Please generate a new token using the Auth Code flow below.'
                            : '⚠️ Fyers access token expiring soon. It will auto-renew at 9:00 AM IST on the next trading day.'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {/* Fyers Sub-Tab Switcher */}
              <div className="flex bg-terminal-panel p-1 rounded-xl border border-terminal-border text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setFyersSubTab('ONE_CLICK')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    fyersSubTab === 'ONE_CLICK'
                      ? 'bg-gradient-to-r from-sky-500/25 to-blue-500/25 text-sky-400 border border-sky-500/40 shadow-sm font-bold'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>⚡ 9:00 AM Auto-Renew (PIN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFyersSubTab('AUTH_CODE')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    fyersSubTab === 'AUTH_CODE'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  Option 2: Auth Link &amp; Auto-Detect
                </button>
                <button
                  type="button"
                  onClick={() => setFyersSubTab('DIRECT_TOKEN')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    fyersSubTab === 'DIRECT_TOKEN'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  Option 3: JWT Token
                </button>
              </div>

              {fyersSubTab === 'ONE_CLICK' ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sky-400">
                        <KeyRound className="w-4 h-4" />
                        <span>Fyers Master Broker Config (Pre-Loaded)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                        Client ID: YS04036
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-terminal-muted">
                      <div>App ID: <strong className="text-terminal-text">KMSSMU5OGR-100</strong></div>
                      <div>Secret: <strong className="text-terminal-text">MVADUMZWBM</strong></div>
                    </div>
                    <p className="text-[11px] text-terminal-muted leading-relaxed">
                      Fyers API v3 requires your 4-digit Trading PIN to renew tokens. Save your PIN once below and the terminal will automatically fetch a fresh token <strong>every trading day at 9:00 AM IST</strong> without opening the Fyers website!
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-mono font-bold text-terminal-text">
                        Enter 4-Digit Fyers Trading PIN <span className="text-bear">*</span>
                      </label>
                      {fyersConfig.hasPin && (
                        <span className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> PIN Stored on Server
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={fyersPin}
                      onChange={(e) => setFyersPin(e.target.value)}
                      placeholder="Enter 4-digit PIN (e.g. 1234)"
                      className="w-full px-3 py-2.5 text-sm font-mono tracking-widest text-center bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-terminal-muted">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberPin}
                        onChange={(e) => setRememberPin(e.target.checked)}
                        className="rounded accent-sky-500"
                      />
                      <span>Save PIN permanently for automatic daily 9:00 AM renewal on trading days</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleFyersOneClickRefresh}
                      disabled={fyersLoading || !fyersPin.trim()}
                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {fyersLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-yellow-300" />}
                      <span>Save PIN &amp; Connect Live</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestFyersRenewal}
                      disabled={fyersLoading}
                      className="py-3 px-4 rounded-xl bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-text font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Repeat2 className="w-4 h-4 text-emerald-400" />
                      <span>⚡ Test 9:00 AM Renewal</span>
                    </button>
                  </div>
                </div>
              ) : fyersSubTab === 'AUTH_CODE' ? (
                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Fyers Interactive Login &amp; Auto-Detector</span>
                    </div>
                    <p className="text-[11px] text-terminal-muted leading-relaxed">
                      Click below to open Fyers login. After completing login, either copy the redirected address or simply switch back to this tab — our auto-detector will capture the code automatically!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchFyersLogin}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/40 text-sky-400 font-mono font-bold text-xs hover:bg-sky-500/30 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>🚀 Launch Fyers Login Link</span>
                  </button>

                  {countdown > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-pulse">
                      <span>⏳ Auth code active window: {countdown}s remaining</span>
                      <span className="text-[10px] font-mono">Expires in 2 min</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePasteFromClipboardAndConnect}
                    disabled={fyersLoading}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                    <span>📋 Paste from Clipboard &amp; Connect (1-Click)</span>
                  </button>

                  <div className="p-2.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-terminal-text">
                        4-Digit Fyers PIN (Enables 9:00 AM Auto-Renew)
                      </label>
                      {fyersConfig.hasPin && (
                        <span className="text-[9px] font-mono text-emerald-500 font-bold">● Stored</span>
                      )}
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={fyersPin}
                      onChange={(e) => setFyersPin(e.target.value)}
                      placeholder="Enter 4-digit PIN (e.g. 1234)"
                      className="w-full px-3 py-1.5 text-xs font-mono tracking-widest text-center bg-terminal-card border border-terminal-border rounded-lg text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-terminal-muted mb-1">
                      Or manually paste Auth Code / Redirect URL:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fyersAuthCode}
                        onChange={(e) => setFyersAuthCode(e.target.value)}
                        placeholder="Paste redirect URL or auth_code"
                        className="flex-1 px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                      />
                      <button
                        type="button"
                        onClick={handleFyersExchange}
                        disabled={fyersLoading || !fyersAuthCode.trim()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {fyersLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectFyers} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono font-bold text-terminal-text mb-1">Fyers App ID</label>
                    <input
                      type="text"
                      value={fyersAppId}
                      onChange={(e) => setFyersAppId(e.target.value)}
                      placeholder="e.g. KMSSMU5OGR-100"
                      className="w-full px-3 py-2 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-mono font-bold text-terminal-text">
                        Daily Access Token (JWT Token)
                      </label>
                      <span className="text-[10px] font-mono text-terminal-muted">
                        Starts with eyJ...
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showFyersToken ? "text" : "password"}
                        value={fyersAccessToken}
                        onChange={(e) => setFyersAccessToken(e.target.value)}
                        placeholder="Paste daily Fyers Access Token (JWT)"
                        className="w-full px-3 py-2 pr-10 text-xs font-mono bg-terminal-panel border border-terminal-border rounded-xl text-terminal-text focus:outline-none focus:border-sky-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFyersToken(!showFyersToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                      >
                        {showFyersToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Clarification tip */}
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-mono text-terminal-muted space-y-1">
                    <p className="text-terminal-text font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                      <span>Don't have a daily Access Token yet?</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Use <strong>Option 1: Generate Auth Code</strong> above to log in with your Fyers PIN/OTP and your Secret Key (API Key). It creates your daily token automatically in seconds!
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={fyersLoading}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {fyersLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Connect Fyers</span>
                  </button>
                </form>
              )}

              {fyersStatusMsg && (
                <div className="space-y-2">
                  <div className={`p-3 rounded-xl border text-xs font-mono ${
                    fyersStatusMsg.success 
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}>
                    {fyersStatusMsg.text}
                  </div>

                  {!fyersStatusMsg.success && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-terminal-muted space-y-2">
                      <p className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Why did Fyers reject this Auth Code?</span>
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                        <li><strong>Strict 2-minute expiration:</strong> Fyers invalidates auth codes exactly 120 seconds after you log in.</li>
                        <li><strong>Single-use only:</strong> An auth code cannot be exchanged twice. If you refreshed or retried, generate a new one.</li>
                        <li><strong>Secret Key mismatch:</strong> Verify your Secret Key matches your App in <a href="https://myapi.fyers.in" target="_blank" rel="noopener noreferrer" className="underline text-sky-500 hover:text-sky-400">myapi.fyers.in</a>.</li>
                      </ul>
                      <div className="pt-1 flex flex-wrap gap-2">
                        <a
                          href={fyersLoginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setFyersAuthCode('');
                            setFyersStatusMsg(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Generate Fresh Auth Code</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setFyersInputMode('DIRECT');
                            setFyersStatusMsg(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-border text-terminal-text border border-terminal-border font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <KeyRound className="w-3 h-3 text-sky-400" />
                          <span>Use Option 2: Direct Token</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: ANGEL ONE (SMARTAPI)                                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'ANGEL' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span>🟠 Angel One SmartAPI (100% Free Integration)</span>
                </span>
                <p className="text-terminal-muted leading-relaxed text-[11px]">
                  Angel One offers free SmartAPI access with automated TOTP login. We are finalizing the direct connector for Phase 2.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-[11px]">
                <p className="font-bold text-terminal-text">Prerequisites for Angel One:</p>
                <ul className="list-disc list-inside text-terminal-muted space-y-1">
                  <li>Client Code (e.g. A12345) &amp; MPIN.</li>
                  <li>API Key from <a href="https://smartapi.angelbroking.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">smartapi.angelbroking.com</a>.</li>
                  <li>Enable TOTP on Google Authenticator / Authy.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: ZERODHA (KITE CONNECT)                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'ZERODHA' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span>🔴 Zerodha Kite Connect API (Paid Subscription)</span>
                </span>
                <p className="text-terminal-muted leading-relaxed text-[11px]">
                  Zerodha charges ₹2,000/month for Kite Connect API access. If you already have an active Kite Developer App subscription, you will be able to plug in your API Key and Access Token here in Phase 2.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-2 text-[11px]">
                <p className="font-bold text-terminal-text">Why we recommend Dhan or Fyers over Zerodha:</p>
                <ul className="list-disc list-inside text-terminal-muted space-y-1">
                  <li>Dhan &amp; Fyers APIs are <strong>100% Free</strong> with zero monthly subscription fees.</li>
                  <li>Dhan natively provides an <strong>Option Chain API</strong>, whereas Zerodha requires manual multi-symbol polling loops.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-terminal-border bg-terminal-panel/60 flex items-center justify-between text-xs text-terminal-muted font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Effective Stream: <strong className="text-terminal-text">{effectiveBroker}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-terminal-card border border-terminal-border hover:bg-terminal-panel text-terminal-text transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
