import React, { useEffect } from 'react';
import {
  X,
  Zap,
  BarChart2,
  Layers,
  Globe,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Cpu,
  Lock
} from 'lucide-react';
import type { FeatureItem } from '../../services/landingCmsService';

interface FeatureDetailModalProps {
  feature: FeatureItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemo?: () => void;
  onOpenSignUp?: () => void;
}

export const FeatureDetailModal: React.FC<FeatureDetailModalProps> = ({
  feature,
  isOpen,
  onClose,
  onLaunchDemo,
  onOpenSignUp
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !feature) return null;

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Zap': return <Zap className="w-6 h-6 text-emerald-400" />;
      case 'BarChart2': return <BarChart2 className="w-6 h-6 text-sky-400" />;
      case 'Layers': return <Layers className="w-6 h-6 text-amber-400" />;
      case 'Globe': return <Globe className="w-6 h-6 text-purple-400" />;
      case 'Activity': return <Activity className="w-6 h-6 text-rose-400" />;
      default: return <ShieldCheck className="w-6 h-6 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shrink-0">
              {renderIcon(feature.iconName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                  {feature.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">FAYDA PRO ARCHITECTURE</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                {feature.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm leading-relaxed no-scrollbar">
          
          {/* Subtitle / Tagline */}
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 font-medium">
            💡 {feature.tagline}
          </div>

          {/* Paragraph 1 */}
          <div>
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Core Technical Methodology
            </h4>
            <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              {feature.fullParagraph1}
            </p>
          </div>

          {/* Paragraph 2 */}
          <div>
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Operational Precision & Execution
            </h4>
            <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              {feature.fullParagraph2}
            </p>
          </div>

          {/* Formula or Architecture Card */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold mb-1">
              <Cpu className="w-3.5 h-3.5 text-accent-sky" />
              <span>QUANTITATIVE FORMULATION</span>
            </div>
            <code className="text-accent-sky font-semibold break-all text-[11px] sm:text-xs">
              {feature.formulaOrArchitecture}
            </code>
          </div>

          {/* Buyer vs Seller Dual Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono uppercase mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>For Option Buyers</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {feature.optionBuyerBenefit}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-600 dark:text-indigo-400 font-mono uppercase mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>For Option Sellers</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {feature.optionSellerBenefit}
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            {onLaunchDemo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLaunchDemo();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold transition cursor-pointer"
              >
                Launch Demo
              </button>
            )}

            {onOpenSignUp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSignUp();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-sky to-blue-600 text-white font-bold text-xs shadow-md hover:shadow-sky-500/25 transition cursor-pointer"
              >
                <span>Try In Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
