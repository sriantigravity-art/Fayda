import React from 'react';
import { 
  Layers, 
  Activity, 
  Zap, 
  Newspaper, 
  Calculator,
  Compass
} from 'lucide-react';

export type MobileTabType = 'CHAIN' | 'SIGNALS' | 'ANALYTICS' | 'RADAR' | 'NEWS';

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
    { key: 'ANALYTICS', label: 'Analytics', icon: Activity },
    { key: 'RADAR', label: 'Radar', icon: Compass },
    { key: 'NEWS', label: 'News', icon: Newspaper }
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-terminal-card/95 backdrop-blur-md border-t border-terminal-border px-2 py-1.5 flex items-center justify-around shadow-elevated select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition cursor-pointer ${
              isActive
                ? 'text-accent-sky font-bold'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${isActive ? 'bg-accent-sky/15 text-accent-sky' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-sans mt-0.5 tracking-tight">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Quick Calculator Action */}
      <button
        type="button"
        onClick={onOpenRiskCalc}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-terminal-muted hover:text-accent-sky transition cursor-pointer"
        title="Open Risk Calculator"
      >
        <div className="p-1 rounded-lg">
          <Calculator className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-sans mt-0.5 tracking-tight">
          Risk Calc
        </span>
      </button>
    </nav>
  );
};
