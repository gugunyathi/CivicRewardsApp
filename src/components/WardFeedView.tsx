import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileWarning,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, WardRecord } from '../types/civic';
import { openWhatsAppShare } from '../utils/share';
import { VERIFY_FIX_POINTS, getVerificationWindowState } from '../utils/verificationWindow';
import { MiniMapPreview } from './MiniMapPreview';
import { RefBadge } from './RefBadge';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';

interface WardFeedViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  verifiedFixIds: string[];
  onCorroborateReport: (reportId: string) => void;
  onVerifyResolution: (reportId: string, report?: CivicReport) => void;
  onOpenReportModal: () => void;
  onOpenOnMap: () => void;
}

const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export const WardFeedView: React.FC<WardFeedViewProps> = React.memo(({
  reports,
  activeWard,
  verifiedFixIds,
  onCorroborateReport,
  onVerifyResolution,
  onOpenReportModal,
  onOpenOnMap,
}) => {
  const [scope, setScope] = useState<'all' | 'ward' | 'verified' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(6);

  const counts = useMemo(
    () => ({
      all: reports.length,
      ward: reports.filter((r) => r.wardId === activeWard.id).length,
      verified: reports.filter((r) => r.forensics.status === 'VERIFIED').length,
      blocked: reports.filter((r) => r.forensics.status === 'FLAGGED_SYNTHETIC').length,
    }),
    [reports, activeWard.id]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (scope === 'ward' && r.wardId !== activeWard.id) return false;
      if (scope === 'verified' && r.forensics.status !== 'VERIFIED') return false;
      if (scope === 'blocked' && r.forensics.status !== 'FLAGGED_SYNTHETIC') return false;
      if (!q) return true;
      const hay = [
        r.id,
        r.title,
        r.description,
        r.address,
        r.suburb,
        r.departmentLabel,
        r.assignedDepot,
        r.municipalRef ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reports, scope, activeWard.id, searchQuery]);

  const visibleItems = filtered.slice(0, visibleLimit);
  const remainingCount = Math.max(0, filtered.length - visibleItems.length);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasActiveVerifyWindow = useMemo(
    () =>
      visibleItems.some((r) => getVerificationWindowState(r, verifiedFixIds, nowMs).withinWindow),
    [visibleItems, verifiedFixIds, nowMs]
  );

  useEffect(() => {
    if (!hasActiveVerifyWindow) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveVerifyWindow]);

  const handleScopeChange = (nextScope: typeof scope) => {
    setScope(nextScope);
    setVisibleLimit(6);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Live Ward Feed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verified ward incidents · Ward {activeWard.wardNumber}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOnMap}
            className="min-h-[38px] px-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] hover:border-slate-300 text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[border-color,transform] duration-150"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-[40px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>REPORT</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs + Instant Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'ward', label: `Ward ${activeWard.wardNumber} (${counts.ward})` },
              { id: 'verified', label: `Verified (${counts.verified})` },
              { id: 'blocked', label: `Blocked (${counts.blocked})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleScopeChange(tab.id)}
              className={`min-h-[34px] px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 tabular-nums ${
                scope === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleLimit(6);
            }}
            placeholder="Search street, fault, or ref # (e.g. CPWEB)..."
            aria-label="Search ward reports"
            className="w-full h-9 pl-8 pr-8 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 transition-[border-color,box-shadow,background-color] duration-150"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Grid */}
      {visibleItems.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">No reports match this filter.</p>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            REPORT FAULT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleItems.map((report) => {
            const isBlocked = report.forensics.status === 'FLAGGED_SYNTHETIC';
            const isVerified = report.forensics.status === 'VERIFIED';
            const ward = SEED_WARDS.find((w) => w.id === report.wardId);
            const verifyState = getVerificationWindowState(report, verifiedFixIds, nowMs);

            return (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col"
              >
                <div className="relative h-44 sm:h-48 bg-slate-900 overflow-hidden">
                  <SmartImage
                    src={report.photoUrl}
                    alt={report.title}
                    categoryId={report.categoryId}
                    label={`${report.departmentLabel} · ${report.suburb}`}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                    <span className="font-mono text-[11px] tabular-nums">
                      {report.id} · {report.municipalRef || 'Pending Ref'}
                    </span>
                    <span className="text-xs font-semibold">{report.status}</span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {report.municipalityCode} Ward {report.wardNumber} · {report.suburb}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{report.departmentLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{report.timeAgoLabel}</span>
                    </div>

                    <h2 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                      {report.title}
                    </h2>

                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        isVerified
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isBlocked
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isVerified && <ShieldCheck className="w-4 h-4 shrink-0" />}
                      {isBlocked && <ShieldAlert className="w-4 h-4 shrink-0" />}
                      {!isVerified && !isBlocked && <FileWarning className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{report.forensics.summaryLabel}</span>
                    </div>

                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {report.forensics.timestampLabel} · {report.forensics.gpsMatchLabel}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <RefBadge value={report.municipalRef} />
                      <SlaCountdown report={report} />
                    </div>

                    {verifyState.isRestored && verifyState.withinWindow && (
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-600/10 border border-emerald-600/20 rounded-lg px-2.5 py-1.5 tabular-nums">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {verifyState.alreadyVerifiedByUser
                              ? `Restored · Verified (+${VERIFY_FIX_POINTS} CR)`
                              : `Restored · Verify fix for +${VERIFY_FIX_POINTS} CR`}
                          </span>
                        </span>
                        <span className="font-mono font-semibold shrink-0">
                          {verifyState.remainingLabel}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3 items-stretch pt-1">
                      <MiniMapPreview
                        lat={report.lat}
                        lng={report.lng}
                        zoom={14}
                        darkMode={isDarkTheme()}
                        label={`${report.lat.toFixed(3)}, ${report.lng.toFixed(3)}`}
                        pinColor={isBlocked ? '#dc2626' : isVerified ? '#059669' : '#0f172a'}
                        className="w-32 h-20 shrink-0 border border-slate-200/80 dark:border-white/[0.08]"
                        onExpand={onOpenOnMap}
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{report.address}</span>
                        </span>
                        <button
                          type="button"
                          onClick={onOpenOnMap}
                          className="self-start font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Open on live map →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>+{report.clusteredHouseholds} Households</span>
                    </div>

                    {!isBlocked && (
                      <div className="flex items-center gap-1.5">
                        {ward && (
                          <button
                            type="button"
                            onClick={() =>
                              openWhatsAppShare(
                                report,
                                {
                                  wardLabel: `${report.municipalityCode} Ward ${report.wardNumber} (${report.suburb})`,
                                  councillorName: ward.councillor.name,
                                },
                                ward.councillor.whatsappEscalation
                              )
                            }
                            title="Share report to WhatsApp"
                            className="min-h-[34px] px-2.5 rounded-lg border border-slate-200/90 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Share</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onCorroborateReport(report.id)}
                          className="min-h-[34px] px-2.5 rounded-lg border border-slate-200/90 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                        >
                          +1 Me Too
                        </button>
                        {verifyState.canVerify ? (
                          <button
                            type="button"
                            onClick={() => onVerifyResolution(report.id, report)}
                            className="min-h-[34px] px-3 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Fix (+{VERIFY_FIX_POINTS} CR)</span>
                          </button>
                        ) : verifyState.alreadyVerifiedByUser && verifyState.withinWindow ? (
                          <span className="min-h-[34px] px-2.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified (+{VERIFY_FIX_POINTS} CR)</span>
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {remainingCount > 0 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setVisibleLimit((n) => n + 6)}
            className="min-h-[40px] px-5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-[border-color,transform] duration-150 tabular-nums"
          >
            Show more ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
});

WardFeedView.displayName = 'WardFeedView';
