import { useEffect, useState } from 'react';
import type { CivicReport } from '../types/civic';

export function slaDeadline(report: CivicReport): Date {
  const created = new Date(report.createdAtIso).getTime();
  return new Date(created + report.slaDeadlineHours * 3600 * 1000);
}

export function slaRemainingMs(report: CivicReport, nowMs = Date.now()): number {
  return slaDeadline(report).getTime() - nowMs;
}

export function isSlaBreached(report: CivicReport, nowMs = Date.now()): boolean {
  if (report.status === 'Resolved' || report.status === 'Blocked by AI Forensics') return false;
  return slaRemainingMs(report, nowMs) <= 0;
}

function fmtDuration(ms: number): string {
  const abs = Math.abs(ms);
  const totalMins = Math.floor(abs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m`;
}

/** Human label: "14h 32m to SLA breach" / "SLA breached 3h 12m ago". */
export function slaCountdownLabel(report: CivicReport, nowMs = Date.now()): string {
  const remaining = slaRemainingMs(report, nowMs);
  if (remaining > 0) return `${fmtDuration(remaining)} to SLA breach`;
  return `SLA breached ${fmtDuration(remaining)} ago`;
}

/** Fraction of SLA window remaining (1 = just logged, 0 = breached). */
export function slaFractionLeft(report: CivicReport, nowMs = Date.now()): number {
  const total = report.slaDeadlineHours * 3600 * 1000;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, slaRemainingMs(report, nowMs) / total));
}

/** Re-rendering clock for live countdowns. */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
