import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { 
  KeyRound, 
  X, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface FyersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FyersModal: React.FC<FyersModalProps> = ({ isOpen, onClose }) => {
  const { fyersConfig, connectFyers, exchangeAuthCode, setDataSource } = useMarket();

  const [activeTab, setActiveTab] = useState<'AUTH_CODE' | 'DIRECT_TOKEN'>('AUTH_CODE');

  const [appId, setAppId] = useState<string>(() => {
    return fyersConfig.appId || localStorage.getItem('fyers_app_id') || 'KMSSMU5OGR-100';
  });
  const [secretKey, setSecretKey] = useState<string>(() => {
    return fyersConfig.secretKey || localStorage.getItem('fyers_secret_key') || '';
  });
  const [authCode, setAuthCode] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>(() => {
    return fyersConfig.accessToken || localStorage.getItem('fyers_access_token') || '';
  });

  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Sync state when config changes
  useEffect(() => {
    if (fyersConfig.appId) setAppId(fyersConfig.appId);
    if (fyersConfig.secretKey) setSecretKey(fyersConfig.secretKey);
    if (fyersConfig.accessToken) setAccessToken(fyersConfig.accessToken);
  }, [fyersConfig]);

  if (!isOpen) return null;

  const normalizedAppId = appId.trim().includes('-') ? appId.trim() : (appId.trim() ? `${appId.trim()}-100` : 'KMSSMU5OGR-100');
  const loginUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${normalizedAppId}&redirect_uri=https://trade.fyers.in/api-login/redirect-uri/index.html&response_type=code&state=sample_state`;

  // Auto-parse Auth Code if user pastes full redirect URL
  const handleAuthCodeChange = (val: string) => {
    let clean = val.trim();
    if (clean.includes('auth_code=')) {
      try {
        const url = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        const codeParam = url.searchParams.get('auth_code');
        if (codeParam) {
          clean = codeParam;
        }
      } catch (e) {
        const match = clean.match(/auth_code=([^&]+)/);
        if (match && match[1]) {
          clean = match[1];
        }
      }
    }
    setAuthCode(clean);
  };

  // Auto-detect if user pastes an auth_code into Direct Access Token field
  const handleAccessTokenChange = (val: string) => {
    let clean = val.trim();
    if (clean.startsWith('eyJ')) {
      try {
        const parts = clean.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.sub === 'auth_code') {
            setStatusMsg({
              success: false,
              text: '⚠️ You pasted an Auth Code (sub: "auth_code"). Please use the "Exchange Auth Code" tab with your Secret Key to generate the Access Token.'
            });
          }
        }
      } catch (e) {}
    }
    setAccessToken(clean);
  };

  const handleExchangeAuthCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId.trim() || !secretKey.trim() || !authCode.trim()) {
      setStatusMsg({ success: false, text: 'Please provide App ID, Secret Key, and today\'s Auth Code.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const cleanAppId = appId.trim().includes('-') ? appId.trim() : `${appId.trim()}-100`;
    const res = await exchangeAuthCode(cleanAppId, secretKey.trim(), authCode.trim());
    setLoading(false);

    if (res.success) {
      localStorage.setItem('fyers_app_id', cleanAppId);
      localStorage.setItem('fyers_secret_key', secretKey.trim());
      if (res.accessToken) {
        localStorage.setItem('fyers_access_token', res.accessToken);
        setAccessToken(res.accessToken);
      }
      setStatusMsg({ success: true, text: res.message || 'Connected to Fyers successfully!' });
      await setDataSource('FYERS_LIVE');
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setStatusMsg({ success: false, text: res.message || 'Failed to exchange Auth Code. Please verify your Secret Key.' });
    }
  };

  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId.trim() || !accessToken.trim()) {
      setStatusMsg({ success: false, text: 'Please provide both App ID and Access Token' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const cleanAppId = appId.trim().includes('-') ? appId.trim() : `${appId.trim()}-100`;
    const res = await connectFyers(cleanAppId, accessToken.trim(), secretKey.trim());
    setLoading(false);

    if (res.success) {
      localStorage.setItem('fyers_app_id', cleanAppId);
      localStorage.setItem('fyers_access_token', accessToken.trim());
      if (secretKey.trim()) localStorage.setItem('fyers_secret_key', secretKey.trim());
      setStatusMsg({ success: true, text: res.message || 'Connected to Fyers successfully!' });
      await setDataSource('FYERS_LIVE');
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setStatusMsg({ success: false, text: res.message || 'Failed to authenticate with Fyers' });
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-terminal-card border-2 border-accent-cyan/50 rounded-2xl max-w-xl w-full p-6 shadow-[0_0_60px_rgba(0,229,255,0.3)] relative font-sans text-xs my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-terminal-muted hover:text-terminal-text bg-terminal-panel hover:bg-terminal-bg p-1.5 rounded-lg border border-terminal-border transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 mb-4 pb-3 border-b border-terminal-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-bull/20 to-accent-cyan/20 text-bull border border-bull/40 shadow-md">
            <KeyRound className="w-6 h-6 text-accent-cyan" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-base text-terminal-text">
                FYERS API v3 CONNECTION
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bull/20 text-bull font-bold border border-bull/40">
                OFFICIAL BROKER API
              </span>
            </div>
            <p className="text-terminal-muted text-xs mt-0.5">
              100% Real-time direct exchange stream with sub-second orderflow
            </p>
          </div>
        </div>

        {/* Active Account Banner */}
        {fyersConfig.isConnected && (
          <div className="bg-bull/10 border border-bull/40 rounded-xl p-3 mb-4 flex items-center justify-between font-mono">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-bull animate-pulse" />
              <div>
                <span className="text-terminal-text font-bold text-xs block">
                  Active Account: SRS
                </span>
                <span className="text-[10px] text-bull">Streaming live exchange tick & option chain data</span>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-bull text-terminal-bg font-black">
              CONNECTED
            </span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-terminal-bg p-1 border border-terminal-border mb-4 font-mono">
          <button
            type="button"
            onClick={() => { setActiveTab('AUTH_CODE'); setStatusMsg(null); }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'AUTH_CODE'
                ? 'bg-gradient-to-r from-bull/20 to-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Auth Code Exchanger (Auto)</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('DIRECT_TOKEN'); setStatusMsg(null); }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'DIRECT_TOKEN'
                ? 'bg-gradient-to-r from-bull/20 to-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>🔑 Direct Access Token (Manual)</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border mb-4 flex items-start space-x-2 font-mono text-xs ${
              statusMsg.success
                ? 'bg-bull/15 border-bull/50 text-bull'
                : 'bg-bear/15 border-bear/50 text-bear'
            }`}
          >
            {statusMsg.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-bull mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-bear mt-0.5" />
            )}
            <span className="font-semibold leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* TAB 1: AUTH CODE EXCHANGER */}
        {activeTab === 'AUTH_CODE' && (
          <form onSubmit={handleExchangeAuthCode} className="space-y-3.5 font-mono">
            {/* Quick 2-Step Guide */}
            <div className="bg-terminal-bg/80 border border-terminal-border/80 rounded-xl p-3 space-y-2 text-[11px] text-terminal-muted">
              <div className="font-bold text-terminal-text flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-accent-cyan">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Daily 5-Second Connection:</span>
                </span>
                <a
                  href={loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-amber/15 text-amber border border-amber/40 hover:bg-amber/25 transition flex items-center gap-1 font-bold text-[10px]"
                >
                  <span>1. Open Fyers Login</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">
                1. Click the button above to login at Fyers.<br />
                2. Copy the redirect URL (or just the auth code) and paste it in the box below!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-terminal-muted text-[10px] mb-1 font-bold uppercase tracking-wider">
                  App ID (Client ID):
                </label>
                <input
                  type="text"
                  placeholder="e.g. KMSSMU5OGR-100"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition font-mono"
                />
              </div>

              <div>
                <label className="block text-terminal-muted text-[10px] mb-1 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Secret Key:</span>
                  <span className="text-[9px] text-accent-cyan normal-case">(Saved locally)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Enter Fyers Secret Key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 pr-8 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-terminal-muted text-[10px] mb-1 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Today's Auth Code or Redirect URL:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.readText().then((txt) => handleAuthCodeChange(txt)).catch(() => {});
                  }}
                  className="text-[10px] text-accent-cyan hover:underline"
                >
                  Paste from Clipboard
                </button>
              </label>
              <textarea
                rows={2}
                placeholder="Paste Auth Code (starts with eyJ... sub: auth_code) or the full redirect URL..."
                value={authCode}
                onChange={(e) => handleAuthCodeChange(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition font-mono resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-terminal-muted text-[10px]">
                <Lock className="w-3.5 h-3.5 text-bull" />
                <span>Secret Key is saved locally in your browser/server</span>
              </div>

              <button
                type="submit"
                disabled={loading || !authCode.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-bull via-accent-cyan to-accent-cyan text-terminal-bg font-black tracking-wide hover:opacity-90 transition shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-50 text-xs font-mono flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Exchanging...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Generate Token & Connect</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DIRECT ACCESS TOKEN */}
        {activeTab === 'DIRECT_TOKEN' && (
          <form onSubmit={handleDirectConnect} className="space-y-3.5 font-mono">
            <div>
              <label className="block text-terminal-muted text-[10px] mb-1 font-bold uppercase tracking-wider">
                Fyers App ID / Client ID:
              </label>
              <input
                type="text"
                placeholder="e.g. KMSSMU5OGR-100"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3.5 py-2 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition font-mono"
              />
            </div>

            <div>
              <label className="block text-terminal-muted text-[10px] mb-1 font-bold uppercase tracking-wider">
                Fyers Access Token (JWT with sub: "access_token"):
              </label>
              <textarea
                rows={3}
                placeholder="Paste pre-generated Fyers Access Token (eyJhbGciOiJIUzI1Ni...)"
                value={accessToken}
                onChange={(e) => handleAccessTokenChange(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3.5 py-2 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition font-mono resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-terminal-muted text-[10px]">
                <HelpCircle className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Must be an exchanged Access Token, not an Auth Code</span>
              </div>

              <button
                type="submit"
                disabled={loading || !accessToken.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-bull via-accent-cyan to-accent-cyan text-terminal-bg font-black tracking-wide hover:opacity-90 transition shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-50 text-xs font-mono"
              >
                {loading ? 'Connecting...' : 'Connect Fyers'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // Render via portal directly on document.body for true vertical and horizontal centering
  return createPortal(modalContent, document.body);
};
