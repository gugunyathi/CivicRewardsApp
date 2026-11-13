import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  MapPin,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { CivicReport, WardRecord } from '../types/civic';

interface WardFeedViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  onCorroborateReport: (reportId: string) => void;
  onVerifyResolution: (reportId: string) => void;
  onOpenReportModal: () => void;
  onOpenOnMap: () => void;
}

export const WardFeedView: React.FC<WardFeedViewProps> = ({
  reports,
  activeWard,
  onCorroborateReport,
  onVerifyResolution,
  onOpenReportModal,
  onOpenOnMap,
}) => {
  const [scope, setScope] = useState<'all' | 'ward' | 'verified' | 'blocked'>('all');
  const [pageIdx, setPageIdx] = useState(0);

  const filtered = reports.filter((r) => {
    if (scope === 'ward') return r.wardId === activeWard.id;
    if (scope === 'verified') return r.forensics.status === 'VERIFIED';
    if (scope === 'blocked') return r.forensics.status === 'FLAGGED_SYNTHETIC';
    return true;
  });

  // Paginate 2 cards per page on desktop, 1 card per page on mobile (via clean prev/next arrows so zero endless scroll!)
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
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Live Forensic Ward Feed
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paged incident cards · EXIF & Gemini Vision verified
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOnMap}
            className="min-h-[36px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0A0E17] text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-[40px] px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/25"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>REPORT</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs + Page Arrows */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 dark:border-white/12 py-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `All (${reports.length})` },
              {
                id: 'ward',
                label: `Ward ${activeWard.wardNumber} (${reports.filter((r) => r.wardId === activeWard.id).length})`,
              },
              {
                id: 'verified',
                label: `Verified (${reports.filter((r) => r.forensics.status === 'VERIFIED').length})`,
              },
              {
                id: 'blocked',
                label: `Blocked (${reports.filter((r) => r.forensics.status === 'FLAGGED_SYNTHETIC').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleScopeChange(tab.id)}
              className={`min-h-[34px] px-3 text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
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
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            aria-label="Previous feed page"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next feed page"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paged Cards */}
      {pageItems.length === 0 ? (
        <div className="p-8 border border-slate-200 dark:border-white/12 bg-white dark:bg-[#0A0E17] text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">No reports in this filter view.</p>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-[44px] px-5 bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold uppercase tracking-wider cursor-pointer"
          >
            REPORT FAULT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pageItems.map((report) => {
            const isBlocked = report.forensics.status === 'FLAGGED_SYNTHETIC';
            const isVerified = report.forensics.status === 'VERIFIED';

            return (
              <article
                key={report.id}
                className="border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0A0E17] overflow-hidden flex flex-col"
              >
                {report.photoUrl && (
                  <div className="relative h-44 sm:h-48 bg-slate-900 overflow-hidden">
                    <img
                      src={report.photoUrl}
                      alt={report.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between gap-2 text-white">
                      <span className="font-mono text-[11px]">
                        {report.id} · {report.municipalRef || 'NO REF'}
                      </span>
                      <span className="text-xs font-semibold">{report.status}</span>
                    </div>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {report.municipalityCode} Ward {report.wardNumber} · {report.suburb}
                      </span>
                      <span aria-hidden="true">/</span>
                      <span>{report.departmentLabel}</span>
                      <span aria-hidden="true">/</span>
                      <span className="font-mono">{report.timeAgoLabel}</span>
                    </div>

                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white leading-snug">
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
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span>+{report.clusteredHouseholds} Households</span>
                    </div>

                    {!isBlocked && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCorroborateReport(report.id)}
                          className="min-h-[34px] px-2.5 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          +1 Me Too
                        </button>
                        {report.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => onVerifyResolution(report.id)}
                            className="min-h-[34px] px-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
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
};
