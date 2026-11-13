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

  // Render the Google Identity button once config + container are ready
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
            advanceSoon(3, 300);
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

  const advanceSoon = (targetStep: 1 | 2 | 3, ms = 260) => {
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
          ? `Dev mode: no WhatsApp provider configured — use code ${res.devCode}.`
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
      advanceSoon(3, 300);
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
        emailInput.trim() || 'demo@civicpulse.local',
        channel
      );
      onAuthSuccess(profile);
      setAuthNotice('Demo session created (explicitly labeled — no OAuth keys needed).');
      advanceSoon(3, 300);
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
    setAuthNotice('Signed out. Session cookie cleared.');
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
      advanceSoon(2, 420);
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
      setDetectStatus('Try "Fourways", "Cedar Road", "Sea Point", "Lynnwood", or tap a chip.');
      return;
    }
    onSelectWard(matched.id, bindAsHome);
    setDetectStatus(`Resolved → ${matched.municipalityCode} Ward ${matched.wardNumber} (${matched.suburbs[0]})`);
    advanceSoon(2, 350);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-xl h-[86dvh] sm:h-[580px] max-h-[90dvh] flex flex-col bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden">
        {/* Pinned Header + 3-Step Track */}
        <div className="shrink-0 px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-white/12 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Step 0{step} / 03 · Citizen & Ward Profile
              </div>
              <h2 id="auth-modal-title" className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                {step === 1 && 'Where is your municipal ward?'}
                {step === 2 && 'Verify & sign in'}
                {step === 3 && 'Your CivicPulse profile summary'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile wizard"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { num: 1 as const, label: '1. Ward GPS' },
              { num: 2 as const, label: '2. Sign In' },
              { num: 3 as const, label: '3. Summary' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className="text-left space-y-1 cursor-pointer"
              >
                <div
                  className={`h-1.5 w-full transition-colors ${
                    s.num === step
                      ? 'bg-sky-500 dark:bg-sky-400'
                      : s.num < step
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : 'bg-slate-200 dark:bg-white/15'
                  }`}
                />
                <div
                  className={`font-mono text-[10px] ${
                    s.num === step ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Single-Screen Body */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-3 overflow-hidden">
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBindAsHome(true);
                    onUpdateProfile({ awayFromHome: false });
                  }}
                  className={`min-h-[36px] text-xs font-semibold cursor-pointer ${
                    bindAsHome
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
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
                  className={`min-h-[36px] text-xs font-semibold cursor-pointer ${
                    !bindAsHome
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
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
                className="w-full min-h-[48px] bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <LocateFixed className="w-4 h-4" />
                <span>{isLocating ? 'Detecting GPS...' : 'Auto-Detect My Ward via Live GPS'}</span>
              </button>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  1-Tap SA Metro Ward Presets (auto-advances):
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
                          advanceSoon(2, 200);
                        }}
                        className={`px-2.5 py-1.5 border text-xs font-medium cursor-pointer ${
                          active
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-sky-500'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAddressLookup} className="flex gap-1.5">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Type street or suburb (e.g. Cedar Road, Sea Point)"
                  className="flex-1 min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                >
                  Resolve
                </button>
              </form>

              <div className="space-y-1.5">
                {detectStatus && (
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-800 dark:text-sky-200 flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{detectStatus}</span>
                  </div>
                )}

                <select
                  aria-label="Select seeded SA Metro Ward"
                  value={activeWard.id}
                  onChange={(e) => {
                    onSelectWard(e.target.value, bindAsHome);
                    advanceSoon(2, 220);
                  }}
                  className="w-full min-h-[38px] px-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-white"
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
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto">
              {user.signedIn ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Signed in as {user.name}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {user.authChannel.toUpperCase()} · {user.mobileZa || user.emailOrHandle} · 30-day session
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[40px] px-4 border border-slate-300 dark:border-white/25 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setChannel('google')}
                      className={`min-h-[42px] px-2 border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        channel === 'google'
                          ? 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('telegram')}
                      className={`min-h-[42px] px-2 border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        channel === 'telegram'
                          ? 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Telegram</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannel('whatsapp');
                        setOtpSent(false);
                      }}
                      className={`min-h-[42px] px-2 border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        channel === 'whatsapp'
                          ? 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('email_za')}
                      className={`min-h-[42px] px-2 border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        channel === 'email_za'
                          ? 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email +27</span>
                    </button>
                  </div>

                  {/* GOOGLE OAUTH */}
                  {channel === 'google' && (
                    <div className="space-y-2.5 flex-1 flex flex-col justify-center items-center text-center">
                      {authConfig?.googleClientId ? (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                            Continue with your Google account — verified server-side, 30-day session.
                          </p>
                          <div ref={googleBtnRef} className="min-h-[44px] flex justify-center" />
                          {authBusy && (
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="p-3 border border-amber-400/50 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 max-w-sm space-y-1.5">
                          <div className="font-bold">Google sign-in not configured</div>
                          <p>
                            Set <span className="font-mono">GOOGLE_CLIENT_ID</span> (Google Cloud OAuth
                            web client) and restart the server to enable real Google OAuth. WhatsApp OTP
                            and demo sign-in work without it.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WHATSAPP OTP */}
                  {channel === 'whatsapp' && (
                    <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Resident Name
                          </label>
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            SA Mobile (+27)
                          </label>
                          <input
                            type="tel"
                            value={mobileInput}
                            onChange={(e) => setMobileInput(e.target.value)}
                            placeholder="+27 82 123 4567"
                            className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {otpSent && (
                        <div>
                          <label className="block text-[11px] font-medium text-sky-600 dark:text-sky-400 mb-0.5">
                            WhatsApp 6-Digit Code
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="482910"
                            className="w-full min-h-[40px] px-3 border border-sky-500 bg-white dark:bg-[#05070B] text-sm font-mono tracking-widest text-slate-900 dark:text-white"
                          />
                          {devCode && (
                            <p className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <KeyRound className="w-3 h-3" /> Dev code: {devCode}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={otpSent ? handleVerifyOtp : handleRequestOtp}
                        className="w-full min-h-[42px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-50 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                      >
                        {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{otpSent ? 'Verify Code & Continue' : 'Send WhatsApp Code'}</span>
                      </button>
                      {otpSent && (
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handleRequestOtp}
                          className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                  )}

                  {/* TELEGRAM / EMAIL → explicit demo session */}
                  {(channel === 'telegram' || channel === 'email_za') && (
                    <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Resident Name
                          </label>
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            {channel === 'telegram' ? 'Telegram Handle' : 'Email Address'}
                          </label>
                          <input
                            type="text"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                          SA Mobile (+27, optional)
                        </label>
                        <input
                          type="tel"
                          value={mobileInput}
                          onChange={(e) => setMobileInput(e.target.value)}
                          className="w-full min-h-[40px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={authBusy || authConfig?.demoLoginEnabled === false}
                        onClick={handleDemoSignIn}
                        className="w-full min-h-[42px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-50 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                      >
                        {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Continue with Demo Session</span>
                      </button>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {channel === 'telegram' ? 'Telegram' : 'Email'} verification lands in a later
                        phase — this creates an explicitly-labeled demo session so you can evaluate the
                        full flow today.
                      </p>
                    </div>
                  )}

                  {authError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/40 text-xs text-red-700 dark:text-red-300 shrink-0">
                      {authError}
                    </div>
                  )}
                  {authNotice && !authError && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                      {authNotice}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Tap any card below to edit your Ward or Sign-in channel:
              </div>

              <div className="space-y-2 flex-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full p-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400">
                        01 · {user.awayFromHome ? 'AWAY-FROM-HOME GPS' : 'BOUND HOME WARD'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {activeWard.municipalityCode} Ward {activeWard.wardNumber} · {activeWard.suburbs.join(', ')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Councillor: {activeWard.councillor.name} ({activeWard.councillor.party})
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full p-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400">
                        02 · CITIZEN IDENTITY ({user.authChannel.toUpperCase()})
                        {user.signedIn ? ' · SESSION ACTIVE' : ' · NOT SIGNED IN'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name} · {user.emailOrHandle}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {user.mobileZa || 'no mobile'} · {user.tier}
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>

                <div className="p-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-[11px] text-slate-600 dark:text-slate-300 font-mono space-y-0.5">
                  <div>Water Depot: {activeWard.depots.water}</div>
                  <div>Power Depot: {activeWard.depots.electricity}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/12 flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="min-h-[40px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="font-mono text-[10px] text-slate-400">POPIA Encrypted</span>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="min-h-[40px] px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done · Enter Command Center</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
