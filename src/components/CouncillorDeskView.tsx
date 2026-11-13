import React, { useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, ReportStatus, WardRecord } from '../types/civic';

interface CouncillorDeskViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  onUpdateStatus: (reportId: string, newStatus: ReportStatus) => void;
  onAttachRef: (reportId: string, refCode: string) => void;
  onSendSlaReminder: (reportId: string) => void;
  onApproveStrippedMedia: (reportId: string) => void;
}

const WORKFLOW_STEPS: ReportStatus[] = [
  'Logged',
  'Escalated to Depot',
  'Technician Dispatched',
  'Resolved',
];

export const CouncillorDeskView: React.FC<CouncillorDeskViewProps> = ({
  reports,
  activeWard,
  onUpdateStatus,
  onAttachRef,
  onSendSlaReminder,
  onApproveStrippedMedia,
}) => {
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refDrafts, setRefDrafts] = useState<Record<string, string>>({});
  const [ticketIdx, setTicketIdx] = useState(0);

  const filtered = reports.filter((r) => {
    const matchesWard = wardFilter === 'ALL' || r.wardId === wardFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesWard && matchesStatus;
  });

  const safeIdx = Math.min(ticketIdx, Math.max(0, filtered.length - 1));
  const currentTicket = filtered[safeIdx];

  const breachedCount = reports.filter(
    (r) =>
      r.status !== 'Resolved' &&
      r.status !== 'Blocked by AI Forensics' &&
      r.slaElapsedHours > r.slaDeadlineHours
  ).length;
  const blockedCount = reports.filter((r) => r.status === 'Blocked by AI Forensics').length;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Councillor & Depot Escalation Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Queue {reports.length} · SLA Breached {breachedCount} · AI Quarantined {blockedCount}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums mr-1">
            Ticket {filtered.length === 0 ? 0 : safeIdx + 1} / {filtered.length}
          </span>
          <button
            type="button"
            disabled={safeIdx === 0 || filtered.length === 0}
            onClick={() => setTicketIdx((i) => Math.max(0, i - 1))}
            aria-label="Previous ticket"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safeIdx >= filtered.length - 1 || filtered.length === 0}
            onClick={() => setTicketIdx((i) => Math.min(filtered.length - 1, i + 1))}
            aria-label="Next ticket"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {['ALL', ...WORKFLOW_STEPS, 'Blocked by AI Forensics'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setTicketIdx(0);
              }}
              className={`min-h-[32px] px-2.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'Blocked by AI Forensics' ? 'Blocked' : st}
            </button>
          ))}
        </div>

        <select
          value={wardFilter}
          onChange={(e) => {
            setWardFilter(e.target.value);
            setTicketIdx(0);
          }}
          aria-label="Filter by Ward"
          className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs text-slate-900 dark:text-white"
        >
          <option value="ALL">All Wards</option>
          <option value={activeWard.id}>
            Active: {activeWard.municipalityCode} W{activeWard.wardNumber}
          </option>
          {SEED_WARDS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.municipalityCode} W{w.wardNumber} — {w.councillor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Single-Ticket Focus Card (Zero Vertical Scroll) */}
      {!currentTicket ? (
        <div className="p-8 bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 text-center text-sm text-slate-500">
          No tickets match the selected ward and status filter.
        </div>
      ) : (
        (() => {
          const report = currentTicket;
          const slaBreached =
            report.status !== 'Resolved' &&
            report.status !== 'Blocked by AI Forensics' &&
            report.slaElapsedHours > report.slaDeadlineHours;
          const currentStepIdx = WORKFLOW_STEPS.indexOf(report.status);
          const wardMeta = SEED_WARDS.find((w) => w.id === report.wardId);

          return (
            <div className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-4 space-y-3.5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {report.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {report.municipalityCode} W{report.wardNumber} ({report.suburb})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{wardMeta?.councillor.name ?? 'Councillor'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-sky-600 dark:text-sky-400">
                      {report.assignedDepot}
                    </span>
                  </div>

                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {report.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {report.address} — {report.description}
                  </p>
                </div>

                <div className="flex flex-wrap lg:flex-col lg:items-end justify-between gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    {report.forensics.status === 'VERIFIED' && (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Capture
                      </span>
                    )}
                    {report.forensics.status === 'WARNING_STRIPPED_METADATA' && (
                      <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Stripped Metadata
                      </span>
                    )}
                    {report.forensics.status === 'FLAGGED_SYNTHETIC' && (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Synthetic Blocked
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-xs font-mono tabular-nums flex items-center gap-1 ${
                      slaBreached
                        ? 'text-red-600 dark:text-red-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      SLA {report.slaElapsedHours}h/{report.slaDeadlineHours}h
                      {slaBreached ? ' BREACHED' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              {report.status !== 'Blocked by AI Forensics' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const active = step === report.status;
                    const done = currentStepIdx >= idx;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => onUpdateStatus(report.id, step)}
                        className={`min-h-[38px] px-2.5 py-1 border text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : done
                              ? 'bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-400 hover:border-sky-500'
                        }`}
                      >
                        {step === 'Technician Dispatched' && <Wrench className="w-3 h-3 shrink-0" />}
                        {step === 'Resolved' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{step}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Controls: Attach Official Ref, Verify Stripped Media, Trigger SLA Reminder */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={refDrafts[report.id] ?? report.municipalRef ?? ''}
                    onChange={(e) =>
                      setRefDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    placeholder="Ref # (e.g. CPWEB5012)"
                    className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (refDrafts[report.id] ?? report.municipalRef ?? '').trim();
                      if (val) onAttachRef(report.id, val);
                    }}
                    className="min-h-[36px] px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    Save Ref #
                  </button>

                  {report.forensics.status === 'WARNING_STRIPPED_METADATA' && (
                    <button
                      type="button"
                      onClick={() => onApproveStrippedMedia(report.id)}
                      className="min-h-[36px] px-2.5 border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                  )}
                </div>

                {report.status !== 'Blocked by AI Forensics' && report.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => onSendSlaReminder(report.id)}
                    className={`min-h-[36px] px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      slaBreached
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'border border-slate-200 dark:border-white/20 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{slaBreached ? 'Escalate SLA Breach' : 'Depot Follow-Up'}</span>
                  </button>
                )}
              </div>

              {/* Recent Audit Entries */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 font-mono">
                {report.escalationLog.slice(-2).map((entry, i) => (
                  <div key={i} className="truncate">
                    • {entry}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};
