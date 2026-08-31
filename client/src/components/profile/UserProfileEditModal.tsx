import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, type UserProfile } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  ShieldCheck, 
  Sparkles,
  UploadCloud
} from 'lucide-react';

interface UserProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileEditModal: React.FC<UserProfileEditModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [street, setStreet] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [experience, setExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>('INTERMEDIATE');

  const [photoError, setPhotoError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form with existing user data
  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setAvatarUrl(user.avatarUrl);
      setStreet(user.address?.street || '');
      setCity(user.address?.city || '');
      setState(user.address?.state || '');
      setPincode(user.address?.pincode || '');
      setExperience(user.traderExperience || 'INTERMEDIATE');
      setPhotoError('');
      setFormError('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Photo Upload Handler with strict 250KB limit & format check
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    setSuccessMsg('');

    if (!file) return;

    // Strict 250 KB limit check (250 * 1024 bytes = 256,000 bytes)
    const MAX_BYTES = 250 * 1024;
    if (file.size > MAX_BYTES) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setPhotoError(`Photo size is ${sizeKb} KB, which exceeds the strict 250 KB limit. Please choose a photo under 250 KB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Supported formats check: JPG, JPEG, PNG
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid format. Only JPG, JPEG, and PNG images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Read and convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        setPhotoError('');
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    // Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter a valid Full Name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid Email address.');
      return;
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit Mobile Number.');
      return;
    }

    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      setFormError('Pincode must be a 6-digit number.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        avatarUrl,
        traderExperience: experience,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim()
        }
      });

      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFormError(res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-card border border-terminal-border rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col font-sans select-none ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-terminal-border bg-terminal-panel/80 sticky top-0 z-10 backdrop-blur-lg">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-accent-sky/20 text-accent-sky border border-accent-sky/40">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-sm sm:text-base text-terminal-text uppercase tracking-wider">
                Edit Trader Profile
              </h3>
              <span className="text-[11px] text-terminal-muted block">
                Manage personal contact, residential address & avatar photo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          
          {/* Feedback Messages */}
          {formError && (
            <div className="p-3 rounded-2xl bg-bear/10 border border-bear/40 text-bear text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-bull/10 border border-bull/40 text-bull text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. PHOTO UPLOAD SECTION (Max 250 KB, JPG/PNG) */}
          <div className="p-4 rounded-2xl bg-terminal-panel border border-terminal-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-terminal-text flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-accent-cyan" />
                <span>Profile Photo (Avatar)</span>
              </span>
              <span className="text-[10px] font-mono text-terminal-muted px-2 py-0.5 rounded bg-terminal-card border border-terminal-border">
                JPG / PNG • Max 250 KB
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Preview */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full border-2 border-accent-sky/50 bg-terminal-card overflow-hidden flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-accent-sky/15 text-accent-sky font-black text-2xl flex items-center justify-center">
                      {(fullName.charAt(0) || user?.fullName?.charAt(0) || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 flex flex-col space-y-2 w-full text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-accent-sky/20 hover:bg-accent-sky/30 border border-accent-sky/40 text-accent-sky text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 rounded-xl bg-bear/10 hover:bg-bear/20 border border-bear/30 text-bear text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-terminal-muted leading-tight">
                  Allowed file types: <strong>.jpg, .jpeg, .png</strong>. Strictly up to <strong>250 KB</strong> in size.
                </p>

                {photoError && (
                  <p className="text-[11px] text-bear font-semibold flex items-center gap-1 justify-center sm:justify-start">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{photoError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. BASIC USER IDENTITY FIELDS */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-terminal-muted tracking-wider block">
              Personal Information
            </span>

            {/* Full Name */}
            <div>
              <label className="text-[11px] font-bold text-terminal-text block mb-1">
                Full Legal Name <span className="text-bear">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                />
              </div>
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">
                  Email Address <span className="text-bear">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                  />
                </div>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">
                  Mobile Number <span className="text-bear">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-terminal-panel border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. RESIDENTIAL / CORRESPONDENCE ADDRESS */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-terminal-muted tracking-wider block flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Residential / Correspondence Address</span>
            </span>

            {/* Street Address */}
            <div>
              <label className="text-[11px] font-bold text-terminal-text block mb-1">
                Street Address / Flat / Building
              </label>
              <input
                type="text"
                placeholder="e.g. 402, Dalal Street Commercial Tower"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
              />
            </div>

            {/* City, State & Pincode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-terminal-text block mb-1">Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 400001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-xl px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-sky font-sans"
                />
              </div>
            </div>
          </div>

          {/* 4. TRADER EXPERIENCE MODE PREFERENCE */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase text-terminal-muted tracking-wider block">
              Default Experience Preference
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              {(['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setExperience(lvl)}
                  className={`py-2 px-2 rounded-xl border transition cursor-pointer text-center ${
                    experience === lvl
                      ? lvl === 'BEGINNER'
                        ? 'bg-bull/20 text-bull border-bull/50 font-bold shadow-sm'
                        : lvl === 'INTERMEDIATE'
                        ? 'bg-amber/20 text-amber border-amber/50 font-bold shadow-sm'
                        : 'bg-accent-purple/20 text-accent-purple border-accent-purple/50 font-bold shadow-sm'
                      : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text border-terminal-border'
                  }`}
                >
                  {lvl === 'BEGINNER' ? '🟢 Beginner' : lvl === 'INTERMEDIATE' ? '🟡 Interm.' : '🟣 Expert'}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button Bar */}
          <div className="pt-3 border-t border-terminal-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-accent-sky hover:bg-accent-sky-glow text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
