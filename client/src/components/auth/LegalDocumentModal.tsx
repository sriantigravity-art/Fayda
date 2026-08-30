import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  FileText, 
  Lock, 
  AlertTriangle, 
  Cookie, 
  X, 
  ExternalLink,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { CURRENT_LEGAL_VERSION } from '../../context/AuthContext';

export type LegalDocType = 'RISK_DISCLOSURE' | 'TERMS' | 'PRIVACY' | 'DISCLAIMER' | 'COOKIES';

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocType;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'RISK_DISCLOSURE'
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialDoc);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110000] overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[88vh] bg-terminal-card border border-terminal-border rounded-2xl shadow-elevated flex flex-col overflow-hidden my-auto animate-scale-up">
        {/* Pinned Modal Top Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-terminal-border bg-terminal-panel/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-sky/15 border border-accent-sky/30 text-accent-sky">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-sans font-bold text-terminal-text flex items-center gap-2">
                <span>Fayda Legal & Compliance Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-sky/15 text-accent-sky font-mono font-bold">
                  v{CURRENT_LEGAL_VERSION}
                </span>
              </h2>
              <p className="text-xs text-terminal-muted font-sans">
                Official regulatory disclosures and user agreements
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex border-b border-terminal-border bg-terminal-bg/80 px-3 py-2 overflow-x-auto gap-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('RISK_DISCLOSURE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RISK_DISCLOSURE'
                ? 'bg-bear/20 border border-bear/40 text-bear shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Risk Disclosure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DISCLAIMER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DISCLAIMER'
                ? 'bg-amber/20 border border-amber/40 text-amber shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SEBI Disclaimer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TERMS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TERMS'
                ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Use</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PRIVACY'
                ? 'bg-bull/20 border border-bull/40 text-bull shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COOKIES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'COOKIES'
                ? 'bg-terminal-card border border-terminal-border text-terminal-text shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Policy</span>
          </button>
        </div>

        {/* Scrollable Document Text Content */}
        <div className="p-5 sm:p-6 overflow-y-auto font-sans text-xs sm:text-sm text-terminal-muted space-y-4 leading-relaxed max-h-[60vh]">
          {activeTab === 'RISK_DISCLOSURE' && (
            <div className="space-y-4 text-terminal-text">
              <div className="p-3.5 rounded-xl bg-bear/10 border border-bear/30 text-bear font-mono text-xs">
                <strong>CRITICAL REGULATORY NOTICE:</strong> Trading in equity derivatives (Futures & Options), commodities, and leveraged securities involves substantial risk of loss. 9 out of 10 individual traders in the equity F&O segment incur net losses according to SEBI research studies.
              </div>

              <h3 className="text-base font-bold text-terminal-text">1. Derivatives & Leverage Risk</h3>
              <p>
                Derivative contracts (Options and Futures) are highly leveraged instruments. A small movement in the underlying index or security can result in disproportionately large financial losses. Buyers of options risk the total loss of premium paid in a short duration due to time decay (Theta) and changes in implied volatility (Vega).
              </p>

              <h3 className="text-base font-bold text-terminal-text">2. Key Risk Dimensions in Indian Markets</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-terminal-muted">
                <li><strong>Market & Volatility Risk:</strong> Rapid intraday swings, gap openings on global cues (GIFT Nifty, US markets), and sudden reversals.</li>
                <li><strong>Option Time Decay (Theta):</strong> Option premiums depreciate continuously towards zero by expiry date.</li>
                <li><strong>Implied Volatility (IV) Crush:</strong> High IV during major events (RBI policy, Union Budget, earnings) collapses post-event, causing sharp premium contraction even if directional prediction was correct.</li>
                <li><strong>Liquidity & Slippage:</strong> Wide bid-ask spreads in illiquid or far-out-of-the-money (OTM) strikes may prevent timely execution at model prices.</li>
                <li><strong>Technology & Network Risk:</strong> Internet outages, exchange feed latencies, or server downtime may affect trade execution.</li>
              </ul>

              <h3 className="text-base font-bold text-terminal-text">3. Capital Suitability</h3>
              <p>
                You should only trade derivative instruments with risk capital that you can afford to lose completely without affecting your standard of living or financial security.
              </p>
            </div>
          )}

          {activeTab === 'DISCLAIMER' && (
            <div className="space-y-4 text-terminal-text">
              <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/30 text-amber font-mono text-xs">
                <strong>NON-ADVISORY & ALGORITHMIC DISCLAIMER:</strong> Fayda is a financial technology and quantitative decision-support terminal. It does NOT provide personalized investment advice or guaranteed return recommendations.
              </div>

              <h3 className="text-base font-bold text-terminal-text">1. Nature of Platform Services</h3>
              <p>
                All data, analytics, mathematical scores, pattern triggers, option-chain heatmaps, OI deltas, and multi-strategy confluence indicators provided by Fayda are algorithmic calculations generated for informational and educational purposes only.
              </p>

              <h3 className="text-base font-bold text-terminal-text">2. Zero Profit Guarantees</h3>
              <p>
                Fayda does NOT guarantee profits, trade success rates, accuracy of market predictions, or immunity from financial losses. Past algorithmic performance or backtested statistics do not guarantee future performance in live Indian markets.
              </p>

              <h3 className="text-base font-bold text-terminal-text">3. Regulatory Classification</h3>
              <p>
                Fayda is NOT an Investment Adviser (IA) or Research Analyst (RA) registered to provide individualized advice under the Securities and Exchange Board of India (SEBI) regulations. Users must conduct their own due diligence or consult a certified SEBI-registered professional before making any financial investment.
              </p>
            </div>
          )}

          {activeTab === 'TERMS' && (
            <div className="space-y-4 text-terminal-text">
              <h3 className="text-base font-bold text-terminal-text">1. Agreement to Terms</h3>
              <p>
                By accessing or using the Fayda terminal (`fayda-alpha.vercel.app`), you agree to be bound by these Terms of Use and all applicable Indian securities and telecommunications laws.
              </p>

              <h3 className="text-base font-bold text-terminal-text">2. Age and Eligibility</h3>
              <p>
                You represent and warrant that you are at least 18 years of age, legally competent to enter into binding contracts, and residing in a jurisdiction where access to stock market analytics software is permitted.
              </p>

              <h3 className="text-base font-bold text-terminal-text">3. Intellectual Property</h3>
              <p>
                All proprietary scoring models, mathematical confluence engines, user interfaces, real-time visualizers, and algorithms are the intellectual property of @vertexinfo.co.in. Unauthorized scraping, reverse engineering, redistribution, or commercial resale is strictly prohibited.
              </p>

              <h3 className="text-base font-bold text-terminal-text">4. Service Availability & Disclaimers</h3>
              <p>
                Fayda utilizes market feeds from authorized sources (e.g. Fyers API v3, NSE public indices). We do not warrant uninterrupted or error-free transmission during exchange system outages.
              </p>
            </div>
          )}

          {activeTab === 'PRIVACY' && (
            <div className="space-y-4 text-terminal-text">
              <div className="p-3.5 rounded-xl bg-bull/10 border border-bull/30 text-bull font-mono text-xs">
                <strong>PRIVACY-BY-DESIGN GUARANTEE:</strong> Fayda does NOT collect, store, or demand your Demat passwords, trading PINs, Aadhaar number, or bank account credentials.
              </div>

              <h3 className="text-base font-bold text-terminal-text">1. Information We Collect</h3>
              <p>
                We only collect minimal information necessary for authentication and compliance record-keeping: Full Name, Email Address, Mobile Number, and Legal Consent Audit Timestamps.
              </p>

              <h3 className="text-base font-bold text-terminal-text">2. Broker API Authorization</h3>
              <p>
                When connecting broker integrations (such as Fyers API v3), authentication is conducted directly through the broker's official OAuth2 token handshake. Your broker password is never seen, transmitted, or saved on Fayda servers.
              </p>

              <h3 className="text-base font-bold text-terminal-text">3. Data Security</h3>
              <p>
                All data transmission is encrypted via 256-bit TLS/HTTPS. We do not sell or rent user data to third-party telemarketers or unsolicited advisory call centers.
              </p>
            </div>
          )}

          {activeTab === 'COOKIES' && (
            <div className="space-y-4 text-terminal-text">
              <h3 className="text-base font-bold text-terminal-text">1. Cookie Usage</h3>
              <p>
                Fayda uses essential local storage and session cookies to remember your trader experience level (Beginner/Intermediate/Expert), theme preferences (Dark/Light), active symbol selections, and legal acknowledgement records.
              </p>

              <h3 className="text-base font-bold text-terminal-text">2. Managing Preferences</h3>
              <p>
                You may clear your browser cookies at any time; however, you will be required to re-authenticate and re-acknowledge the compliance risk disclosure upon your next visit.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-terminal-border bg-terminal-panel/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-terminal-muted">
            Document Version: <strong className="text-terminal-text">{CURRENT_LEGAL_VERSION}</strong> (Effective Aug 2026)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-accent-sky/20 border border-accent-sky/40 text-accent-sky hover:bg-accent-sky/30 font-sans font-bold text-xs transition cursor-pointer"
          >
            Close & Return
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
