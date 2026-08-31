import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, CURRENT_LEGAL_VERSION } from '../../context/AuthContext';
import { LegalDocumentModal, type LegalDocType } from './LegalDocumentModal';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  X, 
  RefreshCw, 
  Sparkles, 
  Zap,
  KeyRound,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

export type AuthScreenMode = 'CONSENT_DISCLOSURE' | 'SIGN_UP' | 'OTP_VERIFY' | 'SIGN_IN' | 'FORGOT_PASSWORD';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreen?: AuthScreenMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialScreen = 'CONSENT_DISCLOSURE'
}) => {
  const { login, register, verifyOtp, resendOtp, recordConsent } = useAuth();

  const [screen, setScreen] = useState<AuthScreenMode>(initialScreen);

  // Legal Doc Modal Viewer state
  const [isLegalDocOpen, setIsLegalDocOpen] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');

  // Granular Consent Checkboxes
  const [consentRisk, setConsentRisk] = useState<boolean>(false);
  const [consentNoGuarantee, setConsentNoGuarantee] = useState<boolean>(false);
  const [consentTerms, setConsentTerms] = useState<boolean>(false);
  const [consentPrivacy, setConsentPrivacy] = useState<boolean>(false);
  const [consentAge, setConsentAge] = useState<boolean>(false);
  const [consentMarketing, setConsentMarketing] = useState<boolean>(false);

  // Sign-Up form fields
  const [signUpName, setSignUpName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpMobile, setSignUpMobile] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState<string>('');
  const [signUpReferral, setSignUpReferral] = useState<string>('');

  // Sign-In form fields
  const [signInIdentifier, setSignInIdentifier] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback & Loading
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setScreen(initialScreen);
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialScreen, isOpen]);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, otpTimer]);

  const isAllMandatoryConsentChecked = 
    consentRisk && consentNoGuarantee && consentTerms && consentPrivacy && consentAge;

  const handleSelectAllConsent = (checked: boolean) => {
    setConsentRisk(checked);
    setConsentNoGuarantee(checked);
    setConsentTerms(checked);
    setConsentPrivacy(checked);
    setConsentAge(checked);
    setConsentMarketing(checked);
  };

  const openLegalDocument = (doc: LegalDocType) => {
    setActiveLegalDoc(doc);
    setIsLegalDocOpen(true);
  };

  const handleConsentSubmit = () => {
    if (!isAllMandatoryConsentChecked) {
      setErrorMsg('Please review and check all mandatory regulatory acknowledgements to proceed.');
      return;
    }
    setErrorMsg('');

    // Record granular audit trail in auth context
    recordConsent({
      riskDisclosure: consentRisk,
      noGuaranteedProfits: consentNoGuarantee,
      termsOfUse: consentTerms,
      privacyPolicy: consentPrivacy,
      age18Plus: consentAge,
      marketingOptIn: consentMarketing
    });

    setScreen('SIGN_UP');
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signUpName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!signUpMobile.trim() || signUpMobile.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (signUpPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const res = await register({
      fullName: signUpName.trim(),
      email: signUpEmail.trim(),
      mobile: signUpMobile.trim(),
      password: signUpPassword,
      referralCode: signUpReferral.trim() || undefined,
      consent: {
        riskDisclosure: consentRisk,
        noGuaranteedProfits: consentNoGuarantee,
        termsOfUse: consentTerms,
        privacyPolicy: consentPrivacy,
        age18Plus: consentAge,
        marketingOptIn: consentMarketing
      }
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'OTP verification code sent to your registered mobile and email.');
      setScreen('OTP_VERIFY');
      setOtpTimer(60);
      setIsTimerActive(true);
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check your details.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpVerifySubmit = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    const res = await verifyOtp(fullOtp);
    setIsLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Verification failed.');
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setIsLoading(true);
    await resendOtp();
    setIsLoading(false);
    setOtpTimer(60);
    setIsTimerActive(true);
    setSuccessMsg('A fresh 6-digit OTP has been dispatched.');
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signInIdentifier.trim()) {
      setErrorMsg('Please enter your registered email or mobile.');
      return;
    }
    if (!signInPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const res = await login(signInIdentifier, signInPassword);
    setIsLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Invalid credentials.');
    }
  };

  const handleQuickDemoLogin = async (role: 'SUPERADMIN' | 'USER') => {
    setIsLoading(true);
    if (role === 'SUPERADMIN') {
      await login('admin@vertexinfo.co.in', 'password123', 'SUPERADMIN');
    } else {
      await login('arun.trader@vertexinfo.co.in', 'password123', 'USER');
    }
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Legal Document Viewer Overlay */}
      <LegalDocumentModal
        isOpen={isLegalDocOpen}
        onClose={() => setIsLegalDocOpen(false)}
        initialDoc={activeLegalDoc}
      />

      <div className="fixed inset-0 z-[105000] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-fade-in">
        <div className="relative w-full max-w-xl max-h-[88vh] bg-terminal-card border border-terminal-border rounded-2xl shadow-elevated flex flex-col overflow-hidden my-auto animate-scale-up">
          
          {/* Pinned Top Bar with Brand & Close */}
          <div className="shrink-0 px-5 py-3.5 border-b border-terminal-border bg-terminal-panel/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <img src="/favicon-32x32.png" className="w-5 h-5 object-contain" alt="" />
              <div>
                <span className="font-sans font-bold text-sm text-terminal-text tracking-tight flex items-center gap-1.5">
                  <span>Fayda Authentication</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-sky/15 text-accent-sky font-mono font-bold">PRO</span>
                </span>
                <span className="text-[10px] text-terminal-muted block font-sans">
                  SEBI-Aligned Indian Market Decision Terminal
                </span>
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

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            
            {/* Feedback Messages */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-bear/10 border border-bear/30 text-bear text-xs font-sans flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-bull/10 border border-bull/30 text-bull text-xs font-sans flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 1: MANDATORY RISK DISCLOSURE & GRANULAR CONSENT SCREEN */}
            {/* ========================================================================= */}
            {screen === 'CONSENT_DISCLOSURE' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                    Welcome to Fayda
                  </h3>
                  <p className="text-terminal-muted text-xs">
                    Please review and acknowledge the following SEBI-aligned risk disclosures.
                  </p>
                </div>

                {/* Regulatory Notice Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-bear/10 border border-bear/30 space-y-1">
                    <div className="font-bold text-bear flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Derivatives Risk</span>
                    </div>
                    <p className="text-terminal-muted leading-tight text-[10.5px]">
                      Trading F&O involves high risk of loss. 9 out of 10 traders incur net losses.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber/10 border border-amber/30 space-y-1">
                    <div className="font-bold text-amber flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>No Guaranteed Returns</span>
                    </div>
                    <p className="text-terminal-muted leading-tight text-[10.5px]">
                      Calculations are mathematical. We do NOT guarantee profits or predictions.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-accent-sky/10 border border-accent-sky/30 space-y-1">
                    <div className="font-bold text-accent-sky flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Non-Advisory Tool</span>
                    </div>
                    <p className="text-terminal-muted leading-tight text-[10.5px]">
                      Not investment advice. All trading decisions are at your sole discretion.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-bull/10 border border-bull/30 space-y-1">
                    <div className="font-bold text-bull flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Zero Credential Storage</span>
                    </div>
                    <p className="text-terminal-muted leading-tight text-[10.5px]">
                      We never store your broker passwords. Direct OAuth 2.0 broker authorization.
                    </p>
                  </div>
                </div>

                {/* Legal Document Links Pill Bar */}
                <div className="flex flex-wrap items-center justify-center gap-2 py-0.5 text-[11px] text-accent-sky">
                  <button
                    type="button"
                    onClick={() => openLegalDocument('RISK_DISCLOSURE')}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Risk Disclosure</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-terminal-muted">•</span>
                  <button
                    type="button"
                    onClick={() => openLegalDocument('TERMS')}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Terms</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-terminal-muted">•</span>
                  <button
                    type="button"
                    onClick={() => openLegalDocument('PRIVACY')}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Privacy</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-terminal-muted">•</span>
                  <button
                    type="button"
                    onClick={() => openLegalDocument('DISCLAIMER')}
                    className="hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Disclaimer</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Mandatory Checkboxes */}
                <div className="p-3 rounded-xl bg-terminal-panel/80 border border-terminal-border space-y-2 text-[11px]">
                  <div className="flex items-center justify-between border-b border-terminal-border/60 pb-1.5">
                    <span className="text-[10px] text-terminal-muted font-bold uppercase tracking-wider">
                      Mandatory Acknowledgements (v{CURRENT_LEGAL_VERSION})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllConsent(!isAllMandatoryConsentChecked)}
                      className="text-[10px] text-accent-sky font-semibold hover:underline cursor-pointer"
                    >
                      {isAllMandatoryConsentChecked ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentRisk}
                      onChange={(e) => setConsentRisk(e.target.checked)}
                      className="mt-0.5 accent-accent-sky w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-terminal-text leading-snug">
                      I have read the <strong>Risk Disclosure</strong> and understand the high risk of F&O trading loss.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentNoGuarantee}
                      onChange={(e) => setConsentNoGuarantee(e.target.checked)}
                      className="mt-0.5 accent-accent-sky w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-terminal-text leading-snug">
                      I acknowledge that Fayda analytics do <strong>not guarantee profits</strong> or future returns.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-0.5 accent-accent-sky w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-terminal-text leading-snug">
                      I agree to the Fayda <strong>Terms of Use</strong> and intellectual property conditions.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="mt-0.5 accent-accent-sky w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-terminal-text leading-snug">
                      I have read and accept the <strong>Privacy Policy</strong> for account security.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentAge}
                      onChange={(e) => setConsentAge(e.target.checked)}
                      className="mt-0.5 accent-accent-sky w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-terminal-text leading-snug">
                      I confirm that I am at least <strong>18 years old</strong> and legally eligible to trade.
                    </span>
                  </label>
                </div>

                {/* Bottom Action Area (Separated & Non-Overlapping) */}
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setScreen('SIGN_IN');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-sans font-bold transition border bg-terminal-panel border-terminal-border text-terminal-text hover:border-accent-sky hover:bg-terminal-hover shadow-subtle cursor-pointer"
                    >
                      Already Have Account? Sign In
                    </button>

                    <button
                      type="button"
                      onClick={handleConsentSubmit}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 shadow-subtle cursor-pointer ${
                        isAllMandatoryConsentChecked
                          ? 'bg-accent-sky/20 border border-accent-sky/50 text-accent-sky hover:bg-accent-sky/30 shadow-subtle'
                          : 'bg-terminal-panel/50 border border-terminal-border text-terminal-muted cursor-not-allowed opacity-60'
                      }`}
                      disabled={!isAllMandatoryConsentChecked}
                    >
                      <span>I Understand & Register</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-terminal-muted text-center pt-1">
                    Regulatory consent timestamp and audit signature will be securely recorded.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 2: SIGN-UP FORM */}
            {/* ========================================================================= */}
            {screen === 'SIGN_UP' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3 font-sans text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                    Create Your Account
                  </h3>
                  <p className="text-terminal-muted text-xs">
                    Access institutional options analytics & AI decision models
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent-sky" />
                    <span>Full Legal Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Arun Kumar"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-accent-sky" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      placeholder="arun@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-accent-sky" />
                      <span>10-Digit Mobile</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-terminal-border bg-terminal-panel text-terminal-muted font-mono font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={signUpMobile}
                        onChange={(e) => setSignUpMobile(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-terminal-bg border border-terminal-border rounded-r-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent-sky" />
                      <span>Password (min 8 chars)</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent-sky" />
                      <span>Confirm Password</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-accent-sky/20 border border-accent-sky/50 text-accent-sky hover:bg-accent-sky/30 font-sans font-bold text-xs transition shadow-subtle flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Continue to OTP Verification</span>}
                  </button>

                  <div className="text-center text-[11px] text-terminal-muted pt-1">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setScreen('SIGN_IN')}
                      className="text-accent-sky font-bold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 3: OTP VERIFICATION */}
            {/* ========================================================================= */}
            {screen === 'OTP_VERIFY' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-accent-sky/15 text-accent-sky flex items-center justify-center border border-accent-sky/30 shadow-subtle">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                    Verify Your Mobile & Email
                  </h3>
                  <p className="text-terminal-muted text-xs">
                    Enter the 6-digit OTP dispatched to your registered contact.
                  </p>
                </div>

                {/* 6 Digit OTP Inputs */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-mono font-bold bg-terminal-bg border border-terminal-border rounded-xl text-terminal-text focus:border-accent-sky focus:outline-none transition"
                    />
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-terminal-panel border border-terminal-border flex items-center justify-between text-[11px]">
                  <span className="text-terminal-muted">
                    Code expires in: <strong className="text-terminal-text font-bold font-mono">{otpTimer}s</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpTimer > 0}
                    className={`font-bold transition ${
                      otpTimer === 0 ? 'text-accent-sky hover:underline cursor-pointer' : 'text-terminal-muted cursor-not-allowed opacity-60'
                    }`}
                  >
                    Resend OTP
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOtpVerifySubmit}
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-accent-sky/20 border border-accent-sky/50 text-accent-sky hover:bg-accent-sky/30 font-sans font-bold text-xs transition shadow-subtle flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify & Launch Terminal</span>}
                  </button>

                  <p className="text-center text-[10px] text-terminal-muted">
                    Tip: For demo evaluation, you may enter <strong className="text-accent-sky font-mono">123456</strong> or any 6 digits.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 4: SIGN-IN (WELCOME BACK) */}
            {/* ========================================================================= */}
            {screen === 'SIGN_IN' && (
              <form onSubmit={handleSignInSubmit} className="space-y-3.5 font-sans text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                    Welcome Back to Fayda
                  </h3>
                  <p className="text-terminal-muted text-xs">
                    Sign in to access live option chains, Greeks and strategy radar
                  </p>
                </div>

                {/* Email / Mobile */}
                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent-sky" />
                    <span>Email or Mobile Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="admin@vertexinfo.co.in / 9876543210"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-terminal-muted font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent-sky" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setScreen('FORGOT_PASSWORD')}
                      className="text-[11px] text-accent-sky hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                    required
                  />
                </div>

                {/* Remember Me & Visibility */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-terminal-muted select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-accent-sky w-3.5 h-3.5 rounded"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-terminal-muted hover:text-terminal-text flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-accent-sky/20 border border-accent-sky/50 text-accent-sky hover:bg-accent-sky/30 font-sans font-bold text-xs transition shadow-subtle flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In to Terminal</span>}
                </button>

                {/* Instant 1-Click Demo Login Box (SuperAdmin & Pro User) */}
                <div className="p-3 rounded-xl bg-terminal-panel/80 border border-terminal-border space-y-2">
                  <span className="text-[10px] text-terminal-muted uppercase font-bold tracking-wider block">
                    Quick Access Profiles (One-Click)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('SUPERADMIN')}
                      className="py-1.5 px-2 rounded-lg bg-accent-purple/20 border border-accent-purple/40 hover:bg-accent-purple/30 text-accent-purple font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-subtle cursor-pointer"
                      title="Sign in with SuperAdmin rights"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ SuperAdmin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('USER')}
                      className="py-1.5 px-2 rounded-lg bg-accent-sky/20 border border-accent-sky/40 hover:bg-accent-sky/30 text-accent-sky font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-subtle cursor-pointer"
                      title="Sign in as Pro Trader"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>👤 Pro Trader</span>
                    </button>
                  </div>
                </div>

                {/* Footer Link (Cleanly Spaced) */}
                <div className="text-center text-[11px] text-terminal-muted pt-1">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('CONSENT_DISCLOSURE')}
                    className="text-accent-sky font-bold hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 5: FORGOT PASSWORD */}
            {/* ========================================================================= */}
            {screen === 'FORGOT_PASSWORD' && (
              <div className="space-y-3.5 font-sans text-xs">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-terminal-text">
                    Reset Your Password
                  </h3>
                  <p className="text-terminal-muted text-xs">
                    Enter your registered email or mobile to receive recovery instructions.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-terminal-muted font-bold">Email or Mobile Number</label>
                  <input
                    type="text"
                    placeholder="name@example.com"
                    className="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-sky"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg('Password recovery instructions have been dispatched.');
                    setScreen('SIGN_IN');
                  }}
                  className="w-full py-2.5 rounded-xl bg-accent-sky/20 border border-accent-sky/50 text-accent-sky hover:bg-accent-sky/30 font-sans font-bold text-xs transition shadow-subtle cursor-pointer"
                >
                  Send Recovery Link / OTP
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setScreen('SIGN_IN')}
                    className="text-accent-sky font-bold hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
