import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  MapPin,
  MessageCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, WardRecord } from '../types/civic';
import { openWhatsAppShare } from '../utils/share';
import { MiniMapPreview } from './MiniMapPreview';
import { RefBadge } from './RefBadge';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';

interface WardFeedViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  onCorroborateReport: (reportId: string) => void;
  onVerifyResolution: (reportId: string) => void;
  onOpenReportModal: () => void;
  onOpenOnMap: () => void;
}

const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export const WardFeedView: React.FC<WardFeedViewProps> = React.memo(({
  reports,
  activeWard,
  onCorroborateReport,
  onVerifyResolution,
  onOpenReportModal,
  onOpenOnMap,
}) => {
  const [scope, setScope] = useState<'all' | 'ward' | 'verified' | 'blocked'>('all');
  const [pageIdx, setPageIdx] = useState(0);

  const counts = useMemo(
    () => ({
      all: reports.length,
      ward: reports.filter((r) => r.wardId === activeWard.id).length,
      verified: reports.filter((r) => r.forensics.status === 'VERIFIED').length,
      blocked: reports.filter((r) => r.forensics.status === 'FLAGGED_SYNTHETIC').length,
    }),
    [reports, activeWard.id]
  );

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (scope === 'ward') return r.wardId === activeWard.id;
        if (scope === 'verified') return r.forensics.status === 'VERIFIED';
        if (scope === 'blocked') return r.forensics.status === 'FLAGGED_SYNTHETIC';
        return true;
      }),
    [reports, scope, activeWard.id]
  );

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(pageIdx, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const handleScopeChange = (nextScope: typeof scope) => {
    setScope(nextScope);
    setPageIdx(0);
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

      {/* Filter Tabs + Page Arrows */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] p-2">
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

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mr-1">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            aria-label="Previous feed page"
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next feed page"
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paged Cards */}
      {pageItems.length === 0 ? (
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
          {pageItems.map((report) => {
            const isBlocked = report.forensics.status === 'FLAGGED_SYNTHETIC';
            const isVerified = report.forensics.status === 'VERIFIED';
            const ward = SEED_WARDS.find((w) => w.id === report.wardId);

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
                        {report.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => onVerifyResolution(report.id)}
                            className="min-h-[34px] px-3 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Fix</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
});

WardFeedView.displayName = 'WardFeedView';
