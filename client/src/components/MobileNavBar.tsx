import React from 'react';
import { 
  Layers, 
  Activity, 
  Zap, 
  Newspaper, 
  Calculator,
  Compass,
  BarChart2
} from 'lucide-react';

export type MobileTabType = 'CHAIN' | 'SIGNALS' | 'JOURNAL' | 'RADAR' | 'ANALYTICS' | 'NEWS';

interface MobileNavBarProps {
  activeTab: MobileTabType;
  onTabChange: (tab: MobileTabType) => void;
  onOpenRiskCalc: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenRiskCalc
}) => {
  const tabs: { key: MobileTabType; label: string; icon: any }[] = [
    { key: 'CHAIN', label: 'Chain', icon: Layers },
    { key: 'SIGNALS', label: 'Signals', icon: Zap },
    { key: 'JOURNAL', label: 'Journal', icon: BarChart2 },
    { key: 'RADAR', label: 'Radar', icon: Compass },
    { key: 'ANALYTICS', label: 'Analytics', icon: Activity },
    { key: 'NEWS', label: 'News', icon: Newspaper }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-terminal-card/98 backdrop-blur-lg border-t border-terminal-border px-2 py-1 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none h-14"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            id={`mobile-tab-${tab.key.toLowerCase()}`}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition cursor-pointer ${
              isActive
                ? 'text-accent-sky font-bold'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${isActive ? 'bg-accent-sky/15 text-accent-sky' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Quick Calculator Action */}
      <button
        id="mobile-tab-risk"
        type="button"
        onClick={onOpenRiskCalc}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl text-terminal-muted hover:text-accent-sky transition cursor-pointer"
        title="Open SEBI Position Sizing & Risk Calculator"
      >
        <div className="p-1 rounded-lg">
          <Calculator className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">
          Risk Calc
        </span>
      </button>
    </nav>
  );
};
