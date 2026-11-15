import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  LocateFixed,
  MessageCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, ReportStatus, WardRecord } from '../types/civic';
import { BASEMAP_ORDER, BASEMAPS, osmDirectionsUrl, type BasemapId } from '../utils/mapTiles';
import { openWhatsAppShare } from '../utils/share';
import { VERIFY_FIX_POINTS, getVerificationWindowState } from '../utils/verificationWindow';
import { resolveWardByCoordinates } from '../utils/wardResolver';
import { InteractiveMap, getReportPinColor } from './InteractiveMap';
import { RefBadge } from './RefBadge';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';

interface LiveMapViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  darkMode: boolean;
  verifiedFixIds: string[];
  onSelectWard: (wardId: string) => void;
  onCorroborate: (reportId: string) => boolean;
  onVerifyResolution: (reportId: string, report?: CivicReport) => boolean;
  onOpenReportModal: () => void;
}

const METRO_PRESETS = [
  { label: 'My Ward', code: 'ACTIVE' },
  { label: 'Johannesburg', code: 'CoJ', lat: -26.0531, lng: 28.0069, zoom: 11 },
  { label: 'Cape Town', code: 'CoCT', lat: -33.948, lng: 18.426, zoom: 11 },
  { label: 'Tshwane', code: 'CoT', lat: -25.805, lng: 28.226, zoom: 11 },
  { label: 'eThekwini', code: 'eThekwini', lat: -29.776, lng: 31.05, zoom: 11 },
] as const;

const MAP_LEGEND = [
  { color: '#ef4444', label: 'Pending' },
  { color: '#f97316', label: 'Escalated' },
  { color: '#10b981', label: 'Resolved' },
] as const;

type MapStatusFilter = 'all' | 'pending' | 'escalated' | 'resolved';

