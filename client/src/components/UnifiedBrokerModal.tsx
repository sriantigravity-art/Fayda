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
  Copy,
  Loader2,
  Unlink
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
  defaultBroker = 'FYERS'
}) => {
  const { 
    dhanConfig, 
    connectDhan, 
    disconnectDhan, 
    fyersConfig, 
    connectFyers, 
    disconnectFyers,
    exchangeAuthCode, 
    refreshFyersToken,
    activeBroker, 
    effectiveBroker,
    selectBroker 
  } = useMarket();

  const [selectedTab, setSelectedTab] = useState<'FYERS' | 'DHAN' | 'ANGEL' | 'ZERODHA' | 'SIMULATOR'>('FYERS');

  // Dhan Form States
  const [dhanClientId, setDhanClientId] = useState<string>(() => {
    return dhanConfig.clientId || localStorage.getItem('dhan_client_id') || '';
  });
  const [dhanAccessToken, setDhanAccessToken] = useState<string>('');
  const [showDhanToken, setShowDhanToken] = useState(false);
  const [dhanLoading, setDhanLoading] = useState(false);
  const [dhanStatusMsg, setDhanStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Fyers Form States (Simple: App ID, Secret Key, Auth Code)
  const [fyersAppId, setFyersAppId] = useState<string>(() => {
    return fyersConfig.appId || localStorage.getItem('fyers_app_id') || 'KMSSMU5OGR-100';
  });
  const [fyersSecretKey, setFyersSecretKey] = useState<string>('MVADUMZWBM');
  const [fyersAuthCode, setFyersAuthCode] = useState<string>('');
  const [showFyersSecret, setShowFyersSecret] = useState(false);
  const [fyersLoading, setFyersLoading] = useState(false);
  const [fyersStatusMsg, setFyersStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
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
    localStorage.setItem('fyers_app_id', cleanAppId);
    const res = await exchangeAuthCode(cleanAppId, (fyersSecretKey.trim() || 'MVADUMZWBM'), code);
    setFyersLoading(false);

    if (res.success) {
      setFyersStatusMsg({ success: true, text: `✅ Fyers Connected as ${res.userName || 'Trader'}! Live option chain streaming active.` });
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

  const handleFyersConnectSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fyersAppId.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter your Fyers App ID.' });
      return;
    }
    if (!fyersSecretKey.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter your Fyers Secret Key.' });
      return;
    }
    if (!fyersAuthCode.trim()) {
      setFyersStatusMsg({ success: false, text: 'Please enter or paste the Auth Code / Redirect URL.' });
      return;
    }
    triggerFyersExchangeWithCode(fyersAuthCode);
  };

  const handleDisconnectFyers = async () => {
    setFyersLoading(true);
    try {
      await disconnectFyers();
      setFyersLoading(false);
      setFyersStatusMsg({ success: true, text: 'Disconnected from Fyers.' });
    } catch (err: any) {
      setFyersLoading(false);
      setFyersStatusMsg({ success: false, text: err.message || 'Disconnect failed.' });
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
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
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
              PRIMARY
            </span>
          </button>

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
          {/* TAB 1: FYERS (API v3) - SIMPLE 3-FIELD CONNECTION                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {selectedTab === 'FYERS' && (
            <div className="space-y-4">
              {/* Fyers Active Status Banner */}
              {fyersConfig.isConnected ? (
                <div className="space-y-2">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-terminal-text">
                            Fyers API v3 Connected
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40">
                            LIVE STREAMING
                          </span>
                        </div>
                        <div className="text-xs text-terminal-muted font-mono mt-0.5">
                          User: <span className="font-bold text-terminal-text">{fyersConfig.userName || 'Fyers Trader'}</span>
                          {fyersConfig.appId && <span className="ml-2">({fyersConfig.appId})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeBroker !== 'FYERS' ? (
                        <button
                          type="button"
                          onClick={() => selectBroker('FYERS')}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          Set as Active Live Feed
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                          Active Live Provider
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleDisconnectFyers}
                        disabled={fyersLoading}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Simple Connect Card: App ID, Secret Key, Auth Code */}
              <div className="p-4 rounded-xl bg-terminal-panel/50 border border-terminal-border space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-terminal-text flex items-center gap-2">
                      <span>Connect Fyers Account</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
                        Zero Latency WebSocket
                      </span>
                    </h3>
                    <p className="text-xs text-terminal-muted mt-0.5">
                      Provide your App ID, Secret Key, and Auth Code to connect.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchFyersLogin}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🚀 Launch Fyers Login</span>
                  </button>
                </div>

                {/* Form asking for App ID, Secret Key, and Auth Code */}
                <form onSubmit={handleFyersConnectSubmit} className="space-y-3.5">
                  {/* Field 1: App ID */}
                  <div>
                    <label className="block text-xs font-bold text-terminal-text mb-1">
                      1. Fyers App ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fyersAppId}
                        onChange={(e) => setFyersAppId(e.target.value)}
                        placeholder="e.g. KMSSMU5OGR-100"
                        className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-lg text-sm text-terminal-text font-mono focus:border-sky-500 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-terminal-muted mt-1">
                      Your App ID from the Fyers API Dashboard (with <code className="text-sky-500 font-mono">-100</code>).
                    </p>
                  </div>

                  {/* Field 2: Secret Key */}
                  <div>
                    <label className="block text-xs font-bold text-terminal-text mb-1">
                      2. Secret Key
                    </label>
                    <div className="relative">
                      <input
                        type={showFyersSecret ? 'text' : 'password'}
                        value={fyersSecretKey}
                        onChange={(e) => setFyersSecretKey(e.target.value)}
                        placeholder="e.g. MVADUMZWBM"
                        className="w-full px-3 py-2 pr-10 bg-terminal-bg border border-terminal-border rounded-lg text-sm text-terminal-text font-mono focus:border-sky-500 focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFyersSecret(!showFyersSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text transition cursor-pointer"
                      >
                        {showFyersSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-terminal-muted mt-1">
                      Your Secret Key from the Fyers API app dashboard.
                    </p>
                  </div>

                  {/* Field 3: Auth Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-terminal-text">
                        3. Auth Code (or Redirect URL)
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboardAndConnect}
                        className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Paste from Clipboard & Connect</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={fyersAuthCode}
                        onChange={(e) => setFyersAuthCode(e.target.value)}
                        placeholder="Paste auth_code or complete redirect URL after logging in"
                        className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-lg text-sm text-terminal-text font-mono focus:border-sky-500 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-terminal-muted mt-1">
                      Click <b>"Launch Fyers Login"</b> above &rarr; sign in &rarr; copy the redirect URL from your browser address bar & paste here.
                    </p>
                  </div>

                  {/* Submit / Connect Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={fyersLoading || !fyersAppId.trim() || !fyersSecretKey.trim() || !fyersAuthCode.trim()}
                      className="flex-1 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 cursor-pointer"
                    >
                      {fyersLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting to Fyers API v3...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Connect Fyers Live Feed</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Status Message */}
                {fyersStatusMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono ${
                      fyersStatusMsg.success
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {fyersStatusMsg.text}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: DHAN (DHANHQ API v2)                                        */}
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
