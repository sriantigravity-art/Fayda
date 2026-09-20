import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Zap,
  BarChart3,
  Coins,
  BookOpen,
  Calculator,
  ChevronDown,
  ExternalLink,
  Crown,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ProductsDropdownProps {
  onSelectProduct: (productId: string) => void;
  onOpenPricing: () => void;
}

export const ProductsDropdown: React.FC<ProductsDropdownProps> = ({
  onSelectProduct,
  onOpenPricing
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const products = [
    {
      id: 'terminal',
      title: 'Fayda Pro Terminal',
      description: 'Real-time multi-strike options matrix, Greeks & PCR heatmaps',
      badge: 'FLAGSHIP',
      badgeColor: 'bg-accent-sky/15 text-accent-sky border-accent-sky/30',
      icon: <Layers className="w-4 h-4 text-sky-500" />
    },
    {
      id: 'quantum',
      title: 'Quantum Trade Signals',
      description: '10-factor automated confluence entries, targets & dynamic stop-loss',
      badge: 'ALGO',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: <Zap className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'orderflow',
      title: 'Order Flow Candlestick Suite',
      description: 'Tick-by-tick delta volume, buyer/seller absorption & depth',
      badge: 'ALPHA',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: <BarChart3 className="w-4 h-4 text-emerald-500" />
    },
    {
      id: 'commodities',
      title: 'MCX Commodities Suite',
      description: 'Gold, Silver, Crude Oil and Natural Gas derivatives radar',
      badge: 'MCX',
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: <Coins className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'journal',
      title: 'Post-Market Trade Journal',
      description: 'Behavioral discipline tracking, win-loss audits and P&L metrics',
      badge: 'AUDIT',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: <BookOpen className="w-4 h-4 text-blue-500" />
    },
    {
      id: 'risk',
      title: 'Capital & Position Sizer',
      description: 'Strict capital exposure limits and lot sizing calculator',
      badge: 'RISK',
      badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
      icon: <Calculator className="w-4 h-4 text-orange-500" />
    }
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <span>Products</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-sky' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#111624] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[130] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 select-none"
          role="menu"
        >
          <div className="px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Fayda Pro Product Suite
          </div>

          <div className="space-y-1 py-1">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setIsOpen(false);
                  onSelectProduct(p.id);
                }}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-accent-sky transition-colors">
                      {p.title}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                    {p.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 px-2 pb-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPricing();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-700 dark:text-accent-gold text-xs font-bold hover:brightness-110 transition cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Compare All Pricing & Features</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
