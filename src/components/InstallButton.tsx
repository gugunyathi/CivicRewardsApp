import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, Monitor, Share, Smartphone, X } from 'lucide-react';
import { useInstallPrompt, type InstallPlatform } from '../pwa';

const PLATFORM_STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: 'Install on iPhone / iPad',
    steps: [
      'Open this page in Safari.',
      'Tap the Share icon in the toolbar.',
      'Choose "Add to Home Screen", then tap Add.',
    ],
  },
  android: {
    title: 'Install on Android',
    steps: [
      'Open the browser menu (three dots, top right).',
      'Tap "Add to Home screen" or "Install app".',
      'Confirm to pin CivicRewards to your apps.',
    ],
  },
  windows: {
    title: 'Install on Windows',
    steps: [
      'Open the Chrome or Edge browser menu.',
      'Choose "Save and share" or "Apps", then "Install CivicRewards".',
      'Confirm to launch it like a desktop app.',
    ],
  },
  mac: {
    title: 'Install on Mac',
    steps: [
      'Open the Chrome or Edge browser menu.',
      'Choose "Save and share" or "Apps", then "Install CivicRewards".',
      'Confirm to add it to Launchpad and your Dock.',
    ],
  },
  other: {
    title: 'Install CivicRewards',
    steps: [
      'Use Chrome, Edge, or Safari on your device.',
      'Open the browser menu and select "Install app" or "Add to Home screen".',
      'Confirm to pin CivicRewards to your home screen.',
    ],
  },
};

function PlatformIcon({ platform, className = 'w-4 h-4' }: { platform: InstallPlatform; className?: string }) {
  if (platform === 'ios' || platform === 'android') return <Smartphone className={className} />;
  if (platform === 'windows' || platform === 'mac') return <Monitor className={className} />;
  return <Download className={className} />;
}

export const InstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { installState, platform, triggerInstall } = useInstallPrompt();
  const [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!guideOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuideOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guideOpen]);

  if (installState === 'installed' || installState === 'unavailable') return null;

  const handleClick = async () => {
    if (installState === 'prompt') {
      setBusy(true);
      const outcome = await triggerInstall();
      setBusy(false);
      if (outcome === 'unavailable') setGuideOpen(true);
    } else {
      setGuideOpen(true);
    }
  };

  const guide = PLATFORM_STEPS[platform];

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title="Install CivicRewards on this device"
        className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer border border-emerald-600/30 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{busy ? 'Installing…' : 'Install'}</span>
      </button>

      {guideOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm p-0 sm:p-4 ui-backdrop-enter"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <div className="w-full max-w-md flex flex-col bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-xl shadow-slate-900/15 overflow-hidden ui-modal-enter overscroll-contain">
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <PlatformIcon platform={platform} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Offline-ready app
                  </div>
                  <h2 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {guide.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                aria-label="Close install guide"
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 active:scale-95 transition-[transform,background-color] duration-150 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="p-6 space-y-3">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="mt-0.5 w-6 h-6 rounded-lg shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-mono text-xs font-bold flex items-center justify-center tabular-nums">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            <div className="px-6 pb-6 space-y-3">
              {platform === 'ios' ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Share className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Tap the Safari Share icon at the bottom of your screen.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Opens fullscreen and stays available offline.</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold active:scale-[0.98] transition-transform duration-150 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
