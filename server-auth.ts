import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express, Request, Response } from 'express';

// ---------------------------------------------------------------------------
// CivicPulse session auth: Google ID-token login + WhatsApp OTP login.
// Stateless HMAC-signed session cookie (30 days), httpOnly. No new deps.
// Swap the in-memory OTP store for Redis/DB when scaling past one instance.
// ---------------------------------------------------------------------------

export interface SessionProfile {
  id: string;
  name: string;
  emailOrHandle: string;
  mobileZa: string;
  channel: 'google' | 'whatsapp' | 'telegram' | 'email_za';
  demo: boolean;
}

const COOKIE_NAME = 'civic_session';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

let bootSecret: string | null = null;

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!bootSecret) {
    bootSecret = randomBytes(32).toString('hex');
    console.warn('[auth] SESSION_SECRET not set — using an ephemeral boot secret (sessions reset on restart).');
  }
  return bootSecret;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signToken(profile: SessionProfile): string {
  const payload = b64urlEncode(
    JSON.stringify({ ...profile, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })
  );
  const sig = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): SessionProfile | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const claims = JSON.parse(b64urlDecode(payload)) as SessionProfile & { exp: number };
    if (claims.exp < Date.now()) return null;
    return {
      id: claims.id,
      name: claims.name,
      emailOrHandle: claims.emailOrHandle,
      mobileZa: claims.mobileZa,
      channel: claims.channel,
      demo: claims.demo,
    };
  } catch {
    return null;
  }
}

function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME) return rest.join('=');
  }
  return null;
}

