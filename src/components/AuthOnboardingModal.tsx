import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  KeyRound,
  Loader2,
  LocateFixed,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { AuthChannel, UserProfile, WardRecord } from '../types/civic';
import {
  authClient,
  loadGoogleIdentity,
  renderGoogleButton,
  type AuthConfig,
  type SessionProfile,
} from '../utils/authClient';
import { resolveWardByCoordinates, resolveWardByQuery } from '../utils/wardResolver';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  activeWard: WardRecord;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSelectWard: (wardId: string, bindAsHome: boolean) => void;
  onAuthSuccess: (profile: SessionProfile) => void;
  onSignOut: () => void;
}

const QUICK_METRO_CHIPS = [
  { wardId: 'CoJ-115', label: 'Fourways · W115' },
  { wardId: 'CoJ-103', label: 'Sandton · W103' },
  { wardId: 'CoCT-54', label: 'Sea Point · W54' },
  { wardId: 'CoT-82', label: 'Lynnwood · W82' },
  { wardId: 'eThekwini-35', label: 'Umhlanga · W35' },
];

const fieldClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 dark:focus:ring-emerald-400/25 dark:focus:border-emerald-400 transition-[border-color,box-shadow,background-color] duration-150';

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  onClose,
  user,
  activeWard,
  onUpdateProfile,
  onSelectWard,
  onAuthSuccess,
  onSignOut,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<AuthChannel>(user.authChannel);
  const [nameInput, setNameInput] = useState(user.name);
  const [emailInput, setEmailInput] = useState(user.emailOrHandle);
  const [mobileInput, setMobileInput] = useState(user.mobileZa);

  // Real session state
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const [addressQuery, setAddressQuery] = useState('');
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [bindAsHome, setBindAsHome] = useState(!user.awayFromHome);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(user.signedIn ? 3 : 1);
      setOtpSent(false);
      setOtpCode('');
      setDevCode(null);
      setAuthError(null);
      setAuthNotice(null);
      setDetectStatus(null);
      authClient.config().then(setAuthConfig).catch(() => setAuthConfig(null));
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || step !== 2 || channel !== 'google' || !authConfig?.googleClientId) return;
    if (!googleBtnRef.current || googleBtnRef.current.childElementCount > 0) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return;
        googleBtnRef.current.innerHTML = '';
        renderGoogleButton(googleBtnRef.current, authConfig.googleClientId!, async (idToken) => {
          setAuthBusy(true);
          setAuthError(null);
          try {
            const { profile } = await authClient.google(idToken);
            onAuthSuccess(profile);
            setAuthNotice(`Signed in as ${profile.name} via Google.`);
            advanceSoon(3, 260);
          } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
          } finally {
            setAuthBusy(false);
          }
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setAuthError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, channel, authConfig?.googleClientId]);

  if (!isOpen) return null;

  const advanceSoon = (targetStep: 1 | 2 | 3, ms = 240) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStep(targetStep), ms);
  };

  const handleRequestOtp = async () => {
    setAuthBusy(true);
    setAuthError(null);
    setDevCode(null);
    try {
      const res = await authClient.requestOtp(mobileInput, nameInput);
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode);
      setAuthNotice(
        res.devCode
          ? `Dev code: ${res.devCode}`
          : `WhatsApp code sent to ${mobileInput}. Valid 10 minutes.`
      );
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not send code.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      setAuthError('Enter the 6-digit WhatsApp verification code.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { profile } = await authClient.verifyOtp(mobileInput, otpCode.trim(), nameInput);
      onAuthSuccess(profile);
      setAuthNotice(`Verified ${profile.mobileZa} via WhatsApp OTP.`);
      advanceSoon(3, 260);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDemoSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { profile } = await authClient.demo(
        nameInput.trim() || 'Demo Resident',
        mobileInput.trim(),
        emailInput.trim() || 'demo@civicrewards.local',
        channel
      );
      onAuthSuccess(profile);
      setAuthNotice('Demo session active.');
      advanceSoon(3, 260);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.logout();
    } catch {
      // ignore — local state still clears
    }
    onSignOut();
    setOtpSent(false);
    setOtpCode('');
    setAuthNotice('Signed out.');
  };

  const handleLiveGps = () => {
    setIsLocating(true);
    setDetectStatus('Acquiring GPS coordinates...');

    const applyCoords = (lat: number, lng: number, source: string) => {
      const { ward, distanceMeters } = resolveWardByCoordinates(lat, lng);
      onSelectWard(ward.id, bindAsHome);
      setDetectStatus(
        `${source}: ${ward.municipalityCode} Ward ${ward.wardNumber} (${ward.suburbs[0]}) · ${(distanceMeters / 1000).toFixed(1)} km`
      );
      setIsLocating(false);
      advanceSoon(2, 360);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude, 'Live GPS'),
        () => applyCoords(-26.0172, 28.0058, 'Metro GPS'),
        { timeout: 3500 }
      );
    } else {
      applyCoords(-26.0172, 28.0058, 'Metro GPS');
    }
  };

  const handleAddressLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = resolveWardByQuery(addressQuery);
    if (!matched) {
      setDetectStatus('Try "Fourways", "Cedar Road", "Sea Point", or "Lynnwood".');
      return;
    }
    onSelectWard(matched.id, bindAsHome);
    setDetectStatus(`${matched.municipalityCode} Ward ${matched.wardNumber} · ${matched.suburbs[0]}`);
    advanceSoon(2, 320);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm ui-backdrop-enter p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-xl h-[88dvh] sm:h-[600px] max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden ui-modal-enter overscroll-contain">
        {/* Pinned Header + 3-Step Track */}
        <div className="shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-slate-200/80 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider tabular-nums">
                Step {step} of 3 · Ward & Account
              </div>
              <h2 id="auth-modal-title" className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {step === 1 && 'Select your municipal ward'}
                {step === 2 && 'Verify & sign in'}
                {step === 3 && 'Ward & profile summary'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile wizard"
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 cursor-pointer transition-colors duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1 as const, label: 'Ward GPS' },
              { num: 2 as const, label: 'Sign In' },
              { num: 3 as const, label: 'Summary' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className="text-left space-y-1 cursor-pointer"
              >
                <div
                  className={`h-1.5 w-full rounded-full transition-colors duration-200 ${
                    s.num <= step
                      ? 'bg-emerald-600 dark:bg-emerald-400'
                      : 'bg-slate-200 dark:bg-white/10'
                  }`}
                />
                <div
                  className={`text-[11px] font-medium ${
                    s.num === step ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}
                >
                  {s.num}. {s.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-3 overflow-y-auto overscroll-contain">
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBindAsHome(true);
                    onUpdateProfile({ awayFromHome: false });
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    bindAsHome
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Bind Home Ward
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBindAsHome(false);
                    onUpdateProfile({ awayFromHome: true });
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                    !bindAsHome
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Away from Home GPS
                </button>
              </div>

              <button
                type="button"
                onClick={handleLiveGps}
                disabled={isLocating}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 shrink-0"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
                <span>{isLocating ? 'Detecting GPS...' : 'Auto-Detect Ward via GPS'}</span>
              </button>

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Quick Metro Presets
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_METRO_CHIPS.map((chip) => {
                    const active = activeWard.id === chip.wardId;
                    return (
                      <button
                        key={chip.wardId}
                        type="button"
                        onClick={() => {
                          onSelectWard(chip.wardId, bindAsHome);
                          advanceSoon(2, 180);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200/80 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 hover:border-emerald-600/60'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAddressLookup} className="flex gap-2">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Type street or suburb (e.g. Cedar Road, Sea Point)"
                  className={fieldClass}
                />
                <button
                  type="submit"
                  className="h-11 px-4 rounded-xl border border-slate-200/90 dark:border-white/12 hover:border-slate-300 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer active:scale-[0.98] transition-transform duration-150 shrink-0"
                >
                  Resolve
                </button>
              </form>

              <div className="space-y-2">
                {detectStatus && (
                  <div className="p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/25 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{detectStatus}</span>
                  </div>
                )}

                <select
                  aria-label="Select SA Metro Ward"
                  value={activeWard.id}
                  onChange={(e) => {
                    onSelectWard(e.target.value, bindAsHome);
                    advanceSoon(2, 200);
                  }}
                  className={fieldClass}
                >
                  {SEED_WARDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.municipalityCode} Ward {w.wardNumber} — {w.suburbs.slice(0, 2).join(', ')} ({w.councillor.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between gap-3 min-h-0 overflow-y-auto">
              {user.signedIn ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-600/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Signed in as {user.name}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {user.authChannel.toUpperCase()} · {user.mobileZa || user.emailOrHandle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-200/90 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'google', label: 'Google', icon: ShieldCheck },
                        { id: 'telegram', label: 'Telegram', icon: Send },
                        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                        { id: 'email_za', label: 'Email +27', icon: Mail },
                      ] as const
                    ).map((item) => {
                      const CIcon = item.icon;
                      const active = channel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setChannel(item.id);
                            if (item.id === 'whatsapp') setOtpSent(false);
                          }}
                          className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                            active
                              ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-emerald-300'
                              : 'border-slate-200/80 dark:border-white/12 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <CIcon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {channel === 'google' && (
                    <div className="space-y-3 flex-1 flex flex-col justify-center items-center text-center">
                      {authConfig?.googleClientId ? (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                            Sign in with Google for a 30-day verified session.
                          </p>
                          <div ref={googleBtnRef} className="min-h-[44px] flex justify-center" />
                          {authBusy && (
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="p-3.5 rounded-xl border border-amber-400/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 max-w-sm space-y-1">
                          <div className="font-bold">Google OAuth unconfigured</div>
                          <p>Use WhatsApp OTP or Demo session below.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {channel === 'whatsapp' && (
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Resident Name
                          </label>
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            SA Mobile (+27)
                          </label>
                          <input
                            type="tel"
                            value={mobileInput}
                            onChange={(e) => setMobileInput(e.target.value)}
                            placeholder="+27 82 123 4567"
                            className={`${fieldClass} font-mono tabular-nums`}
                          />
                        </div>
                      </div>

                      {otpSent && (
                        <div>
                          <label className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                            6-Digit Code
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="482910"
                            className={`${fieldClass} font-mono tracking-widest border-emerald-600`}
                          />
                          {devCode && (
                            <p className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 tabular-nums">
                              <KeyRound className="w-3 h-3" /> Dev code: {devCode}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={otpSent ? handleVerifyOtp : handleRequestOtp}
                        className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-50 text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2"
                      >
                        {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{otpSent ? 'Verify Code & Continue' : 'Send WhatsApp Code'}</span>
                      </button>
                      {otpSent && (
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handleRequestOtp}
                          className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                  )}

                  {(channel === 'telegram' || channel === 'email_za') && (
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Resident Name
                          </label>
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            {channel === 'telegram' ? 'Telegram Handle' : 'Email Address'}
                          </label>
                          <input
                            type="text"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                          SA Mobile (+27, optional)
                        </label>
                        <input
                          type="tel"
                          value={mobileInput}
                          onChange={(e) => setMobileInput(e.target.value)}
                          className={`${fieldClass} font-mono tabular-nums`}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={authBusy || authConfig?.demoLoginEnabled === false}
                        onClick={handleDemoSignIn}
                        className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-50 text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2"
                      >
                        {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Continue with Demo Session</span>
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 shrink-0">
                      {authError}
                    </div>
                  )}
                  {authNotice && !authError && (
                    <div className="p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/25 text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                      {authNotice}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
              <div className="space-y-2.5 flex-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] hover:border-emerald-600/60 text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400 uppercase">
                        {user.awayFromHome ? 'Away GPS Ward' : 'Home Ward'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {activeWard.municipalityCode} Ward {activeWard.wardNumber} · {activeWard.suburbs.join(', ')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Councillor: {activeWard.councillor.name} ({activeWard.councillor.party})
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] hover:border-emerald-600/60 text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400 uppercase">
                        {user.authChannel} · {user.signedIn ? 'Active' : 'Guest'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name} · {user.emailOrHandle}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {user.mobileZa || 'No mobile'} · {user.tier}
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </button>

                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-[11px] text-slate-600 dark:text-slate-300 font-mono space-y-1">
                  <div>Water Depot: {activeWard.depots.water}</div>
                  <div>Power Depot: {activeWard.depots.electricity}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="min-h-[42px] px-4 rounded-xl border border-slate-200/90 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="font-mono text-[11px] text-slate-400">POPIA Encrypted</span>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="min-h-[42px] px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