const STATUS_FILTER_PILLS: Array<{ value: MapStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

function getWardMapFocus(ward: WardRecord) {
  if (ward.id === 'CoJ-115') {
    return { lat: -26.024, lng: 28.011, zoom: 13 };
  }
  return { lat: ward.lat, lng: ward.lng, zoom: 13 };
}

function getBucket(status: ReportStatus): Exclude<MapStatusFilter, 'all'> {
  if (status === 'Resolved') return 'resolved';
  if (status === 'Escalated to Depot' || status === 'Technician Dispatched') return 'escalated';
  return 'pending';
}

export const LiveMapView: React.FC<LiveMapViewProps> = React.memo(({
  reports,
  activeWard,
  darkMode,
  verifiedFixIds,
  onSelectWard,
  onCorroborate,
  onVerifyResolution,
  onOpenReportModal,
}) => {
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number }>(() =>
    getWardMapFocus(activeWard)
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MapStatusFilter>('all');
  const [presetIdx, setPresetIdx] = useState(0);
  const [basemap, setBasemap] = useState<BasemapId | undefined>(undefined);

  const [ward115Pins, setWard115Pins] = useState<CivicReport[]>([]);
  const [ward115Stats, setWard115Stats] = useState<{ pinnedTotal: number; unmappedCount: number } | null>(null);
  const [loadingWard115, setLoadingWard115] = useState(false);

  // Local instant UI overrides for live pins when user clicks +1 Me Too or Verify Fix
  const [pinOverrides, setPinOverrides] = useState<
    Record<string, { status?: ReportStatus; resolvedAtIso?: string; addedHouseholds?: number; addedVerified?: number }>
  >({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (presetIdx === 0) {
      setMapFocus(getWardMapFocus(activeWard));
    }
  }, [activeWard, presetIdx]);

  useEffect(() => {
    let cancelled = false;
    setLoadingWard115(true);
    fetch('/api/ward115/map')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.pins) && data.pins.length > 0) {
          setWard115Pins(data.pins as CivicReport[]);
          setWard115Stats({
            pinnedTotal: Number(data.pinnedTotal ?? data.pins.length),
            unmappedCount: Number(data.unmappedCount ?? 0),
          });
        }
      })
      .catch(() => {
        // Silent fallback to local seeded Ward 115 pins
      })
      .finally(() => {
        if (!cancelled) setLoadingWard115(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedReportId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReportId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReportId]);

  const mergedReports = useMemo(() => {
    const map = new Map<string, CivicReport>();
    for (const r of ward115Pins) {
      map.set(r.id, r);
    }
    for (const r of reports) {
      map.set(r.id, r);
    }
    return Array.from(map.values()).map((r) => {
      const ov = pinOverrides[r.id];
      if (!ov) return r;
      return {
        ...r,
        status: ov.status ?? r.status,
        resolvedAtIso: ov.resolvedAtIso ?? r.resolvedAtIso,
        clusteredHouseholds: r.clusteredHouseholds + (ov.addedHouseholds ?? 0),
        verifiedByResidents: r.verifiedByResidents + (ov.addedVerified ?? 0),
      };
    });
  }, [reports, ward115Pins, pinOverrides]);

  const visibleReports = useMemo(
    () =>
      mergedReports.filter((r) => {
        if (statusFilter === 'all') return true;
        return getBucket(r.status) === statusFilter;
      }),
    [mergedReports, statusFilter]
  );

  const selectedReport = useMemo(
    () => (selectedReportId ? visibleReports.find((r) => r.id === selectedReportId) ?? null : null),
    [visibleReports, selectedReportId]
  );

  const selectedVerifyState = useMemo(
    () => (selectedReport ? getVerificationWindowState(selectedReport, verifiedFixIds, nowMs) : null),
    [selectedReport, verifiedFixIds, nowMs]
  );

  useEffect(() => {
    if (!selectedVerifyState?.withinWindow) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [selectedVerifyState?.withinWindow]);

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    const item = METRO_PRESETS[idx];
    if (item.code === 'ACTIVE') {
      setMapFocus(getWardMapFocus(activeWard));
    } else {
      setMapFocus({ lat: item.lat, lng: item.lng, zoom: item.zoom });
    }
  };

  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { ward } = resolveWardByCoordinates(pos.coords.latitude, pos.coords.longitude);
          onSelectWard(ward.id);
          setMapFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 14 });
        },
        () => {
          setMapFocus(getWardMapFocus(activeWard));
        },
        { timeout: 3500 }
      );
    }
  };

  const handlePinCorroborate = (reportId: string) => {
    const ok = onCorroborate(reportId);
    if (!ok) return;
    setPinOverrides((prev) => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        addedHouseholds: (prev[reportId]?.addedHouseholds ?? 0) + 1,
      },
    }));
  };

  const handlePinVerify = (report: CivicReport) => {
    const ok = onVerifyResolution(report.id, report);
    if (!ok) return;
    const nowIso = new Date().toISOString();
    setPinOverrides((prev) => ({
      ...prev,
      [report.id]: {
        ...prev[report.id],
        status: 'Resolved',
        resolvedAtIso: report.resolvedAtIso ?? prev[report.id]?.resolvedAtIso ?? nowIso,
        addedVerified: (prev[report.id]?.addedVerified ?? 0) + 1,
      },
    }));
  };

  const wardVisibleCount = useMemo(
    () =>
      activeWard.id === 'CoJ-115' && ward115Stats
        ? ward115Stats.pinnedTotal + reports.filter((r) => r.wardId === 'CoJ-115').length
        : visibleReports.length,
    [activeWard.id, ward115Stats, reports, visibleReports.length]
  );

  return (
    <div className="space-y-3">
      {/* Compact Header & Metro Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ward {activeWard.wardNumber} — Live Map
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {activeWard.suburbs[0]} · Tap any green, orange, or red pin to inspect, +1 Me Too, or verify fix
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset((presetIdx - 1 + METRO_PRESETS.length) % METRO_PRESETS.length)}
            aria-label="Previous metro"
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {METRO_PRESETS.map((preset, idx) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => handlePreset(idx)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors duration-150 cursor-pointer ${
                  presetIdx === idx
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                    : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/[0.08]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handlePreset((presetIdx + 1) % METRO_PRESETS.length)}
            aria-label="Next metro"
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Basemap switcher + Pin counts */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08]"
          role="group"
          aria-label="Mapbox basemap style"
        >
          <span className="pl-1.5 pr-1 text-slate-700 dark:text-slate-400 flex items-center gap-1 text-[10px] font-mono font-semibold" title="Mapbox Styles">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mapbox</span>
          </span>
          {BASEMAP_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              title={BASEMAPS[id].label}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer transition-colors duration-150 ${
                (basemap ?? (darkMode ? 'dark' : 'streets')) === id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {BASEMAPS[id].shortLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          {MAP_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-white/70 shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Viewport-Contained Live Map Frame (Signal Desk Ward 115 style) */}
      <div className="relative h-[calc(100dvh-248px)] min-h-[430px] max-h-[680px] rounded-2xl border border-slate-300 dark:border-white/[0.08] overflow-hidden bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <InteractiveMap
          centerLat={mapFocus.lat}
          centerLng={mapFocus.lng}
          zoom={mapFocus.zoom}
          darkMode={darkMode}
          basemap={basemap}
          mode="explorer"
          className="w-full h-full"
          reports={visibleReports}
          wards={SEED_WARDS}
          selectedReportId={selectedReport?.id ?? null}
          onSelectReport={(rep) => {
            setSelectedReportId(rep.id);
            setMapFocus({ lat: rep.lat, lng: rep.lng, zoom: 14 });
          }}
          onSelectWard={(ward) => {
            onSelectWard(ward.id);
            setSelectedReportId(null);
            setMapFocus(getWardMapFocus(ward));
          }}
          onClearSelection={() => setSelectedReportId(null)}
        />

        {/* Top-Left Signal Desk Ward Live Map Overlay + Status Filter Pills */}
        <div className="absolute top-3 left-3 z-[400] max-w-[calc(100%-150px)] rounded-xl bg-slate-950/85 text-white backdrop-blur-md border border-white/15 px-3 py-2 space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-tight text-white">
              Ward {activeWard.wardNumber} — Live Map
            </span>
            {loadingWard115 && (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-400 shrink-0" />
            )}
          </div>
          <div className="text-[10px] font-mono text-white/60 tabular-nums">
            {wardVisibleCount.toLocaleString()} pinned
            {activeWard.id === 'CoJ-115' && ward115Stats && ward115Stats.unmappedCount > 0
              ? ` · +${ward115Stats.unmappedCount.toLocaleString()} unmapped`
              : ''}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_FILTER_PILLS.map((pill) => {
              const active = statusFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatusFilter(pill.value)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'bg-transparent border-white/15 text-white/75 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top-Right Locate & Quick Report */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateMe}
            title="Center on my GPS location"
            className="min-h-[38px] px-3 rounded-xl bg-white/95 dark:bg-[#0B0F17]/90 backdrop-blur-md border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150 shadow-sm"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline">My GPS</span>
          </button>

          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-[40px] px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>REPORT</span>
          </button>
        </div>

        {/* Pin Popup Preview Card (only shown when a user clicks a pin) */}
        {selectedReport && (
          <div
            role="dialog"
            aria-label={`Report preview ${selectedReport.id}`}
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[376px] z-[500] rounded-2xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border border-slate-300 dark:border-white/15 shadow-2xl overflow-hidden ui-modal-enter"
          >
            <div className="flex items-start gap-3 p-3">
              <SmartImage
                src={selectedReport.photoUrl}
                alt={selectedReport.title}
                categoryId={selectedReport.categoryId}
                label={selectedReport.categoryId}
                className="w-20 h-20 rounded-xl shrink-0 border border-slate-300 dark:border-white/[0.08]"
                imgClassName="w-full h-full object-cover"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getReportPinColor(selectedReport) }}
                      />
                      <span>{selectedReport.id}</span>
                      <span>·</span>
                      <span className="truncate">Ward {selectedReport.wardNumber} ({selectedReport.suburb})</span>
                    </div>
                    <h2 className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {selectedReport.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(null)}
                    aria-label="Close pin popup"
                    className="p-1 rounded-lg text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 min-w-0">
                    {selectedReport.forensics.status === 'VERIFIED' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-500 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0" />
                    )}
                    <span className="truncate font-medium">{selectedReport.status}</span>
                  </span>
                  <span className="font-mono tabular-nums flex items-center gap-1 shrink-0 font-semibold">
                    <Users className="w-3 h-3" /> +{selectedReport.clusteredHouseholds}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <RefBadge value={selectedReport.municipalRef} />
                  <SlaCountdown report={selectedReport} />
                </div>

                {selectedVerifyState?.isRestored && selectedVerifyState.withinWindow && (
                  <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-600/12 border border-emerald-600/35 rounded-lg px-2 py-1 tabular-nums">
                    <span className="flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        {selectedVerifyState.alreadyVerifiedByUser
                          ? `Verified (+${VERIFY_FIX_POINTS} CR)`
                          : `Verify fix (+${VERIFY_FIX_POINTS} CR)`}
                      </span>
                    </span>
                    <span className="font-mono font-semibold shrink-0">
                      {selectedVerifyState.remainingLabel}
                    </span>
                  </div>
                )}

                <a
                  href={osmDirectionsUrl(selectedReport.lat, selectedReport.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline tabular-nums"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)} · Directions
                  </span>
                </a>
              </div>
            </div>

            {selectedReport.forensics.status !== 'FLAGGED_SYNTHETIC' && (
              <div className="flex items-center gap-2 px-3 pb-3 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const w =
                      SEED_WARDS.find((x) => x.id === selectedReport.wardId) ?? activeWard;
                    openWhatsAppShare(
                      selectedReport,
                      {
                        wardLabel: `${selectedReport.municipalityCode} Ward ${selectedReport.wardNumber} (${selectedReport.suburb})`,
                        councillorName: w.councillor.name,
                      },
                      w.councillor.whatsappEscalation
                    );
                  }}
                  title="Share report to WhatsApp"
                  className="min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePinCorroborate(selectedReport.id)}
                  className="flex-1 min-h-[36px] px-2.5 rounded-xl border border-emerald-700/45 dark:border-emerald-400/35 bg-emerald-600/12 text-emerald-800 dark:text-emerald-300 text-xs font-bold cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  +1 Me Too ({selectedReport.clusteredHouseholds})
                </button>
                {selectedVerifyState?.canVerify && (
                  <button
                    type="button"
                    onClick={() => handlePinVerify(selectedReport)}
                    className="flex-1 min-h-[36px] px-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Fix (+{VERIFY_FIX_POINTS} CR)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

LiveMapView.displayName = 'LiveMapView';
