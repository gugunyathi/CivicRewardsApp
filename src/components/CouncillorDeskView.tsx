import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, ReportStatus, WardRecord } from '../types/civic';
import { openWhatsAppShare } from '../utils/share';
import { EscalationPanel } from './EscalationPanel';
import { MiniMapPreview } from './MiniMapPreview';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';

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

const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export const CouncillorDeskView: React.FC<CouncillorDeskViewProps> = React.memo(({
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

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const matchesWard = wardFilter === 'ALL' || r.wardId === wardFilter;
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        return matchesWard && matchesStatus;
      }),
    [reports, wardFilter, statusFilter]
  );

  const safeIdx = Math.min(ticketIdx, Math.max(0, filtered.length - 1));
  const currentTicket = filtered[safeIdx];

  const { breachedCount, blockedCount } = useMemo(
    () => ({
      breachedCount: reports.filter(
        (r) =>
          r.status !== 'Resolved' &&
          r.status !== 'Blocked by AI Forensics' &&
          r.slaElapsedHours > r.slaDeadlineHours
      ).length,
      blockedCount: reports.filter((r) => r.status === 'Blocked by AI Forensics').length,
    }),
    [reports]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Councillor Escalation Desk
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {reports.length} queued · {breachedCount} SLA breached · {blockedCount} quarantined
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums mr-1">
            Ticket {filtered.length === 0 ? 0 : safeIdx + 1} / {filtered.length}
          </span>
          <button
            type="button"
            disabled={safeIdx === 0 || filtered.length === 0}
            onClick={() => setTicketIdx((i) => Math.max(0, i - 1))}
            aria-label="Previous ticket"
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-800 dark:text-white disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safeIdx >= filtered.length - 1 || filtered.length === 0}
            onClick={() => setTicketIdx((i) => Math.min(filtered.length - 1, i + 1))}
            aria-label="Next ticket"
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-800 dark:text-white disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {['ALL', ...WORKFLOW_STEPS, 'Blocked by AI Forensics'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setTicketIdx(0);
              }}
              className={`min-h-[34px] px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
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
          className="h-9 px-3 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-xs font-medium text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
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

      {/* Single-Ticket Focus Card */}
      {!currentTicket ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] text-center text-sm text-slate-600 dark:text-slate-400">
          No tickets match this filter.
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
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.06)] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {report.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {report.municipalityCode} W{report.wardNumber} ({report.suburb})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{wardMeta?.councillor.name ?? 'Councillor'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {report.assignedDepot}
                    </span>
                  </div>

                  <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {report.title}
                  </h3>

                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
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
                      <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Synthetic Blocked
                      </span>
                    )}
                  </div>

                  <SlaCountdown report={report} />
                </div>
              </div>

              {/* Evidence photo + fault location map */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Evidence capture
                  </div>
                  <SmartImage
                    src={report.photoUrl}
                    alt={report.title}
                    categoryId={report.categoryId}
                    label={`${report.departmentLabel} · ${report.suburb}`}
                    className="h-32 w-full rounded-xl border border-slate-300 dark:border-white/[0.08]"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Fault location
                  </div>
                  <MiniMapPreview
                    lat={report.lat}
                    lng={report.lng}
                    zoom={14}
                    darkMode={isDarkTheme()}
                    label={`${report.address} · ${report.lat.toFixed(3)}, ${report.lng.toFixed(3)}`}
                    className="h-32 w-full rounded-xl border border-slate-300 dark:border-white/[0.08]"
                  />
                </div>
              </div>

              <EscalationPanel
                report={report}
                ward={wardMeta ?? activeWard}
                onAttachRef={onAttachRef}
                onSendSlaReminder={onSendSlaReminder}
              />

              {/* Progress Stepper */}
              {report.status !== 'Blocked by AI Forensics' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const active = step === report.status;
                    const done = currentStepIdx >= idx;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => onUpdateStatus(report.id, step)}
                        className={`min-h-[40px] px-3 py-1 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 ${
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : done
                              ? 'bg-emerald-600/12 border-emerald-700/40 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-100/80 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.08] text-slate-700 dark:text-slate-400 hover:border-emerald-700'
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

              {/* Controls */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={refDrafts[report.id] ?? report.municipalRef ?? ''}
                    onChange={(e) =>
                      setRefDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    placeholder="Ref # (e.g. CPWEB5012)"
                    className="h-9 px-3 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-xs font-mono text-slate-950 dark:text-white placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = (refDrafts[report.id] ?? report.municipalRef ?? '').trim();
                      if (val) onAttachRef(report.id, val);
                    }}
                    className="h-9 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    Save Ref #
                  </button>

                  {report.forensics.status === 'WARNING_STRIPPED_METADATA' && (
                    <button
                      type="button"
                      onClick={() => onApproveStrippedMedia(report.id)}
                      className="h-9 px-3 rounded-xl border border-emerald-700/60 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const w = wardMeta ?? activeWard;
                      openWhatsAppShare(
                        report,
                        {
                          wardLabel: `${report.municipalityCode} W${report.wardNumber} (${report.suburb})`,
                          councillorName: w.councillor.name,
                        },
                        w.councillor.whatsappEscalation
                      );
                    }}
                    title="Share report to WhatsApp"
                    className="h-9 px-3 rounded-xl border border-slate-300 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  {report.status !== 'Blocked by AI Forensics' && report.status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => onSendSlaReminder(report.id)}
                      className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 ${
                        slaBreached
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border border-slate-300 dark:border-white/12 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{slaBreached ? 'Escalate SLA Breach' : 'Depot Follow-Up'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 font-mono">
                {report.escalationLog.slice(-2).map((entry, i) => (
                  <div key={i} className="truncate">
                    · {entry}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
});

CouncillorDeskView.displayName = 'CouncillorDeskView';
