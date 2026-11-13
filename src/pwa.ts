import { useCallback, useEffect, useState } from 'react';

export type InstallPlatform = 'ios' | 'android' | 'windows' | 'mac' | 'other';
export type InstallState = 'installed' | 'prompt' | 'manual' | 'unavailable';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && touch)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Mac/.test(ua)) return 'mac';
  return 'other';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    navigator.standalone === true ||
    new URLSearchParams(window.location.search).get('source') === 'pwa'
  );
}

/** Registration is production-only so the worker never fights Vite HMR in dev. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline-first is progressive enhancement; the app works without it.
    });
  });
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const BIP_EVENT = 'civic:bip-available';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event(BIP_EVENT));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(BIP_EVENT));
  });
}

function computeState(): InstallState {
  if (isStandalone()) return 'installed';
  if (deferredPrompt) return 'prompt';
  const platform = detectPlatform();
  if (platform === 'ios') return 'manual';
  // Desktop/Android browsers without a captured prompt still support manual install.
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) return 'manual';
  return 'unavailable';
}

export function useInstallPrompt(): {
  installState: InstallState;
  platform: InstallPlatform;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
} {
  const [installState, setInstallState] = useState<InstallState>(() => computeState());
  const [platform] = useState<InstallPlatform>(() => detectPlatform());

  useEffect(() => {
    const refresh = () => setInstallState(computeState());
    refresh();
    window.addEventListener(BIP_EVENT, refresh);
    return () => window.removeEventListener(BIP_EVENT, refresh);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') deferredPrompt = null;
    setInstallState(computeState());
    return outcome;
  }, []);

  return { installState, platform, triggerInstall };
}