function setSessionCookie(res: Response, token: string | null): void {
  const secure =
    process.env.NODE_ENV === 'production' || (process.env.APP_URL ?? '').startsWith('https');
  const attrs = [
    `${COOKIE_NAME}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    token ? `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` : 'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function issueSession(res: Response, profile: SessionProfile): SessionProfile {
  setSessionCookie(res, signToken(profile));
  return profile;
}

// --- SA mobile normalization ------------------------------------------------

export function normalizeSaMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let e164 = '';
  if (digits.length === 11 && digits.startsWith('27')) e164 = `+${digits}`;
  else if (digits.length === 10 && digits.startsWith('0')) e164 = `+27${digits.slice(1)}`;
  else if (digits.length === 9) e164 = `+27${digits}`;
  else return null;
  return /^\+27\d{9}$/.test(e164) ? e164 : null;
}

// --- OTP store ----------------------------------------------------------------

interface OtpEntry {
  salt: string;
  codeHash: string;
  exp: number;
  attempts: number;
  lastSent: number;
  name: string;
}

const otpStore = new Map<string, OtpEntry>();

function hashCode(salt: string, code: string): string {
  return createHmac('sha256', salt).update(code).digest('hex');
}

function devOtpEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEV_OTP === 'true';
}

/**
 * Deliver the OTP over WhatsApp when a provider is configured.
 * Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN (Meta Cloud API / Twilio /
 * Clickatell shape: POST { to, body }). Without a provider the code is logged
 * and, outside production, returned so login still works end to end.
 */
async function sendWhatsAppOtp(mobile: string, code: string): Promise<{ devCode?: string }> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (url && token) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: mobile,
        body: `Your CivicPulse verification code is ${code}. Valid for 10 minutes.`,
      }),
    });
    return {};
  }
  console.log(`[auth] WhatsApp OTP for ${mobile}: ${code} (no provider configured)`);
  return devOtpEnabled() ? { devCode: code } : {};
}

// --- Google ID token verification ---------------------------------------------

async function verifyGoogleIdToken(
  idToken: string
): Promise<{ sub: string; name: string; email: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured (GOOGLE_CLIENT_ID missing).');
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error('Google token rejected. Please try again.');
  const claims = (await res.json()) as {
    aud?: string;
    sub?: string;
    name?: string;
    email?: string;
    exp?: string;
  };
  if (claims.aud !== clientId) throw new Error('Google token audience mismatch.');
  if (!claims.sub || !claims.email) throw new Error('Google account has no verified email.');
  if (claims.exp && Number(claims.exp) * 1000 < Date.now()) throw new Error('Google token expired.');
  return { sub: claims.sub, name: claims.name || claims.email, email: claims.email };
}

// --- Routes --------------------------------------------------------------------

export function registerAuthRoutes(app: Express): void {
  app.get('/api/auth/config', (_req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? null,
      demoLoginEnabled: process.env.ALLOW_DEMO_LOGIN !== 'false',
      otpDevMode: devOtpEnabled() && !process.env.WHATSAPP_API_TOKEN,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = readSessionCookie(req);
    const profile = token ? verifyToken(token) : null;
    if (!profile) {
      res.status(401).json({ error: 'No active session.' });
      return;
    }
    res.json({ profile });
  });

  app.post('/api/auth/logout', (_req, res) => {
    setSessionCookie(res, null);
    res.json({ ok: true });
  });

  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken } = req.body as { idToken?: string };
      if (!idToken) {
        res.status(400).json({ error: 'idToken is required.' });
        return;
      }
      const claims = await verifyGoogleIdToken(idToken);
      const profile = issueSession(res, {
        id: `google_${claims.sub}`,
        name: claims.name,
        emailOrHandle: claims.email,
        mobileZa: '',
        channel: 'google',
        demo: false,
      });
      res.json({ profile });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      console.error('Google auth error:', message);
      res.status(401).json({ error: message });
    }
  });

  app.post('/api/auth/otp/request', async (req, res) => {
    try {
      const { mobile, name } = req.body as { mobile?: string; name?: string };
      const normalized = normalizeSaMobile(mobile ?? '');
      if (!normalized) {
        res.status(400).json({ error: 'Enter a valid SA mobile number (e.g. +27 82 123 4567).' });
        return;
      }
      const existing = otpStore.get(normalized);
      const sinceSend = existing ? Date.now() - existing.lastSent : OTP_RESEND_MS;
      if (sinceSend < OTP_RESEND_MS) {
        res.status(429).json({
          error: 'Code already sent — please wait before requesting another.',
          retryAfterSec: Math.ceil((OTP_RESEND_MS - sinceSend) / 1000),
        });
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const salt = randomBytes(16).toString('hex');
      otpStore.set(normalized, {
        salt,
        codeHash: hashCode(salt, code),
        exp: Date.now() + OTP_TTL_MS,
        attempts: 0,
        lastSent: Date.now(),
        name: (name ?? '').trim(),
      });
      const { devCode } = await sendWhatsAppOtp(normalized, code);
      res.json({ ok: true, ...(devCode ? { devCode } : {}) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send OTP.';
      console.error('OTP request error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/auth/otp/verify', (req, res) => {
    const { mobile, code, name } = req.body as { mobile?: string; code?: string; name?: string };
    const normalized = normalizeSaMobile(mobile ?? '');
    const entry = normalized ? otpStore.get(normalized) : undefined;
    if (!normalized || !entry) {
      res.status(400).json({ error: 'No code requested for this number. Tap "Send code" first.' });
      return;
    }
    if (entry.exp < Date.now()) {
      otpStore.delete(normalized);
      res.status(400).json({ error: 'Code expired. Request a new one.' });
      return;
    }
    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(normalized);
      res.status(429).json({ error: 'Too many attempts. Request a new code.' });
      return;
    }
    const candidate = hashCode(entry.salt, (code ?? '').trim());
    const a = Buffer.from(candidate);
    const b = Buffer.from(entry.codeHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      entry.attempts += 1;
      res.status(401).json({ error: `Incorrect code (${OTP_MAX_ATTEMPTS - entry.attempts} tries left).` });
      return;
    }
    otpStore.delete(normalized);
    const displayName = (name ?? '').trim() || entry.name || 'Ward Resident';
    const profile = issueSession(res, {
      id: `wa_${normalized.replace(/\D/g, '')}`,
      name: displayName,
      emailOrHandle: normalized,
      mobileZa: normalized,
      channel: 'whatsapp',
      demo: false,
    });
    res.json({ profile });
  });

  // Explicitly-labeled demo sign-in for evaluation before OAuth/WhatsApp keys
  // are configured. Disable in production with ALLOW_DEMO_LOGIN=false.
  app.post('/api/auth/demo', (req, res) => {
    if (process.env.ALLOW_DEMO_LOGIN === 'false') {
      res.status(403).json({ error: 'Demo sign-in is disabled on this deployment.' });
      return;
    }
    const { name, mobile, email, channel } = req.body as {
      name?: string;
      mobile?: string;
      email?: string;
      channel?: SessionProfile['channel'];
    };
    const profile = issueSession(res, {
      id: `demo_${randomBytes(6).toString('hex')}`,
      name: (name ?? '').trim() || 'Demo Resident',
      emailOrHandle: (email ?? '').trim() || 'demo@civicpulse.local',
      mobileZa: normalizeSaMobile(mobile ?? '') ?? (mobile ?? '').trim(),
      channel: channel ?? 'email_za',
      demo: true,
    });
    res.json({ profile });
  });
}
