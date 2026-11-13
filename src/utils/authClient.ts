import type { AuthChannel } from '../types/civic';

export interface SessionProfile {
  id: string;
  name: string;
  emailOrHandle: string;
  mobileZa: string;
  channel: AuthChannel;
  demo: boolean;
}

export interface AuthConfig {
  googleClientId: string | null;
  demoLoginEnabled: boolean;
  otpDevMode: boolean;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return data;
}

export const authClient = {
  config: () => api<AuthConfig>('/api/auth/config'),
  me: () => api<{ profile: SessionProfile }>('/api/auth/me'),
  logout: () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' }),

  requestOtp: (mobile: string, name?: string) =>
    api<{ ok: boolean; devCode?: string; retryAfterSec?: number }>('/api/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ mobile, name }),
    }),

  verifyOtp: (mobile: string, code: string, name?: string) =>
    api<{ profile: SessionProfile }>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ mobile, code, name }),
    }),

  google: (idToken: string) =>
    api<{ profile: SessionProfile }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  demo: (name: string, mobile: string, email: string, channel: AuthChannel) =>
    api<{ profile: SessionProfile }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ name, mobile, email, channel }),
    }),
};

// --- Google Identity Services loader (dynamic, no bundle cost when unused) ---

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleId {
  initialize: (opts: {
    client_id: string;
    callback: (r: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  prompt: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let gsiPromise: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection.'));
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

export function renderGoogleButton(
  el: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void
): void {
  const id = window.google?.accounts?.id;
  if (!id) throw new Error('Google sign-in not loaded yet.');
  id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) });
  id.renderButton(el, { theme: 'filled_black', size: 'large', width: 260, text: 'continue_with' });
}
