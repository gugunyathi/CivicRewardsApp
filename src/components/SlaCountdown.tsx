import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import type { CivicReport } from '../types/civic';
import { slaCountdownLabel, slaFractionLeft, useNow } from '../utils/sla';

interface SlaCountdownProps {
  report: CivicReport;
  className?: string;
}

/** Live ticking SLA countdown: "14h 32m to SLA breach" / breach state. */
export const SlaCountdown: React.FC<SlaCountdownProps> = ({ report, className = '' }) => {
  const now = useNow(30000);

  if (report.status === 'Resolved') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Resolved within SLA</span>
      </span>
    );
  }
  if (report.status === 'Blocked by AI Forensics') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-400 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>SLA paused (quarantined)</span>
      </span>
    );
  }

  const fraction = slaFractionLeft(report, now);
  const breached = fraction <= 0;
  const urgent = !breached && fraction < 0.25;
  const color = breached
    ? 'text-red-700 dark:text-red-400'
    : urgent
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-slate-600 dark:text-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${color} ${breached ? 'font-bold' : ''} ${className}`}
      title={`SLA window: ${report.slaDeadlineHours}h from ${new Date(report.createdAtIso).toLocaleString()}`}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{slaCountdownLabel(report, now)}</span>
    </span>
  );
};
