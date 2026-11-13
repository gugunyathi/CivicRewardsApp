import React, { useState } from 'react';
import { CheckCircle2, Download, Monitor, Share, Smartphone, X } from 'lucide-react';
import { useInstallPrompt, type InstallPlatform } from '../pwa';

const PLATFORM_STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: 'Install on iPhone / iPad',
    steps: [
      'Open this page in Safari (Add to Home Screen needs Safari).',
      'Tap the Share button in the toolbar.',
      'Choose "Add to Home Screen", then tap Add.',
      'Launch CivicRewards from your Home Screen like any app.',
    ],
  },
  android: {
    title: 'Install on Android',
    steps: [
      'Open the browser menu (three dots, top right).',
      'Tap "Add to Home screen" or "Install app".',
      'Confirm Add — the icon appears alongside your apps.',
    ],
  },
  windows: {
    title: 'Install on Windows',
    steps: [
      'In Chrome or Edge, open the browser menu (three dots).',
      'Choose "Save and share" (Chrome) or "Apps" (Edge), then "Install CivicRewards".',
      'Confirm Install — it lands in Start and behaves like a desktop app.',
    ],
  },
  mac: {
    title: 'Install on Mac',
    steps: [
      'In Chrome or Edge, open the browser menu (three dots).',
      'Choose "Save and share" (Chrome) or "Apps" (Edge), then "Install CivicRewards".',
      'Confirm Install — find it in Launchpad and the Dock.',
    ],
  },
  other: {
    title: 'Install CivicRewards',
    steps: [
      'Use Chrome, Edge, or Safari on your device.',
      'Open the browser menu and choose "Install app" or "Add to Home screen".',
      'Confirm to pin CivicRewards to your home screen or dock.',
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

  if (installState === 'installed' || installState === 'unavailable') return null;

  const handleClick = async () => {
    if (installState === 'prompt') {
      setBusy(true);
      const outcome = await triggerInstall();
      setBusy(false);
      // Native prompt unavailable after all (e.g. already consumed) → show manual steps.
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
        className={`min-h-[34px] px-2 py-1 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-sky-500/50 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 disabled:opacity-50 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{busy ? 'Installing…' : 'Install'}</span>
      </button>

      {guideOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <div className="w-full max-w-md flex flex-col bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/12 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <PlatformIcon platform={platform} />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    Free install · works offline
                  </div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                    {guide.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                aria-label="Close install guide"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="p-4 space-y-2.5">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                  <span className="mt-0.5 w-5 h-5 shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            <div className="px-4 pb-4 space-y-2">
              {platform === 'ios' ? (
                <div className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Share className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Look for the square-with-arrow Share icon at the bottom (iPhone) or top (iPad) of Safari.</span>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Once installed, CivicRewards opens fullscreen, works offline, and updates itself.</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="w-full min-h-[42px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
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
