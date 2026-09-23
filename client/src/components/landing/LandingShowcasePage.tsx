import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTradingPersona } from '../../context/TradingPersonaContext';
import { FaydaBrandLogo } from '../common/FaydaBrandLogo';
import { FeatureDetailModal } from './FeatureDetailModal';
import { LandingCmsEditorModal } from './LandingCmsEditorModal';
import {
  getLandingCmsData,
  saveLandingCmsData,
  compressImageFile,
  storeVideoInIndexedDB,
  getVideoFromIndexedDB,
  removeVideoFromIndexedDB,
  type LandingCmsData,
  type FeatureItem,
  type HeroSlide
} from '../../services/landingCmsService';
import {
  Zap,
  BarChart2,
  Layers,
  Globe,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sun,
  Moon,
  Lock,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  Clock,
  Send,
  HelpCircle,
  Award,
  Sliders,
  Calendar,
  DollarSign,
  ChevronDown,
  Menu,
  X,
  Radio,
  FileText,
  Crown,
  Camera,
  Trash2,
  Image as ImageIcon,
  Video,
  Volume2,
  VolumeX,
  Film
} from 'lucide-react';

interface LandingShowcasePageProps {
  onLaunchDemo: () => void;
}

export const LandingShowcasePage: React.FC<LandingShowcasePageProps> = ({
  onLaunchDemo
}) => {
  const { login, register, isAuthenticated, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsPersonaModalOpen } = useTradingPersona();

  // CMS Content State
  const [cmsData, setCmsData] = useState<LandingCmsData>(() => getLandingCmsData());
  const [isCmsEditorOpen, setIsCmsEditorOpen] = useState(false);

  // Hero Slider State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  // Feature Detail Modal State
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth Card State
  const [authTab, setAuthTab] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpMobile, setSignUpMobile] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Closed Trades Filter State
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'NIFTY' | 'BANKNIFTY' | 'SENSEX' | 'MCX'>('ALL');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCategory, setContactCategory] = useState('TECHNICAL');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // FAQs Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Unified Launch into Terminal (Sets up Buyer / Seller / Commodities persona modal)
  const handleLaunchTerminal = () => {
    try {
      sessionStorage.setItem('fayda_show_persona_on_login', 'true');
    } catch {}
    setIsPersonaModalOpen(true);
    onLaunchDemo();
  };

  // Direct Hero Right-Side Media (Picture & MP4 Video) Upload Handlers
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Dynamically resolve media URL (Blob from IndexedDB for local video, or direct URL/Base64)
  useEffect(() => {
    let isCancelled = false;
    const resolveCurrentSlideMedia = async () => {
      const cur = cmsData.heroSlides[currentSlideIndex];
      if (!cur) {
        setResolvedMediaUrl(null);
        return;
      }
      
      const isVideo = cur.mediaType === 'video' || /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(cur.customVideoUrl || cur.customImageUrl || '');
      if (isVideo) {
        const videoRef = cur.customVideoUrl || cur.customImageUrl || '';
        if (videoRef.startsWith('indexeddb://')) {
          const key = videoRef.replace('indexeddb://', '');
          const blobUrl = await getVideoFromIndexedDB(key);
          if (!isCancelled) {
            setResolvedMediaUrl(blobUrl || null);
          }
          return;
        }
        if (!isCancelled) {
          setResolvedMediaUrl(videoRef || null);
        }
        return;
      }

      // Default picture/image
      if (!isCancelled) {
        setResolvedMediaUrl(cur.customImageUrl || null);
      }
    };

    resolveCurrentSlideMedia();
    return () => {
      isCancelled = true;
    };
  }, [currentSlideIndex, cmsData]);

  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const base64 = await compressImageFile(file);
      const updatedSlides = [...cmsData.heroSlides];
      updatedSlides[currentSlideIndex] = {
        ...updatedSlides[currentSlideIndex],
        customImageUrl: base64,
        mediaType: 'image',
        useCustomImage: true
      };
      const updatedCms = { ...cmsData, heroSlides: updatedSlides };
      setCmsData(updatedCms);
      saveLandingCmsData(updatedCms);
      setResolvedMediaUrl(base64);
    } catch (err) {
      console.error('Failed to upload hero picture:', err);
    } finally {
      setIsUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const slide = cmsData.heroSlides[currentSlideIndex] || cmsData.heroSlides[0];
      const key = `hero_video_${slide.id}`;
      const objectUrl = await storeVideoInIndexedDB(key, file);
      const updatedSlides = [...cmsData.heroSlides];
      updatedSlides[currentSlideIndex] = {
        ...updatedSlides[currentSlideIndex],
        mediaType: 'video',
        customVideoUrl: `indexeddb://${key}`,
        useCustomImage: true
      };
      const updatedCms = { ...cmsData, heroSlides: updatedSlides };
      setCmsData(updatedCms);
      saveLandingCmsData(updatedCms);
      setResolvedMediaUrl(objectUrl);
    } catch (err) {
      console.error('Failed to upload hero video:', err);
    } finally {
      setIsUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemoveCustomMedia = async () => {
    const cur = cmsData.heroSlides[currentSlideIndex];
    if (cur?.id) {
      await removeVideoFromIndexedDB(`hero_video_${cur.id}`);
    }
    const updatedSlides = [...cmsData.heroSlides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      useCustomImage: false,
      customImageUrl: '',
      customVideoUrl: '',
      mediaType: 'image'
    };
    const updatedCms = { ...cmsData, heroSlides: updatedSlides };
    setCmsData(updatedCms);
    saveLandingCmsData(updatedCms);
    setResolvedMediaUrl(null);
  };

  const handleToggleCardVsPicture = () => {
    const updatedSlides = [...cmsData.heroSlides];
    const curVal = updatedSlides[currentSlideIndex]?.useCustomImage ?? false;
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      useCustomImage: !curVal
    };
    const updatedCms = { ...cmsData, heroSlides: updatedSlides };
    setCmsData(updatedCms);
    saveLandingCmsData(updatedCms);
  };

  // Listen for CMS updates
  useEffect(() => {
    const handleCmsUpdate = (e: CustomEvent<LandingCmsData>) => {
      if (e.detail) setCmsData(e.detail);
    };
    window.addEventListener('fayda-cms-updated' as any, handleCmsUpdate as any);
    return () => {
      window.removeEventListener('fayda-cms-updated' as any, handleCmsUpdate as any);
    };
  }, []);

  // Hero Slider Auto-Advance (6s interval)
  useEffect(() => {
    if (isSlidePaused || cmsData.heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % cmsData.heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isSlidePaused, cmsData.heroSlides.length]);

  const activeSlide = cmsData.heroSlides[currentSlideIndex] || cmsData.heroSlides[0];

  // Auth Handlers
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!signInEmail.trim() || !signInPassword.trim()) {
      setAuthError('Please enter your email/mobile and password.');
      return;
    }
    setIsAuthLoading(true);
    try {
      const res = await login(signInEmail.trim(), signInPassword.trim(), 'USER');
      if (res.success) {
        try {
          sessionStorage.setItem('fayda_show_persona_on_login', 'true');
        } catch {}
        setIsPersonaModalOpen(true);
      } else {
        setAuthError(res.error || 'Invalid credentials. Please verify your details.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check network connection.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpMobile.trim() || !signUpPassword.trim()) {
      setAuthError('Please complete all registration fields.');
      return;
    }
    setIsAuthLoading(true);
    try {
      const res = await register({
        fullName: signUpName.trim(),
        email: signUpEmail.trim(),
        mobile: signUpMobile.trim(),
        password: signUpPassword.trim()
      });
      if (res.success) {
        await login(signUpEmail.trim(), signUpPassword.trim(), 'USER');
        try {
          sessionStorage.setItem('fayda_show_persona_on_login', 'true');
        } catch {}
        setIsPersonaModalOpen(true);
      } else {
        setAuthError(res.error || 'Registration failed. Email may already exist.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSuperUserLogin = async () => {
    setIsAuthLoading(true);
    try {
      await login('admin@fayda.in', 'superadmin123', 'SUPERADMIN');
      try {
        sessionStorage.setItem('fayda_show_persona_on_login', 'true');
      } catch {}
      setIsPersonaModalOpen(true);
    } catch {
      setAuthError('SuperAdmin login failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Contact Form Submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
      setContactSubmitted(false);
    }, 4000);
  };

  // Smooth Scroll Helper
  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Curated Past Trades Dataset (TraderSmith Style Past Performance)
  const pastTrades = useMemo(() => [
    { id: '1', date: '18-Sep-2026', symbol: 'NIFTY', strike: '23300 CE', action: 'BUY CALL', entry: 114, exit: 168, pnlPct: 47.36, status: 'TARGET 2 HIT', outcome: 'WIN' },
    { id: '2', date: '17-Sep-2026', symbol: 'BANKNIFTY', strike: '50200 PE', action: 'BUY PUT', entry: 245, exit: 382, pnlPct: 55.91, status: 'TARGET 2 HIT', outcome: 'WIN' },
    { id: '3', date: '16-Sep-2026', symbol: 'SENSEX', strike: '76300 CE', action: 'BUY CALL', entry: 180, exit: 235, pnlPct: 30.55, status: 'TARGET 1 HIT', outcome: 'WIN' },
    { id: '4', date: '15-Sep-2026', symbol: 'NIFTY', strike: '23450 PE', action: 'BUY PUT', entry: 88, exit: 118, pnlPct: 34.09, status: 'TARGET 1 HIT', outcome: 'WIN' },
    { id: '5', date: '12-Sep-2026', symbol: 'CRUDEOIL', strike: '6100 CE', action: 'BUY CALL', entry: 142, exit: 215, pnlPct: 51.40, status: 'TARGET 2 HIT', outcome: 'WIN' },
    { id: '6', date: '11-Sep-2026', symbol: 'BANKNIFTY', strike: '50400 CE', action: 'BUY CALL', entry: 210, exit: 182, pnlPct: -13.33, status: 'TRAIL SL', outcome: 'LOSS' },
    { id: '7', date: '10-Sep-2026', symbol: 'NIFTY', strike: '23250 CE', action: 'BUY CALL', entry: 130, exit: 194, pnlPct: 49.23, status: 'TARGET 2 HIT', outcome: 'WIN' },
    { id: '8', date: '09-Sep-2026', symbol: 'GOLD', strike: '74500 CE', action: 'BUY CALL', entry: 650, exit: 920, pnlPct: 41.53, status: 'TARGET 2 HIT', outcome: 'WIN' }
  ], []);

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'ALL') return pastTrades;
    return pastTrades.filter(t => t.symbol === tradeFilter);
  }, [pastTrades, tradeFilter]);

  // FAQs dataset
  const faqs = [
    {
      q: 'How does Fayda PRO differ from regular retail trading apps or Telegram advisory?',
      a: 'Fayda PRO is a fully automated, quantitative research and analytics operating system. Instead of discretionary tips, our 10-Factor Confluence Cockpit combines live Open Interest build-up, Black-Scholes Greeks, VWAP deviation, and institutional order book depth directly into mathematical setups with exact entry ranges, stop-loss, and multi-tier targets.'
    },
    {
      q: 'Can I connect my own broker account like Fyers or Dhan?',
      a: 'Yes. Fayda PRO features certified 1-click OAuth integration with Fyers API v3 and DhanHQ Live. Once connected, quotes stream in sub-2.0s intervals, and you can route single strikes or multi-leg option strategies directly to your broker terminal.'
    },
    {
      q: 'Can I test the platform without risking any real money?',
      a: 'Absolutely. We provide a 100% realistic Real-Time Paper Trading Simulator. You can practice execution, track win-rate, test 10-factor confluence signals, and monitor portfolio P&L in real market conditions with zero capital risk.'
    },
    {
      q: 'Is this suitable for both Option Buyers and Option Sellers?',
      a: 'Yes. Our platform provides specialized filters for both trading styles. Option Buyers benefit from explosive Gamma Squeeze alerts and rapid momentum breakout setups. Option Sellers benefit from High-Density Greeks Heatmaps, Max Pain levels, and automated multi-leg credit spread payoff simulations.'
    },
    {
      q: 'What assets and exchanges are supported?',
      a: 'We support all major Indian derivative benchmarks: NSE (Nifty 50, Bank Nifty, Fin Nifty, Midcap Nifty), BSE (Sensex, Bankex), all 50 Nifty Stock Options (Reliance, TCS, HDFC Bank, etc.), and MCX Commodities (Crude Oil, Natural Gas, Gold, Silver).'
    },
    {
      q: 'What is your compliance posture and SEBI alignment?',
      a: 'Fayda PRO adheres strictly to SEBI guidelines on algorithmic derivatives analytics, single-benchmark weekly contract rules, and risk disclosure standards. The platform is designed purely for quantitative analytics, technical education, and systematic execution.'
    },
    {
      q: 'Can I use Fayda PRO on my mobile device?',
      a: 'Yes. The entire terminal is built with responsive mobile dropdown navigation, touch-pan tickers, and adaptive layouts optimized for iOS and Android smartphones and tablets.'
    },
    {
      q: 'What happens after the 7-day free trial?',
      a: 'During the 7-day free trial, you have full access to core indicators and paper trading. No credit card is required to begin. At the end of the trial, you can choose to subscribe to our Silver, Gold, or Diamond tier, or continue on our free tier.'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 select-none overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 0. TOP ANNOUNCEMENT BANNER                                               */}
      {/* ========================================================================= */}
      <div className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white text-[10px] sm:text-xs font-mono font-bold py-1.5 px-3 flex items-center justify-between text-center overflow-hidden">
        <div className="max-w-[1840px] mx-auto w-full flex items-center justify-between">
          <span className="truncate flex-1 text-center sm:text-left">
            {cmsData.announcementText}
          </span>
          <button
            type="button"
            onClick={onLaunchDemo}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono font-black transition cursor-pointer shrink-0 ml-3"
          >
            <span>Launch Live Demo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TRADERSMITH-STYLE HEADER & TOP NAVIGATION                              */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-[120] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-[1840px] mx-auto w-full flex items-center justify-between">
          
          {/* Brand Logo & Exchange Status */}
          <div className="flex items-center space-x-3 shrink-0">
            <FaydaBrandLogo
              size="md"
              showSubtitle={true}
              showProBadge={true}
              onClick={() => scrollToSection('hero-section')}
            />

            <div className="hidden lg:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>NSE • BSE • MCX LIVE FEED</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('hero-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('features-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
            >
              <span>Features & Radars</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('live-setups-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Live Setups
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('track-record-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Track Record
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('pricing-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Pricing & Plans
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('contact-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Contact Us
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('faq-section')}
              className="px-2.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              FAQs
            </button>
          </nav>

          {/* Right Action Controls: Theme + Sign In + Trial CTA */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-accent-sky" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {/* Sign In Button */}
            <button
              type="button"
              onClick={() => scrollToSection('auth-section')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-accent-sky" />
              <span>Sign In</span>
            </button>

            {/* Primary Action Button: Launch Demo / Start Free Trial */}
            <button
              type="button"
              onClick={handleLaunchTerminal}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-accent-sky via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-sky-500/20 transition cursor-pointer transform active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Launch Terminal</span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            {[
              { id: 'hero-section', label: 'Home' },
              { id: 'features-section', label: 'Features & Radars' },
              { id: 'live-setups-section', label: 'Live Setups' },
              { id: 'track-record-section', label: 'Track Record & Performance' },
              { id: 'pricing-section', label: 'Pricing & Plans' },
              { id: 'contact-section', label: 'Contact Us & Support' },
              { id: 'faq-section', label: 'Frequently Asked Questions' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => scrollToSection('auth-section')}
                className="flex-1 py-2 text-center rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={handleLaunchTerminal}
                className="flex-1 py-2 text-center rounded-xl bg-accent-sky text-slate-950 text-xs font-black"
              >
                Launch Demo
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC HERO SLIDER SECTION (TRADERSMITH STYLE)                        */}
      {/* ========================================================================= */}
      <section id="hero-section" className="relative pt-8 sm:pt-14 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1840px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: DYNAMIC SLIDER CONTENT WITH VARIED HEADINGS */}
          <div className="lg:col-span-7 flex flex-col space-y-5 text-left">
            
            {/* Eyebrow Badge & Slider Indicators */}
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-accent-sky/15 text-accent-sky border border-accent-sky/30 shadow-xs">
                {activeSlide.badge}
              </span>

              <div className="flex items-center space-x-1 pl-2">
                {cmsData.heroSlides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`transition-all duration-200 rounded-full cursor-pointer ${
                      currentSlideIndex === idx
                        ? 'w-5 h-1 bg-accent-sky shadow-xs'
                        : 'w-1.5 h-1 bg-slate-300 dark:bg-slate-700'
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Dynamic Stylized Headlines */}
            <h1 className={`text-2xl sm:text-3xl lg:text-[38px] ${activeSlide.fontStyle} text-slate-900 dark:text-white leading-[1.22] tracking-tight`}>
              <span>{activeSlide.titlePrefix} </span>
              <span className="bg-gradient-to-r from-accent-sky via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                {activeSlide.titleHighlight}
              </span>{' '}
              <span>{activeSlide.titleSuffix}</span>
            </h1>

            {/* Subheadline Description */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {activeSlide.description}
            </p>

            {/* Dual CTAs & Social Proof */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => scrollToSection('auth-section')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-sky via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition cursor-pointer flex items-center gap-2 transform active:scale-95"
              >
                <span>{activeSlide.primaryCtaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleLaunchTerminal}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 transition cursor-pointer flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-accent-sky fill-current" />
                <span>{activeSlide.secondaryCtaText}</span>
              </button>
            </div>

            {/* Slider Navigation & Pause Controls */}
            <div className="flex items-center space-x-3 pt-1 text-[11px] font-mono text-slate-500">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(prev => (prev - 1 + cmsData.heroSlides.length) % cmsData.heroSlides.length)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSlidePaused(prev => !prev)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title={isSlidePaused ? "Resume Autoplay" : "Pause Autoplay"}
                >
                  {isSlidePaused ? <Play className="w-3 h-3 text-emerald-500" /> : <Pause className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex(prev => (prev + 1) % cmsData.heroSlides.length)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <span>
                Slide {currentSlideIndex + 1} of {cmsData.heroSlides.length} • {activeSlide.tag}
              </span>
            </div>

          </div>

          {/* RIGHT SIDE: ANIMATED INTERACTIVE MOCK TERMINAL PREVIEW CARD OR CUSTOM UPLOADED PICTURE / VIDEO */}
          <div className="lg:col-span-5 relative group">
            
            {/* Direct Quick Upload Toolbar */}
            <div className="flex items-center justify-end gap-1.5 pb-2 flex-wrap">
              {(activeSlide.customImageUrl || activeSlide.customVideoUrl || resolvedMediaUrl) && (
                <button
                  type="button"
                  onClick={handleToggleCardVsPicture}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold shadow-xs flex items-center gap-1"
                  title="Toggle between Custom Media and Interactive Mockup"
                >
                  <Sparkles className="w-3 h-3 text-accent-sky" />
                  <span>
                    {activeSlide.useCustomImage
                      ? 'View Live Mockup'
                      : activeSlide.mediaType === 'video'
                        ? 'View Video'
                        : 'View Picture'}
                  </span>
                </button>
              )}

              {/* Upload Picture Button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-sky/15 hover:bg-accent-sky/25 text-accent-sky border border-accent-sky/30 font-mono text-[10px] font-bold transition cursor-pointer shadow-xs"
                title="Upload custom picture/screenshot for this slide"
              >
                <Camera className="w-3 h-3" />
                <span>
                  {isUploadingMedia
                    ? 'Uploading...'
                    : activeSlide.customImageUrl && activeSlide.mediaType !== 'video'
                      ? 'Change Picture'
                      : 'Upload Picture'}
                </span>
              </button>

              {/* Upload Video MP4 Button */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-mono text-[10px] font-bold transition cursor-pointer shadow-xs"
                title="Upload custom MP4/WebM video for this slide"
              >
                <Video className="w-3 h-3" />
                <span>
                  {isUploadingMedia
                    ? 'Uploading...'
                    : activeSlide.mediaType === 'video'
                      ? 'Change MP4'
                      : 'Upload MP4'}
                </span>
              </button>

              {(activeSlide.customImageUrl || activeSlide.customVideoUrl || resolvedMediaUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveCustomMedia}
                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition cursor-pointer"
                  title="Remove custom picture/video and revert to live mockup"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleDirectImageUpload}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={handleDirectVideoUpload}
                className="hidden"
              />
            </div>

            {/* Content: Either Custom Picture / Video OR Interactive Live Confluence Card */}
            {activeSlide.useCustomImage && resolvedMediaUrl ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative z-10 flex flex-col group/card">
                <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                  
                  {activeSlide.mediaType === 'video' || /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(resolvedMediaUrl) ? (
                    <video
                      key={resolvedMediaUrl}
                      src={resolvedMediaUrl}
                      autoPlay
                      loop
                      muted={isVideoMuted}
                      playsInline
                      controls
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <img
                      src={resolvedMediaUrl}
                      alt={activeSlide.customImageCaption || activeSlide.titlePrefix}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/card:scale-105"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                    <span className="px-2.5 py-0.5 rounded-md text-[9.5px] font-mono font-bold uppercase bg-slate-900/85 text-accent-sky border border-accent-sky/40 backdrop-blur-md shadow">
                      {activeSlide.badge}
                    </span>
                    {(activeSlide.mediaType === 'video' || /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(resolvedMediaUrl)) && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-purple-600/90 text-white shadow backdrop-blur-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        MP4 VIDEO
                      </span>
                    )}
                  </div>

                  {/* Audio Mute/Unmute toggle for video */}
                  {(activeSlide.mediaType === 'video' || /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(resolvedMediaUrl)) && (
                    <button
                      type="button"
                      onClick={() => setIsVideoMuted(prev => !prev)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white border border-slate-700 transition cursor-pointer backdrop-blur-md shadow z-20"
                      title={isVideoMuted ? 'Unmute Sound' : 'Mute Sound'}
                    >
                      {isVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  )}

                  {/* Hover toolbar to swap between picture or video */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition duration-200 z-20">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="px-2 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white border border-slate-700 text-[10px] font-mono font-bold backdrop-blur-md flex items-center gap-1 cursor-pointer shadow"
                    >
                      <Camera className="w-3 h-3 text-accent-sky" />
                      <span>Change Picture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="px-2 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white border border-slate-700 text-[10px] font-mono font-bold backdrop-blur-md flex items-center gap-1 cursor-pointer shadow"
                    >
                      <Video className="w-3 h-3 text-purple-400" />
                      <span>Change MP4</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeSlide.customImageCaption || `${activeSlide.tag} ${activeSlide.mediaType === 'video' ? 'Video Stream' : 'Snapshot'}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-accent-sky shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activeSlide.mediaType === 'video' ? 'LIVE 4K STREAM' : 'FAYDA PRO LIVE'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl relative z-10 space-y-3.5">
                
                {/* Card Header: Live Signal Preview */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-600 dark:text-slate-300">
                      LIVE CONFLUENCE SETUP #108
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    BUY CALL (CE)
                  </span>
                </div>

                {/* Asset Title & Strike */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                      NIFTY 23350 CE
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      29-Sep-2026 Near Expiry • Spot ₹23,346.40 (+0.36%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono">Confluence Score</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-500">
                      94 / 100
                    </div>
                  </div>
                </div>

                {/* Entry, Target & Stop-Loss Matrix (TraderSmith Style) */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 font-mono text-center">
                  <div>
                    <div className="text-[9.5px] text-slate-400 font-bold uppercase">Buy Range</div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">₹116 - ₹122</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-emerald-500 font-bold uppercase">Target 1 & 2</div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">₹158 / ₹195</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-rose-500 font-bold uppercase">Stop-Loss</div>
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">₹94.00</div>
                  </div>
                </div>

                {/* Real-Time Greeks & Confluence Factors */}
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <div className="text-slate-400">Delta</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">0.54</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <div className="text-slate-400">Theta</div>
                    <div className="font-bold text-rose-500">-12.4/d</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <div className="text-slate-400">IV %ile</div>
                    <div className="font-bold text-sky-400">14.2%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <div className="text-slate-400">R : R</div>
                    <div className="font-bold text-emerald-400">1 : 2.8</div>
                  </div>
                </div>

                {/* Progress countdown and CTA */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>⚡ 7-Factor Momentum Confirmation</span>
                    <span className="text-emerald-500 font-bold">Active in Market</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent-sky to-emerald-500 w-3/4 animate-pulse" />
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. LIVE MARKET QUOTE RIBBON                                               */}
      {/* ========================================================================= */}
      <div className="w-full bg-slate-100 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-2.5 px-4 overflow-x-auto no-scrollbar">
        <div className="max-w-[1840px] mx-auto flex items-center space-x-4 sm:space-x-6 min-w-max text-xs font-mono">
          <div className="flex items-center space-x-1 font-bold text-slate-500">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>EXCHANGE FEED:</span>
          </div>

          {[
            { name: 'NIFTY 50', price: '23,346.40', chg: '+84.80 (+0.36%)', pos: true },
            { name: 'BANK NIFTY', price: '50,340.20', chg: '+215.10 (+0.43%)', pos: true },
            { name: 'SENSEX', price: '76,450.10', chg: '+280.40 (+0.37%)', pos: true },
            { name: 'CRUDE OIL', price: '6,140.00', chg: '-42.00 (-0.68%)', pos: false },
            { name: 'GOLD 10G', price: '74,800.00', chg: '+310.00 (+0.42%)', pos: true },
            { name: 'USD / INR', price: '83.42', chg: '-0.04 (-0.05%)', pos: false },
            { name: 'GIFT NIFTY', price: '23,410.00', chg: '+63.60 (+0.27%)', pos: true }
          ].map((m, idx) => (
            <div key={idx} className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
              <span className="font-extrabold text-slate-950 dark:text-white">₹{m.price}</span>
              <span className={`font-bold ${m.pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {m.chg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TRACK RECORD & PAST PERFORMANCE (TRADERSMITH PAST TRADES STYLE)        */}
      {/* ========================================================================= */}
      <section id="track-record-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1840px] mx-auto w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            PROVEN QUANTITATIVE TRACK RECORD
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Transparent Performance. Real Market Fills. Zero Hype.
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Just like William O’Neil’s TraderSmith methodology, we document and time-stamp every recommendation with predefined entry rules, profit targets, and stop-loss levels.
          </p>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-500">
              {cmsData.performanceStats.winRatePct}%
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">Verified Win Ratio</div>
            <div className="text-[10px] text-slate-500 font-mono">Across {cmsData.performanceStats.totalSetupsLogged}+ Curated Trades</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-accent-sky">
              {cmsData.performanceStats.averageRiskReward}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">Average Risk : Reward</div>
            <div className="text-[10px] text-slate-500 font-mono">Strict 1:2 Minimum Mandate</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-500">
              +{cmsData.performanceStats.alphaVsNiftyPct}%
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">Alpha Outperformance</div>
            <div className="text-[10px] text-slate-500 font-mono">Benchmarked vs Nifty 50 Buy & Hold</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-500">
              {cmsData.performanceStats.feedLatencySeconds}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">Dual-Tier WS Latency</div>
            <div className="text-[10px] text-slate-500 font-mono">Real-Time Fyers & Dhan Feed</div>
          </div>
        </div>

        {/* Filterable Closed Trades Ledger Table */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>Recent Verified Trade Setups Ledger</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Logged time-stamps with exact entry, exit, and realized P&L</p>
            </div>

            {/* Asset Filter Tabs */}
            <div className="flex items-center space-x-1 font-mono text-xs">
              {(['ALL', 'NIFTY', 'BANKNIFTY', 'SENSEX', 'MCX'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTradeFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer border text-[11px] ${
                    tradeFilter === f
                      ? 'bg-accent-sky text-slate-950 border-accent-sky font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Contract Strike</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Exit Price</th>
                  <th className="py-2.5 px-3">Realized P&L</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTrades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-500 font-medium">{trade.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{trade.strike}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        trade.action.includes('CALL') ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">₹{trade.entry.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">₹{trade.exit.toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${trade.pnlPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trade.outcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. 6 CORE PILLARS FEATURE SHOWCASE                                        */}
      {/* ========================================================================= */}
      <section id="features-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1840px] mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
            SYSTEM ARCHITECTURE
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            6 Institutional Pillars Built for Indian Derivatives
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Every feature has been quantitatively engineered to eliminate emotional bias and provide retail traders with hedge-fund caliber data visibility.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cmsData.features.map(feat => (
            <div
              key={feat.id}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                    {feat.badge}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-accent-sky opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                  {feat.title}
                </h3>

                {/* 1-2 Paragraph Description */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>{feat.fullParagraph1}</p>
                </div>
              </div>

              {/* Action Button: Read Full Architecture Details */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">
                  {feat.tagline.slice(0, 30)}...
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedFeature(feat)}
                  className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-accent-sky hover:text-sky-400 transition cursor-pointer"
                >
                  <span>Explore Architecture</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. METHODOLOGY COMPARISON: RETAIL GUESSWORK VS FAYDA PRO (TRADERSMITH)    */}
      {/* ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1840px] mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            THE SYSTEMATIC EDGE
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Traditional Retail Trading vs. Fayda PRO Institutional Edge
          </h2>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-sans min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                <th className="py-2.5 px-4 w-1/4">Trading Dimension</th>
                <th className="py-2.5 px-4 w-3/8 text-rose-500">Retail Trader (Guesswork)</th>
                <th className="py-2.5 px-4 w-3/8 text-emerald-500">Fayda PRO (Institutional Edge)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {[
                { dim: 'Signal Generation', bad: 'Discretionary tips from Telegram & noisy YouTube streams', good: '10-Factor Confluence model mathematically fusing OI, Greeks & VWAP' },
                { dim: 'Option Strike Charting', bad: 'Charts only index underlying; guesses strike price movements', good: 'Dedicated pure candlestick charts on specific strikes with IV & Greek depth' },
                { dim: 'Option Greeks Visibility', bad: 'Ignores Theta decay and IV crush; gets trapped in premium erosion', good: 'Real-time Delta, Theta velocity, Gamma squeeze & IV percentile overlays' },
                { dim: 'Data Latency', bad: 'Delayed broker web feeds (10s to 30s delay on high-volatility days)', good: 'Sub-2.0s dual-tier WebSocket stream straight from Fyers v3 & DhanHQ' },
                { dim: 'Risk Management', bad: 'Emotional overtrading, uncalibrated lot sizing, no strict stop loss', good: 'Automated Position Size Calculator, 1:2 minimum R:R, and stop-loss tracker' },
                { dim: 'Execution Speed', bad: 'Manual search for strike contracts on mobile apps while prices spike', good: '1-click direct order routing to certified broker endpoints' }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">{row.dim}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{row.bad}</td>
                  <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">{row.good}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. TRANSPARENT PRICING & MEMBERSHIP PLANS                                */}
      {/* ========================================================================= */}
      <section id="pricing-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1840px] mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            TRANSPARENT SUBSCRIPTION TIERS
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Choose Your Level of Market Mastery
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Start risk-free with our 7-day free trial. Upgrade anytime for full institutional confluence, live strike charts, and certified 1-click broker execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Plan 1: Free Trial */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  EXPLORER
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">7-Day Free Trial</h3>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
                  ₹0 <span className="text-xs font-normal text-slate-500">/ 7 Days</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Real-time Paper Trading Simulator</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Basic Spot Indices Quotes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Daily Pre-Market CPR Range</li>
                <li className="flex items-center gap-2 text-slate-400 dark:text-slate-600"><X className="w-3.5 h-3.5 shrink-0" /> 10-Factor Confluence Signals</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('auth-section')}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs text-slate-900 dark:text-white transition cursor-pointer"
            >
              Start Free Trial
            </button>
          </div>

          {/* Plan 2: Silver */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400">
                  DERIVATIVES CORE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">Silver Plan</h3>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
                  ₹999 <span className="text-xs font-normal text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Live OI Surge Alerts (NSE & BSE)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> High-Density Option Chain Heatmap</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Global Macro Risk Context Ribbon</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Position Size & Risk Calculator</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('auth-section')}
              className="mt-5 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-semibold text-xs text-slate-950 transition cursor-pointer"
            >
              Get Silver
            </button>
          </div>

          {/* Plan 3: Gold (Most Popular) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-sky-500/10 via-white to-white dark:from-sky-500/15 dark:via-slate-900 dark:to-slate-900 border-2 border-accent-sky shadow-xl flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-accent-sky text-slate-950 text-[9px] font-mono font-bold uppercase shadow-sm">
              MOST POPULAR
            </div>
            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-accent-sky/20 text-accent-sky">
                  INSTITUTIONAL ALPHA
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">Gold Plan</h3>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
                  ₹2,499 <span className="text-xs font-normal text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 10-Factor Confluence Signal Cockpit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Inline Strike Candlestick Workbench</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 1-Click Fyers & Dhan Live Execution</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Instant Real-Time Voice Alerts</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('auth-section')}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-sky to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold text-xs text-white shadow-md transition cursor-pointer"
            >
              Get Gold Pro
            </button>
          </div>

          {/* Plan 4: Diamond */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  HEDGE FUND VIP
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">Diamond Plan</h3>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
                  ₹4,999 <span className="text-xs font-normal text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> All Gold Features Included</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Multi-Leg Options Payoff Simulator</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Super Admin Direct API Priority</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Weekly Live Mentorship & Strategy Review</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('auth-section')}
              className="mt-5 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white transition cursor-pointer"
            >
              Get Diamond
            </button>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 8. EMBEDDED SEAMLESS AUTHENTICATION CARD & DIRECT ACCESS                 */}
      {/* ========================================================================= */}
      <section id="auth-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-xl mx-auto w-full">
        <div className="p-5 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
          
          <div className="text-center space-y-1.5 mb-5">
            <span className="text-[9.5px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-accent-sky/15 text-accent-sky">
              SECURE ACCESS GATEWAY
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {authTab === 'SIGN_IN' ? 'Sign In to Your Terminal' : 'Create Your Trader Profile'}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Access 100% Live NSE & BSE Options Analytics
            </p>
          </div>

          {/* Auth Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4 text-xs font-mono font-semibold">
            <button
              type="button"
              onClick={() => { setAuthTab('SIGN_IN'); setAuthError(null); }}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                authTab === 'SIGN_IN'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('SIGN_UP'); setAuthError(null); }}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                authTab === 'SIGN_UP'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register (Free)
            </button>
          </div>

          {authError && (
            <div className="p-2.5 mb-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono">
              {authError}
            </div>
          )}

          {/* Sign In Form */}
          {authTab === 'SIGN_IN' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Email or Registered Mobile
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="name@domain.com or 9876543210"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Terminal Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-sky to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isAuthLoading ? 'Authenticating...' : 'Sign In to Terminal'}
              </button>

              {/* SuperUser Fast Unlock */}
              <div className="pt-1.5 text-center">
                <button
                  type="button"
                  onClick={handleSuperUserLogin}
                  className="text-[10.5px] font-mono text-accent-sky hover:underline cursor-pointer"
                >
                  ⚡ Fast Access as SuperAdmin (Demo)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-2.5">
              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Mobile Number (For Alerts)
                </label>
                <input
                  type="tel"
                  value={signUpMobile}
                  onChange={(e) => setSignUpMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                  Set Password
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-2.5 rounded-xl bg-accent-sky hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isAuthLoading ? 'Creating Profile...' : 'Create Free Trader Profile'}
              </button>
            </form>
          )}

          {/* Direct Launch Without Auth */}
          <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={handleLaunchTerminal}
              className="text-xs font-mono font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Skip login & launch terminal demo directly &rarr;
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. CONTACT US & PROFESSIONAL SUPPORT DESK                                 */}
      {/* ========================================================================= */}
      <section id="contact-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-[1840px] mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        
        <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            CONNECT WITH RESEARCH & SUPPORT
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Corporate Support & Technical Help Desk
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Have questions about Fyers API broker setup, multi-leg options algorithms, or custom subscription plans? Our institutional support desk is active through equity and MCX commodity sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left: Contact Info & Address Cards */}
          <div className="lg:col-span-5 space-y-3.5">
            
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {cmsData.contactInfo.companyName}
              </h3>
              
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-sans">
                <div className="flex items-start gap-2.5">
                  <Globe className="w-3.5 h-3.5 text-accent-sky shrink-0 mt-0.5" />
                  <span>{cmsData.contactInfo.corporateOffice}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{cmsData.contactInfo.supportEmail}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>{cmsData.contactInfo.phone}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{cmsData.contactInfo.hours}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400">
                {cmsData.contactInfo.sebiRegistrationNumber}
              </div>
            </div>

            {/* Quick WhatsApp Assistance Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  DIRECT WHATSAPP CONCIERGE
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Instant response from our derivatives desk
                </div>
              </div>
              <a
                href={`https://wa.me/${cmsData.contactInfo.whatsappSupport.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition"
              >
                Chat Now
              </a>
            </div>

          </div>

          {/* Right: Interactive Query / Problem Form */}
          <div className="lg:col-span-7">
            <div className="p-5 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
              
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Send Us a Query or Request Strategy Consultation
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Typical response time: under 15 minutes during market hours
                </p>
              </div>

              {contactSubmitted ? (
                <div className="p-5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-1.5 animate-in zoom-in-95">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    Query Submitted Successfully!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Our derivatives specialist has received your message and will reach out to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3 text-xs font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Aditya Verma"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="aditya@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                        Query Category
                      </label>
                      <select
                        value={contactCategory}
                        onChange={(e) => setContactCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky cursor-pointer"
                      >
                        <option value="TECHNICAL">Technical Query & Indicator Setup</option>
                        <option value="BROKER">Broker API Connectivity (Fyers / Dhan)</option>
                        <option value="STRATEGY">F&O Strategy & Confluence Consultation</option>
                        <option value="BILLING">Billing, Invoice & Membership Upgrade</option>
                        <option value="PROBLEM">Report an App Problem or Feedback</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-mono text-[10px] font-bold uppercase mb-1">
                      Message Details *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Please describe your query or problem in detail..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-sky leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-sky to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message to Support</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 10. FREQUENTLY ASKED QUESTIONS (FAQS) ACCORDION                           */}
      {/* ========================================================================= */}
      <section id="faq-section" className="py-12 sm:py-16 px-4 sm:px-6 max-w-3xl mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        
        <div className="text-center space-y-2 mb-8">
          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            GOT QUESTIONS?
          </span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-accent-sky' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 11. REGULATORY DISCLAIMERS & PROFESSIONAL FOOTER                          */}
      {/* ========================================================================= */}
      <footer className="w-full bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 text-slate-500 font-sans text-xs">
        <div className="max-w-[1840px] mx-auto w-full space-y-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
            <FaydaBrandLogo size="md" showSubtitle={true} showProBadge={true} />
            <div className="text-[11px] font-mono">
              Designed for serious Indian derivatives & options traders.
            </div>
          </div>

          {/* SEBI Statutory Risk Warning Box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
              ⚠️ SEBI STATUTORY WARNING ON DERIVATIVES TRADING:
            </span>
            9 out of 10 individual traders in equity Futures and Options Segment incurred net losses. On average, loss makers registered an expenditure of ₹50,000 in transaction charges. Over and above the net trading losses incurred, loss makers expended an additional 28% of net trading losses as transaction costs. Those making net trading profits incurred between 15% to 50% of such profits as transaction costs. Derivatives are complex and volatile instruments carrying high risk of substantial financial loss.
          </div>

          {/* Copyright & Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
            <div>
              &copy; {new Date().getFullYear()} {cmsData.contactInfo.companyName}. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Risk Disclosure</span>
              <span>SEBI Registration</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 12. FLOATING SUPER ADMIN CMS EDIT BUTTON                                  */}
      {/* ========================================================================= */}
      <div className="fixed bottom-4 right-4 z-[150]">
        <button
          type="button"
          onClick={() => setIsCmsEditorOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-mono font-bold shadow-2xl border border-slate-700 dark:border-slate-300 hover:scale-105 transition cursor-pointer backdrop-blur-md"
          title="Super Admin Landing CMS Editor"
        >
          <Sliders className="w-3.5 h-3.5 text-accent-sky" />
          <span>Edit Page (Admin)</span>
        </button>
      </div>

      {/* Feature Detail Modal */}
      <FeatureDetailModal
        feature={selectedFeature}
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onLaunchDemo={onLaunchDemo}
        onOpenSignUp={() => scrollToSection('auth-section')}
      />

      {/* Super Admin CMS Editor Modal */}
      <LandingCmsEditorModal
        isOpen={isCmsEditorOpen}
        onClose={() => setIsCmsEditorOpen(false)}
        onSaved={() => setCmsData(getLandingCmsData())}
      />

    </div>
  );
};
