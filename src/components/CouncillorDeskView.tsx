import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileCheck2,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { SEED_WARDS, SERVICE_CATEGORIES } from '../data/civicSeedData';
import type {
  CivicReport,
  CouncillorAnalyticsSummary,
  ReportStatus,
  WardRecord,
} from '../types/civic';
import { civicApi } from '../utils/civicApi';
import { formatSaMobileDisplay } from '../utils/phone';
import { openWhatsAppShare } from '../utils/share';
import { EscalationPanel } from './EscalationPanel';
import { MiniMapPreview } from './MiniMapPreview';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';
import { WardChartsAnalytics } from './WardChartsAnalytics';

interface CouncillorDeskViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  darkMode?: boolean;
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

const toWaDigits = (phone: string) => phone.replace(/\D/g, '');

const openDirectWhatsApp = (phone: string, text: string) => {
  const digits = toWaDigits(phone);
  if (!digits) return;
  const a = document.createElement('a');
  a.href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
};

const CONTRIBUTION_LABELS: Record<'primary_report' | 'me_too' | 'verify_fix', string> = {
  primary_report: 'Primary Report',
  me_too: '+1 Me Too',
  verify_fix: 'Verify Fix',
};

export const CouncillorDeskView: React.FC<CouncillorDeskViewProps> = React.memo(({
  reports,
  activeWard,
  darkMode,
  onUpdateStatus,
  onAttachRef,
  onSendSlaReminder,
  onApproveStrippedMedia,
}) => {
  const effectiveDarkMode = darkMode ?? isDarkTheme();
  const [deskTab, setDeskTab] = useState<'queue' | 'charts' | 'analytics'>('queue');
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refDrafts, setRefDrafts] = useState<Record<string, string>>({});
  const [ticketIdx, setTicketIdx] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analytics, setAnalytics] = useState<CouncillorAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await civicApi.fetchCouncillorAnalytics(wardFilter, analyticsSearch);
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Unable to load reporter analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [wardFilter, analyticsSearch]);

  useEffect(() => {
    if (deskTab === 'analytics') {
      void loadAnalytics();
    }
  }, [deskTab, reports, loadAnalytics]);

  const handleCopyPhone = (phone: string) => {
    const formatted = formatSaMobileDisplay(phone);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(formatted).catch(() => {});
    }
    setCopiedPhone(phone);
    window.setTimeout(() => {
      setCopiedPhone((prev) => (prev === phone ? null : prev));
    }, 1800);
  };

  const handleExportCsv = () => {
    if (!analytics || analytics.reportersByMobile.length === 0) return;
    const headers = [
      'Mobile Number',
      'Reporter Name(s)',
      'Report ID',
      'Contribution Type',
      'Ward',
      'Department',
      'Status',
      'Municipal Ref',
      'Report Title',
      'Street Address',
      'CR Earned',
      'CR Claimed',
      'Reported At',
    ];
    const escapeCell = (val: string | number | boolean | null | undefined) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const rows: string[] = [headers.map(escapeCell).join(',')];
    for (const group of analytics.reportersByMobile) {
      for (const rep of group.reports) {
        rows.push(
          [
            group.displayMobile,
            group.reporterNames.join(' / '),
            rep.reportId,
            CONTRIBUTION_LABELS[rep.contributionType],
            `W${rep.wardNumber}`,
            rep.categoryId.toUpperCase(),
            rep.status,
            rep.municipalRef || 'Pending',
            rep.title,
            rep.address,
            rep.pointsEarned,
            rep.pointsClaimed ? 'Claimed' : 'Pending',
            rep.createdAtIso,
          ]
            .map(escapeCell)
            .join(',')
        );
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicrewards-reporters-${wardFilter.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

        <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          {/* Segmented Desk View Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08] overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setDeskTab('queue')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                deskTab === 'queue'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Escalation Queue</span>
            </button>
            <button
              type="button"
              onClick={() => setDeskTab('charts')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                deskTab === 'charts'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Charts &amp; Graphs</span>
            </button>
            <button
              type="button"
              onClick={() => setDeskTab('analytics')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                deskTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reporters &amp; Analytics</span>
            </button>
          </div>

          {deskTab === 'queue' && (
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
          )}
        </div>
      </div>

      {deskTab === 'queue' ? (
        <>
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
              const linkedContacts = Array.from(
                new Set([
                  ...(report.reporterPhone ? [report.reporterPhone] : []),
                  ...(report.corroboratorPhones ?? []),
                ])
              );

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

                  {/* Reporter Contact Strip for Coordination & Verification */}
                  <div className="p-3 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-700/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                          <span>Reporter: {report.reporterName}</span>
                          {report.reporterPhone ? (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                              · {formatSaMobileDisplay(report.reporterPhone)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">· No mobile attached</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {linkedContacts.length > 1
                            ? `${linkedContacts.length} household numbers linked for coordination & verification.`
                            : 'Shared with Ward Councillor for coordination, escalation & fix verification.'}
                        </div>
                      </div>
                    </div>

                    {report.reporterPhone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(report.reporterPhone!)}
                          className="h-8 px-2.5 rounded-lg border border-slate-400 dark:border-white/15 bg-white dark:bg-white/[0.04] text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                        >
                          {copiedPhone === report.reporterPhone ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openDirectWhatsApp(
                              report.reporterPhone!,
                              `Hi ${report.reporterName}, this is Ward ${report.wardNumber} Councillor Desk following up on ${report.id} (${report.title}).`
                            )
                          }
                          className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp Reporter</span>
                        </button>
                      </div>
                    )}
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
                        darkMode={effectiveDarkMode}
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
        </>
      ) : deskTab === 'charts' ? (
        <WardChartsAnalytics
          activeWard={activeWard}
          reports={reports}
          darkMode={effectiveDarkMode}
        />
      ) : (
        /* ANALYTICS & REPORTERS VIEW */
        <div className="space-y-4">
          {/* Ward Filter, Search & CSV Export Bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={analyticsSearch}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
                placeholder="Search reporter mobile, name, report ID, ref #, or street..."
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-xs text-slate-950 dark:text-white placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
              />
              {analyticsSearch && (
                <button
                  type="button"
                  onClick={() => setAnalyticsSearch('')}
                  aria-label="Clear analytics search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                aria-label="Filter Analytics by Ward"
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

              <button
                type="button"
                disabled={!analytics || analytics.reportersByMobile.length === 0}
                onClick={handleExportCsv}
                className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {analyticsError && (
            <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-800 dark:text-red-300">
              {analyticsError}
            </div>
          )}

          {/* KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 space-y-1">
              <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Unique Reporter Numbers</span>
              </div>
              <div className="font-display text-xl font-bold tabular-nums text-slate-950 dark:text-white">
                {analytics?.uniqueReporterNumbers ?? 0}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                {analytics?.totalContactSubmissions ?? 0} total linked submissions
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 space-y-1">
              <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Total Reports
              </div>
              <div className="font-display text-xl font-bold tabular-nums text-slate-950 dark:text-white">
                {analytics?.totalReports ?? reports.length}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                {analytics?.resolvedReports ?? 0} resolved
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 space-y-1">
              <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Open / SLA Breached
              </div>
              <div className="font-display text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {analytics?.openReports ?? 0}
                <span className="text-sm font-mono text-red-700 dark:text-red-400 ml-1.5">
                  ({analytics?.slaBreachedReports ?? 0} SLA)
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Active depot queue
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 space-y-1">
              <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Pending Claimable CR
              </div>
              <div className="font-display text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {analytics?.unclaimedPointsTotal ?? 0} CR
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Held for guest mobile numbers
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          {analytics && analytics.byCategory.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Department Fault Volume
                </h2>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {wardFilter === 'ALL' ? 'All Wards' : wardFilter}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {analytics.byCategory.map((cat) => {
                  const meta = SERVICE_CATEGORIES.find((s) => s.id === cat.categoryId);
                  const maxCount = Math.max(1, ...analytics.byCategory.map((c) => c.count));
                  const pct = Math.round((cat.count / maxCount) * 100);
                  return (
                    <div
                      key={cat.categoryId}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                        <span>{meta?.shortTitle ?? cat.categoryId.toUpperCase()}</span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                          {cat.count} total · {cat.openCount} open
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Reporter Mobile Numbers + Linked Reports */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Reporter Mobile Numbers &amp; Linked Incident Reports
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Numbers shared by residents for councillor coordination, escalation &amp; fix verification.
                </p>
              </div>
              {analyticsLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700 dark:text-emerald-400 shrink-0" />
              )}
            </div>

            {!analytics || analytics.reportersByMobile.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] text-center text-xs text-slate-600 dark:text-slate-400">
                {analyticsLoading
                  ? 'Loading reporter numbers & linked reports...'
                  : 'No reporter mobile numbers match the current filter.'}
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.reportersByMobile.map((group) => (
                  <article
                    key={group.normalizedMobile}
                    className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.06)] p-4 space-y-3"
                  >
                    {/* Mobile Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600/12 border border-emerald-700/35 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-950 dark:text-white tabular-nums">
                              {group.displayMobile}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              · {group.reporterNames.join(', ')}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums flex flex-wrap gap-x-2.5 gap-y-0.5">
                            <span>{group.reportCount} primary</span>
                            <span>·</span>
                            <span>{group.meTooCount} +1 Me Too</span>
                            <span>·</span>
                            <span>{group.verifyCount} fix checks</span>
                            <span>·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {group.totalPoints} CR ({group.unclaimedPoints} unclaimed)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(group.normalizedMobile)}
                          className="h-8 px-2.5 rounded-lg border border-slate-400 dark:border-white/15 bg-white dark:bg-white/[0.04] text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                        >
                          {copiedPhone === group.normalizedMobile ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openDirectWhatsApp(
                              group.normalizedMobile,
                              `Hi ${group.reporterNames[0] || 'Resident'}, Ward ${activeWard.wardNumber} Councillor Desk contacting you regarding your reported municipal ticket(s): ${group.reports.map((r) => r.reportId).join(', ')}.`
                            )
                          }
                          className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Linked Reports Table/List */}
                    <div className="space-y-1.5">
                      {group.reports.map((rep, idx) => (
                        <div
                          key={`${rep.reportId}-${rep.contributionType}-${idx}`}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] tabular-nums">
                              <span className="font-bold text-slate-950 dark:text-white">
                                {rep.reportId}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 text-[10px] font-semibold">
                                {CONTRIBUTION_LABELS[rep.contributionType]}
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                W{rep.wardNumber} · {rep.categoryId.toUpperCase()}
                              </span>
                              {rep.municipalRef && (
                                <span className="text-slate-600 dark:text-slate-400">
                                  · Ref: {rep.municipalRef}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {rep.title}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                              {rep.address}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 font-mono text-[11px] tabular-nums">
                            <span
                              className={`font-semibold ${
                                rep.status === 'Resolved'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : rep.status === 'Blocked by AI Forensics'
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {rep.status}
                            </span>
                            <span
                              className={
                                rep.pointsClaimed
                                  ? 'text-slate-600 dark:text-slate-400'
                                  : 'text-amber-700 dark:text-amber-400 font-bold'
                              }
                            >
                              +{rep.pointsEarned} CR ({rep.pointsClaimed ? 'Claimed' : 'Pending'})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CouncillorDeskView.displayName = 'CouncillorDeskView';

