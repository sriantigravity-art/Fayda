import React, { useState } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  FileText,
  Phone,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  getLandingCmsData,
  saveLandingCmsData,
  resetLandingCmsData,
  type LandingCmsData,
  type HeroSlide
} from '../../services/landingCmsService';

interface LandingCmsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const LandingCmsEditorModal: React.FC<LandingCmsEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [data, setData] = useState<LandingCmsData>(() => getLandingCmsData());
  const [activeTab, setActiveTab] = useState<'HERO' | 'STATS' | 'CONTACT' | 'ANNOUNCEMENT'>('HERO');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSlideChange = (field: keyof HeroSlide, value: string) => {
    const updatedSlides = [...data.heroSlides];
    updatedSlides[activeSlideIndex] = {
      ...updatedSlides[activeSlideIndex],
      [field]: value
    };
    setData(prev => ({ ...prev, heroSlides: updatedSlides }));
  };

  const handleStatChange = (field: keyof typeof data.performanceStats, value: any) => {
    setData(prev => ({
      ...prev,
      performanceStats: {
        ...prev.performanceStats,
        [field]: value
      }
    }));
  };

  const handleContactChange = (field: keyof typeof data.contactInfo, value: string) => {
    setData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    saveLandingCmsData(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved();
  };

  const handleReset = () => {
    if (window.confirm('Reset all landing page content to institutional defaults?')) {
      const reset = resetLandingCmsData();
      setData(reset);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const currentSlide = data.heroSlides[activeSlideIndex] || data.heroSlides[0];

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-accent-sky/20 text-accent-sky">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Super Admin Landing Page CMS
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  LIVE EDIT
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Customize hero slider, headlines, fonts, stats, and contact details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 text-xs font-mono font-bold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('HERO')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'HERO'
                ? 'border-accent-sky text-accent-sky bg-accent-sky/10'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hero Slider ({data.heroSlides.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STATS')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'STATS'
                ? 'border-accent-sky text-accent-sky bg-accent-sky/10'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Track Record Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTACT')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'CONTACT'
                ? 'border-accent-sky text-accent-sky bg-accent-sky/10'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Contact & Support</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANNOUNCEMENT')}
            className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ANNOUNCEMENT'
                ? 'border-accent-sky text-accent-sky bg-accent-sky/10'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Announcement Ticker</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar text-xs font-sans">
          
          {/* TAB 1: HERO SLIDER EDITOR */}
          {activeTab === 'HERO' && (
            <div className="space-y-4">
              {/* Slide Selector Buttons */}
              <div className="flex items-center space-x-2">
                {data.heroSlides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                      activeSlideIndex === idx
                        ? 'bg-accent-sky text-slate-950 border-accent-sky shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Slide {idx + 1}: {s.tag}
                  </button>
                ))}
              </div>

              {/* Slide Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Eyebrow Badge Text
                  </label>
                  <input
                    type="text"
                    value={currentSlide.badge}
                    onChange={(e) => handleSlideChange('badge', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none focus:border-accent-sky"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Font Style / Heading Weight
                  </label>
                  <select
                    value={currentSlide.fontStyle}
                    onChange={(e) => handleSlideChange('fontStyle', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs focus:outline-none focus:border-accent-sky cursor-pointer"
                  >
                    <option value="tracking-tight font-extrabold">Extrabold Tight (Default)</option>
                    <option value="tracking-tight font-black">Black Heavy Punch</option>
                    <option value="font-mono font-extrabold">Cybernetic Monospace</option>
                    <option value="tracking-normal font-bold">Clean Modern Sans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Title Prefix
                  </label>
                  <input
                    type="text"
                    value={currentSlide.titlePrefix}
                    onChange={(e) => handleSlideChange('titlePrefix', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Title Highlighted Word(s)
                  </label>
                  <input
                    type="text"
                    value={currentSlide.titleHighlight}
                    onChange={(e) => handleSlideChange('titleHighlight', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-accent-sky font-bold focus:outline-none focus:border-accent-sky"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Title Suffix
                  </label>
                  <input
                    type="text"
                    value={currentSlide.titleSuffix}
                    onChange={(e) => handleSlideChange('titleSuffix', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Subheadline Description
                  </label>
                  <textarea
                    rows={3}
                    value={currentSlide.description}
                    onChange={(e) => handleSlideChange('description', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Primary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={currentSlide.primaryCtaText}
                    onChange={(e) => handleSlideChange('primaryCtaText', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                    Secondary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={currentSlide.secondaryCtaText}
                    onChange={(e) => handleSlideChange('secondaryCtaText', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRACK RECORD STATS */}
          {activeTab === 'STATS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Verified Win Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={data.performanceStats.winRatePct}
                  onChange={(e) => handleStatChange('winRatePct', parseFloat(e.target.value) || 75)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Average Risk-to-Reward Ratio
                </label>
                <input
                  type="text"
                  value={data.performanceStats.averageRiskReward}
                  onChange={(e) => handleStatChange('averageRiskReward', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Alpha Outperformance vs Nifty (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={data.performanceStats.alphaVsNiftyPct}
                  onChange={(e) => handleStatChange('alphaVsNiftyPct', parseFloat(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Dual-Tier WebSocket Feed Latency
                </label>
                <input
                  type="text"
                  value={data.performanceStats.feedLatencySeconds}
                  onChange={(e) => handleStatChange('feedLatencySeconds', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Total Active Session Setups Logged
                </label>
                <input
                  type="number"
                  value={data.performanceStats.totalSetupsLogged}
                  onChange={(e) => handleStatChange('totalSetupsLogged', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-accent-sky"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT & SUPPORT */}
          {activeTab === 'CONTACT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={data.contactInfo.companyName}
                  onChange={(e) => handleContactChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  SEBI Registration Number
                </label>
                <input
                  type="text"
                  value={data.contactInfo.sebiRegistrationNumber}
                  onChange={(e) => handleContactChange('sebiRegistrationNumber', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Corporate Office Address
                </label>
                <textarea
                  rows={2}
                  value={data.contactInfo.corporateOffice}
                  onChange={(e) => handleContactChange('corporateOffice', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={data.contactInfo.supportEmail}
                  onChange={(e) => handleContactChange('supportEmail', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Research Desk Email
                </label>
                <input
                  type="email"
                  value={data.contactInfo.researchEmail}
                  onChange={(e) => handleContactChange('researchEmail', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Telephone Support
                </label>
                <input
                  type="text"
                  value={data.contactInfo.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  WhatsApp Support
                </label>
                <input
                  type="text"
                  value={data.contactInfo.whatsappSupport}
                  onChange={(e) => handleContactChange('whatsappSupport', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={data.contactInfo.hours}
                  onChange={(e) => handleContactChange('hours', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-accent-sky"
                />
              </div>
            </div>
          )}

          {/* TAB 4: ANNOUNCEMENT TICKER */}
          {activeTab === 'ANNOUNCEMENT' && (
            <div>
              <label className="block text-slate-500 font-mono text-[11px] font-bold uppercase mb-1">
                Top Announcement Ribbon Text
              </label>
              <textarea
                rows={3}
                value={data.announcementText}
                onChange={(e) => setData(prev => ({ ...prev, announcementText: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono focus:outline-none focus:border-accent-sky leading-relaxed"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-3">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved & Live!</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-sky hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Publish Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
