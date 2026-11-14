import type { CivicReport } from '../types/civic';

export const VERIFY_FIX_WINDOW_MS = 15 * 60 * 1000; // 15 minutes after restoration
export const VERIFY_FIX_POINTS = 30;

export interface VerificationWindowState {
  isRestored: boolean;
  canVerify: boolean;
  alreadyVerifiedByUser: boolean;
  withinWindow: boolean;
  remainingMs: number;
  remainingLabel: string | null;
  windowExpired: boolean;
}

export function getVerificationWindowState(
  report: CivicReport,
  verifiedFixIds: readonly string[] = [],
  nowMs: number = Date.now()
): VerificationWindowState {
  const alreadyVerifiedByUser = verifiedFixIds.includes(report.id);

  if (report.forensics.status === 'FLAGGED_SYNTHETIC') {
    return {
      isRestored: false,
      canVerify: false,
      alreadyVerifiedByUser,
      withinWindow: false,
      remainingMs: 0,
      remainingLabel: null,
      windowExpired: false,
    };
  }

  const isRestored = report.status === 'Resolved';
  if (!isRestored) {
    return {
      isRestored: false,
      canVerify: !alreadyVerifiedByUser,
      alreadyVerifiedByUser,
      withinWindow: false,
      remainingMs: 0,
      remainingLabel: null,
      windowExpired: false,
    };
  }

  const resolvedMs = report.resolvedAtIso ? Date.parse(report.resolvedAtIso) : Number.NaN;
  if (!Number.isFinite(resolvedMs)) {
    return {
      isRestored: true,
      canVerify: false,
      alreadyVerifiedByUser,
      withinWindow: false,
      remainingMs: 0,
      remainingLabel: null,
      windowExpired: true,
    };
  }

  const elapsedMs = Math.max(0, nowMs - resolvedMs);
  const remainingMs = Math.max(0, VERIFY_FIX_WINDOW_MS - elapsedMs);
  const withinWindow = elapsedMs <= VERIFY_FIX_WINDOW_MS && remainingMs > 0;

  if (!withinWindow) {
    return {
      isRestored: true,
      canVerify: false,
      alreadyVerifiedByUser,
      withinWindow: false,
      remainingMs: 0,
      remainingLabel: null,
      windowExpired: true,
    };
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const remainingLabel =
    mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s left` : `${secs}s left`;

  return {
    isRestored: true,
    canVerify: !alreadyVerifiedByUser,
    alreadyVerifiedByUser,
    withinWindow: true,
    remainingMs,
    remainingLabel,
    windowExpired: false,
  };
}
