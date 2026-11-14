import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  LocateFixed,
  MessageCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { SEED_WARDS } from '../data/civicSeedData';
import type { CivicReport, WardRecord } from '../types/civic';
import { BASEMAP_ORDER, BASEMAPS, osmDirectionsUrl, type BasemapId } from '../utils/mapTiles';
import { openWhatsAppShare } from '../utils/share';
import { resolveWardByCoordinates } from '../utils/wardResolver';
import { InteractiveMap } from './InteractiveMap';
import { RefBadge } from './RefBadge';
import { SlaCountdown } from './SlaCountdown';
import { SmartImage } from './SmartImage';

interface LiveMapViewProps {
  reports: CivicReport[];
  activeWard: WardRecord;
  darkMode: boolean;
  onSelectWard: (wardId: string) => void;
  onCorroborate: (reportId: string) => void;
  onVerifyResolution: (reportId: string) => void;
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
  { color: '#0f172a', label: 'Active' },
  { color: '#059669', label: 'Resolved' },
  { color: '#ea580c', label: 'Critical' },
  { color: '#dc2626', label: 'Blocked' },
] as const;

export const LiveMapView: React.FC<LiveMapViewProps> = React.memo(({
  reports,
  activeWard,
  darkMode,
  onSelectWard,
  onCorroborate,
  onVerifyResolution,
  onOpenReportModal,
}) => {
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: activeWard.lat,
    lng: activeWard.lng,
    zoom: 13,
  });
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(
    reports.find((r) => r.wardId === activeWard.id) ?? reports[0] ?? null
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VERIFIED'>('ALL');
  const [presetIdx, setPresetIdx] = useState(0);
  const [basemap, setBasemap] = useState<BasemapId | undefined>(undefined);

  const visibleReports = useMemo(
    () =>
      reports.filter((r) => {
        if (statusFilter === 'ACTIVE') return r.status !== 'Resolved' && r.status !== 'Blocked by AI Forensics';
        if (statusFilter === 'VERIFIED') return r.forensics.status === 'VERIFIED';
        return true;
      }),
    [reports, statusFilter]
  );

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    const item = METRO_PRESETS[idx];
    if (item.code === 'ACTIVE') {
      setMapFocus({ lat: activeWard.lat, lng: activeWard.lng, zoom: 13 });
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
          setMapFocus({ lat: activeWard.lat, lng: activeWard.lng, zoom: 14 });
        },
        { timeout: 3500 }
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header & Metro Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Live Ward & Fault Map
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ward {activeWard.wardNumber} ({activeWard.suburbs[0]}) · Tap a pin or ward boundary
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset((presetIdx - 1 + METRO_PRESETS.length) % METRO_PRESETS.length)}
            aria-label="Previous metro"
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 transition-transform duration-150"
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
                    : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08]'
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
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Basemap switcher + legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08]"
          role="group"
          aria-label="Basemap style"
        >
          <span className="pl-1.5 pr-0.5 text-slate-400" title="OpenStreetMap basemaps">
            <Layers className="w-3.5 h-3.5" />
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
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {BASEMAPS[id].shortLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          {MAP_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/60"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Viewport-Contained Active Map Frame */}
      <div className="relative h-[calc(100dvh-275px)] min-h-[380px] max-h-[660px] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
            setSelectedReport(rep);
            setMapFocus({ lat: rep.lat, lng: rep.lng, zoom: 14 });
          }}
          onSelectWard={(ward) => {
            onSelectWard(ward.id);
            setMapFocus({ lat: ward.lat, lng: ward.lng, zoom: 13 });
          }}
        />

        {/* Top-Left Map Filter Bar */}
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/12">
          {(['ALL', 'ACTIVE', 'VERIFIED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer transition-colors duration-150 ${
                statusFilter === f
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Top-Right Locate & Quick Report */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateMe}
            title="Center on my GPS location"
            className="min-h-[38px] px-3 rounded-xl bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/12 text-xs font-medium text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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

        {/* Compact Selected Incident Overlay Card */}
        {selectedReport && (
          <div className="absolute bottom-3 left-3 right-14 sm:right-auto sm:w-96 z-[400] rounded-2xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/12 shadow-xl overflow-hidden">
            <div className="flex gap-3 p-3.5">
              <SmartImage
                src={selectedReport.photoUrl}
                alt={selectedReport.title}
                categoryId={selectedReport.categoryId}
                label={selectedReport.categoryId}
                className="w-20 h-20 rounded-xl shrink-0 border border-slate-200/80 dark:border-white/[0.08]"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {selectedReport.id} · Ward {selectedReport.wardNumber} ({selectedReport.suburb})
                    </div>
                    <h2 className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {selectedReport.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    aria-label="Close pin card"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    {selectedReport.forensics.status === 'VERIFIED' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className="truncate">{selectedReport.status}</span>
                  </span>
                  <span className="font-mono tabular-nums flex items-center gap-1 shrink-0">
                    <Users className="w-3 h-3" /> +{selectedReport.clusteredHouseholds}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RefBadge value={selectedReport.municipalRef} />
                  <SlaCountdown report={selectedReport} />
                </div>

                <a
                  href={osmDirectionsUrl(selectedReport.lat, selectedReport.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline tabular-nums"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)} · OpenStreetMap
                  </span>
                </a>
              </div>
            </div>

            {selectedReport.forensics.status !== 'FLAGGED_SYNTHETIC' && (
              <div className="flex items-center gap-2 px-3.5 pb-3.5">
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
                  className="min-h-[34px] px-2.5 rounded-lg border border-slate-200/90 dark:border-white/15 text-[11px] font-semibold text-slate-800 dark:text-white flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCorroborate(selectedReport.id)}
                  className="flex-1 min-h-[34px] rounded-lg border border-slate-200/90 dark:border-white/15 text-[11px] font-semibold text-slate-800 dark:text-white cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  +1 Household
                </button>
                {selectedReport.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => onVerifyResolution(selectedReport.id)}
                    className="flex-1 min-h-[34px] rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Fix</span>
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
