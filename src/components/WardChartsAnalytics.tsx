import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  ExternalLink,
  FileCheck2,
  Loader2,
  MapPin,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import type {
  CivicReport,
  SignalDeskWardAnalytics,
  WardRecord,
} from '../types/civic';
import { civicApi } from '../utils/civicApi';

interface WardChartsAnalyticsProps {
  activeWard: WardRecord;
  reports: CivicReport[];
  darkMode: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  water: 'Water',
  city_power: 'City Power',
  electricity: 'Electricity',
  eskom: 'Eskom',
  refuse: 'Refuse',
  roads: 'Roads',
  safety: 'Safety',
  billing: 'Billing',
  parks: 'Parks',
  sanitation: 'Sanitation',
  streetlights: 'Lighting',
  other: 'Other',
};

const LIGHT_PALETTE = [
  '#0284C7',
  '#D97706',
  '#059669',
  '#7C3AED',
  '#CA8A04',
  '#E11D48',
  '#0D9488',
  '#4F46E5',
  '#475569',
];

const DARK_PALETTE = [
  '#38BDF8',
  '#FBBF24',
  '#34D399',
  '#C084FC',
  '#FACC15',
  '#FB7185',
  '#2DD4BF',
  '#818CF8',
  '#94A3B8',
];

function formatCategoryName(raw: string): string {
  const key = raw.toLowerCase();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatMonthShort(ym: string): string {
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!Number.isInteger(idx) || idx < 0 || idx > 11) return ym;
  return `${names[idx]} '${y?.slice(2) ?? ''}`;
}

function formatDayShort(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function buildLocalAnalyticsFromReports(
  reports: CivicReport[],
  wardNumber: number
): SignalDeskWardAnalytics {
  const scoped = reports.filter((r) => r.wardNumber === wardNumber);
  const sourceList = scoped.length > 0 ? scoped : reports;

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySuburb: Record<string, number> = {};
  const resolutionAccum: Record<string, { sum: number; count: number }> = {};
  const timeOfDayMap = new Map<number, number>();
  const streetMap = new Map<string, number>();

  let resolvedCount = 0;
  let openCount = 0;
  let withRef = 0;
  let withoutRef = 0;
  const refByCategory: Record<string, { withRef: number; withoutRef: number }> = {};

  for (const r of sourceList) {
    const cat = r.categoryId || 'other';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const sub = r.suburb || 'Unspecified';
    bySuburb[sub] = (bySuburb[sub] ?? 0) + 1;

    if (!refByCategory[cat]) refByCategory[cat] = { withRef: 0, withoutRef: 0 };
    if (r.municipalRef) {
      withRef += 1;
      refByCategory[cat].withRef += 1;
    } else {
      withoutRef += 1;
      refByCategory[cat].withoutRef += 1;
    }

    if (r.status === 'Resolved') {
      resolvedCount += 1;
      if (!resolutionAccum[cat]) resolutionAccum[cat] = { sum: 0, count: 0 };
      resolutionAccum[cat].sum += Math.max(1, r.slaElapsedHours || 8);
      resolutionAccum[cat].count += 1;
    } else {
      openCount += 1;
    }

    const dt = new Date(r.createdAtIso);
    const hr = Number.isFinite(dt.getTime()) ? dt.getHours() : 12;
    timeOfDayMap.set(hr, (timeOfDayMap.get(hr) ?? 0) + 1);

    const street = r.address.split(',')[0]?.trim();
    if (street) streetMap.set(street, (streetMap.get(street) ?? 0) + 1);
  }

  const total = sourceList.length;
  const timeOfDay = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: timeOfDayMap.get(hour) ?? 0,
  }));

  const resolutionByCategory = Object.entries(resolutionAccum).map(([category, v]) => ({
    category,
    hours: Math.round(v.sum / Math.max(1, v.count)),
  }));

  const avgRes =
    resolutionByCategory.length > 0
      ? Math.round(
          resolutionByCategory.reduce((s, r) => s + r.hours, 0) / resolutionByCategory.length
        )
      : 18;

  const hotspotStreets = Array.from(streetMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([street, count]) => ({ street, count }));

  const todayIso = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    source: 'local-fallback',
    wardNumber,
    fetchedAtIso: new Date().toISOString(),
    total,
    byStatus,
    byCategory,
    bySuburb,
    byMonth: { [todayIso.slice(0, 7)]: total },
    daily: [{ date: todayIso, count: total }],
    weeklyTrend: [{ week: 'Current', count: total }],
    timeOfDay,
    resolutionByCategory,
    providerResponse: [],
    hotspotStreets,
    openVsResolved: { open: openCount, resolved: resolvedCount },
    avgResolutionHours: avgRes,
    avgDaysOpen: 2.5,
    reference: {
      withRef,
      withoutRef,
      pctWithRef: total > 0 ? Math.round((withRef / total) * 100) : 0,
      byCategory: refByCategory,
    },
  };
}

export const WardChartsAnalytics: React.FC<WardChartsAnalyticsProps> = ({
  activeWard,
  reports,
  darkMode,
}) => {
  const [sourceMode, setSourceMode] = useState<'signal-desk' | 'local'>(
    activeWard.wardNumber === 115 ? 'signal-desk' : 'signal-desk'
  );
  const [remoteData, setRemoteData] = useState<SignalDeskWardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive chart inspection indices
  const [activeDailyIdx, setActiveDailyIdx] = useState<number | null>(null);
  const [activeWeeklyIdx, setActiveWeeklyIdx] = useState<number | null>(null);
  const [activeHourIdx, setActiveHourIdx] = useState<number | null>(null);
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [activeResolutionCat, setActiveResolutionCat] = useState<string | null>(null);

  const loadRemoteAnalytics = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await civicApi.fetchSignalDeskAnalytics(115, forceRefresh);
      setRemoteData(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch Signal Desk Ward 115 analytics.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRemoteAnalytics(false);
  }, [loadRemoteAnalytics]);

  const localSnapshot = useMemo(
    () => buildLocalAnalyticsFromReports(reports, activeWard.wardNumber),
    [reports, activeWard.wardNumber]
  );

  const data: SignalDeskWardAnalytics =
    sourceMode === 'local'
      ? localSnapshot
      : remoteData && remoteData.ok
        ? remoteData
        : localSnapshot;

  const palette = darkMode ? DARK_PALETTE : LIGHT_PALETTE;
  const axisColor = darkMode ? '#94A3B8' : '#334155';
  const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const primaryAccent = darkMode ? '#34D399' : '#059669';
  const secondaryAccent = darkMode ? '#38BDF8' : '#0284C7';
  const tertiaryAccent = darkMode ? '#A78BFA' : '#7C3AED';
  const amberAccent = darkMode ? '#FBBF24' : '#D97706';

  const categoryRows = useMemo(() => {
    const entries = Object.entries(data.byCategory || {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    const totalSum = Math.max(
      1,
      entries.reduce((acc, [, v]) => acc + v, 0)
    );
    return entries.map(([key, value], idx) => ({
      key,
      label: formatCategoryName(key),
      value,
      pct: Math.round((value / totalSum) * 100),
      color: palette[idx % palette.length],
    }));
  }, [data.byCategory, palette]);

  const monthRows = useMemo(
    () =>
      Object.entries(data.byMonth || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, label: formatMonthShort(month), count })),
    [data.byMonth]
  );

  const dailyRows = data.daily ?? [];
  const weeklyRows = data.weeklyTrend ?? [];
  const timeOfDayRows = data.timeOfDay ?? [];

  const resolutionRows = useMemo(
    () =>
      [...(data.resolutionByCategory || [])]
        .filter((r) => r.hours > 0)
        .sort((a, b) => a.hours - b.hours),
    [data.resolutionByCategory]
  );

  const topSuburbs = useMemo(
    () =>
      Object.entries(data.bySuburb || {})
        .filter(([name, count]) => {
          const clean = name.trim().toLowerCase();
          return count > 0 && clean !== 'unknown' && clean !== 'unspecified' && clean !== 'other';
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7),
    [data.bySuburb]
  );

  const hotspotRows = useMemo(
    () =>
      (data.hotspotStreets || [])
        .filter((s) => s.street && !s.street.toLowerCase().includes('not clearly visible'))
        .slice(0, 7),
    [data.hotspotStreets]
  );

  const resolutionRatePct =
    data.total > 0
      ? Math.round(((data.openVsResolved?.resolved ?? 0) / data.total) * 100)
      : 0;

  const topCategory = categoryRows[0];

  // SVG Donut Geometry helper for Category Breakdown
  const categoryArcs = useMemo(() => {
    const total = Math.max(
      1,
      categoryRows.reduce((s, r) => s + r.value, 0)
    );
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return categoryRows.map((row) => {
      const length = (row.value / total) * circumference;
      const arc = {
        ...row,
        dashArray: `${Math.max(0, length - 1.5)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += length;
      return arc;
    });
  }, [categoryRows]);

  const selectedCategory =
    categoryRows.find((r) => r.key === activeCategoryKey) ?? categoryRows[0] ?? null;

  // Open vs Resolved Donut Geometry
  const openVal = data.openVsResolved?.open ?? 0;
  const resolvedVal = data.openVsResolved?.resolved ?? 0;
  const openResolvedTotal = Math.max(1, openVal + resolvedVal);
  const splitRadius = 46;
  const splitCircumference = 2 * Math.PI * splitRadius;
  const resolvedDash = (resolvedVal / openResolvedTotal) * splitCircumference;
  const openDash = (openVal / openResolvedTotal) * splitCircumference;

  // Area Chart Builder helper
  const renderAreaSvg = (
    points: Array<{ label: string; value: number }>,
    strokeColor: string,
    gradientId: string,
    activeIdx: number | null,
    onSelect: (idx: number | null) => void
  ) => {
    if (points.length === 0) {
      return (
        <div className="py-10 text-center text-xs text-slate-600 dark:text-slate-400">
          No trend data recorded yet.
        </div>
      );
    }

    const W = 540;
    const H = 190;
    const padL = 34;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxV = Math.max(1, ...points.map((p) => p.value));

    const coords = points.map((p, idx) => {
      const x =
        points.length === 1
          ? padL + plotW / 2
          : padL + (idx / (points.length - 1)) * plotW;
      const y = padT + plotH - (p.value / maxV) * plotH;
      return { x, y, ...p };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.5, 1].map((frac) => ({
      y: padT + plotH - frac * plotH,
      val: Math.round(frac * maxV),
    }));

    const xLabelStep = Math.max(1, Math.ceil(coords.length / 5));

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Trend line chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={darkMode ? 0.28 : 0.22} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={t.y}
              y2={t.y}
              stroke={gridColor}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={t.y + 3}
              textAnchor="end"
              fill={axisColor}
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {t.val}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((c, idx) => {
          const isHighlighted = activeIdx === idx;
          const showLabel = idx % xLabelStep === 0 || idx === coords.length - 1;
          return (
            <g key={`${c.label}-${idx}`}>
              {showLabel && (
                <text
                  x={c.x}
                  y={H - 6}
                  textAnchor="middle"
                  fill={axisColor}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  {c.label}
                </text>
              )}

              {isHighlighted && (
                <line
                  x1={c.x}
                  x2={c.x}
                  y1={padT}
                  y2={padT + plotH}
                  stroke={strokeColor}
                  strokeOpacity={0.45}
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              )}

              <circle
                cx={c.x}
                cy={c.y}
                r={isHighlighted ? 5 : 3}
                fill={isHighlighted ? strokeColor : darkMode ? '#111827' : '#FFFFFF'}
                stroke={strokeColor}
                strokeWidth={2}
              />

              {/* Wide invisible tap/hover column */}
              <rect
                x={c.x - plotW / Math.max(1, coords.length * 2)}
                y={padT}
                width={plotW / Math.max(1, coords.length)}
                height={plotH + 16}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => onSelect(idx)}
                onMouseLeave={() => onSelect(null)}
                onClick={() => onSelect(activeIdx === idx ? null : idx)}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const hoveredDaily =
    activeDailyIdx !== null && dailyRows[activeDailyIdx]
      ? dailyRows[activeDailyIdx]
      : dailyRows[dailyRows.length - 1] ?? null;

  const hoveredWeekly =
    activeWeeklyIdx !== null && weeklyRows[activeWeeklyIdx]
      ? weeklyRows[activeWeeklyIdx]
      : weeklyRows[weeklyRows.length - 1] ?? null;

  const peakHour = useMemo(() => {
    if (timeOfDayRows.length === 0) return null;
    return [...timeOfDayRows].sort((a, b) => b.count - a.count)[0];
  }, [timeOfDayRows]);

  const activeHourItem =
    activeHourIdx !== null && timeOfDayRows[activeHourIdx]
      ? timeOfDayRows[activeHourIdx]
      : peakHour;

  const activeMonthItem =
    monthRows.find((m) => m.month === activeMonthKey) ??
    monthRows[monthRows.length - 1] ??
    null;

  const activeResolutionItem =
    resolutionRows.find((r) => r.category === activeResolutionCat) ??
    resolutionRows[0] ??
    null;

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {sourceMode === 'signal-desk' && remoteData?.ok
                ? 'Signal Desk Live Analytics'
                : `Ward ${activeWard.wardNumber} Local Analytics`}
            </span>
            <span aria-hidden="true">·</span>
            <span>Ward {data.wardNumber}</span>
            {data.fetchedAtIso && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Synced {new Date(data.fetchedAtIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            Charts &amp; Graphs Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Toggle Signal Desk Ward 115 Live vs Current Ward Queue */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-300 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSourceMode('signal-desk')}
              className={`min-h-[34px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                sourceMode === 'signal-desk'
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Ward 115 Live
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('local')}
              className={`min-h-[34px] px-2.5 sm:px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                sourceMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              W{activeWard.wardNumber} Local Queue
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadRemoteAnalytics(true)}
            disabled={loading}
            className="min-h-[40px] px-3 rounded-xl border border-slate-400 dark:border-white/15 bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Refresh</span>
          </button>

          <a
            href="https://signal-desk-municipal-councillor.vercel.app/dashboard/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Signal Desk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {error && sourceMode === 'signal-desk' && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Showing local ward metrics ({error}).</span>
          </div>
          <button
            type="button"
            onClick={() => void loadRemoteAnalytics(true)}
            className="font-semibold underline cursor-pointer"
          >
            Retry live sync
          </button>
        </div>
      )}

      {/* Loading skeleton when fetching first load */}
      {loading && !remoteData && sourceMode === 'signal-desk' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Total Reports
              </div>
              <div className="font-display text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                {data.total.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {typeof data.tiles?.reportsToday === 'number'
                  ? `+${data.tiles.reportsToday} logged today`
                  : 'All categories'}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Resolved Reports
              </div>
              <div className="font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {(data.openVsResolved?.resolved ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {resolutionRatePct}% resolution rate
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Avg Resolution Time
              </div>
              <div className="font-display text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
                {data.avgResolutionHours ? `${Math.round(data.avgResolutionHours)}h` : '—'}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {data.avgDaysOpen ? `Avg open age: ${data.avgDaysOpen.toFixed(1)}d` : 'Per resolved report'}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Most Reported
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold truncate text-amber-700 dark:text-amber-400">
                {topCategory ? topCategory.label : '—'}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {topCategory ? `${topCategory.value.toLocaleString()} reports (${topCategory.pct}%)` : 'No reports'}
              </div>
            </div>
          </div>

          {/* Primary Charts Grid (2 columns on desktop, 1 on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Reports Per Day Area Chart */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Reports Per Day</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Tap or hover any point to inspect daily volume
                  </p>
                </div>
                {hoveredDaily && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {hoveredDaily.count} reports
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {hoveredDaily.date}
                    </div>
                  </div>
                )}
              </div>

              {renderAreaSvg(
                dailyRows.map((d) => ({ label: formatDayShort(d.date), value: d.count })),
                primaryAccent,
                'wardDailyGrad',
                activeDailyIdx,
                setActiveDailyIdx
              )}
            </section>

            {/* 2. Category Breakdown Donut Chart + Legend */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
                    <span>Category Breakdown</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Distribution across municipal service streams
                  </p>
                </div>
                {selectedCategory && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-slate-950 dark:text-white">
                      {selectedCategory.label}: {selectedCategory.value.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {selectedCategory.pct}% of total
                    </div>
                  </div>
                )}
              </div>

              {categoryRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-600 dark:text-slate-400">
                  No category data yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-44 h-44 shrink-0 relative flex items-center justify-center">
                    <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
                      <circle
                        cx="75"
                        cy="75"
                        r="56"
                        fill="none"
                        stroke={gridColor}
                        strokeWidth="18"
                      />
                      {categoryArcs.map((arc) => {
                        const isSelected = selectedCategory?.key === arc.key;
                        return (
                          <circle
                            key={arc.key}
                            cx="75"
                            cy="75"
                            r="56"
                            fill="none"
                            stroke={arc.color}
                            strokeWidth={isSelected ? 22 : 18}
                            strokeDasharray={arc.dashArray}
                            strokeDashoffset={arc.dashOffset}
                            className="cursor-pointer transition-[stroke-width] duration-150"
                            onMouseEnter={() => setActiveCategoryKey(arc.key)}
                            onClick={() => setActiveCategoryKey(arc.key)}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                      <span className="font-display text-lg font-bold tabular-nums text-slate-950 dark:text-white leading-none">
                        {selectedCategory?.pct ?? 0}%
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[78px] mt-1">
                        {selectedCategory?.label ?? 'Total'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full flex-1 space-y-1.5">
                    {categoryRows.slice(0, 8).map((row) => {
                      const active = selectedCategory?.key === row.key;
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onMouseEnter={() => setActiveCategoryKey(row.key)}
                          onClick={() => setActiveCategoryKey(row.key)}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors duration-150 ${
                            active
                              ? 'bg-slate-100 dark:bg-white/[0.08]'
                              : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {row.label}
                            </span>
                          </div>
                          <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300 shrink-0 ml-2">
                            <span className="font-semibold text-slate-950 dark:text-white">
                              {row.value.toLocaleString()}
                            </span>{' '}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              ({row.pct}%)
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* 3. Avg Resolution Time by Category (Bar Chart) */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
                    <span>Avg Resolution Time (Hours)</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Mean turnaround from logged to resolved by category
                  </p>
                </div>
                {activeResolutionItem && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-sky-700 dark:text-sky-400">
                      {activeResolutionItem.hours}h
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {formatCategoryName(activeResolutionItem.category)}
                    </div>
                  </div>
                )}
              </div>

              {resolutionRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-600 dark:text-slate-400">
                  No resolved turnaround timings yet.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {(() => {
                    const maxHours = Math.max(1, ...resolutionRows.map((r) => r.hours));
                    return resolutionRows.map((row) => {
                      const pct = Math.max(6, Math.round((row.hours / maxHours) * 100));
                      const isActive = activeResolutionCat === row.category;
                      return (
                        <button
                          key={row.category}
                          type="button"
                          onMouseEnter={() => setActiveResolutionCat(row.category)}
                          onClick={() => setActiveResolutionCat(row.category)}
                          className={`w-full text-left p-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                            isActive ? 'bg-slate-100 dark:bg-white/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatCategoryName(row.category)}
                            </span>
                            <span className="font-mono font-bold tabular-nums text-sky-700 dark:text-sky-400">
                              {row.hours}h ({(row.hours / 24).toFixed(1)}d)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: secondaryAccent,
                              }}
                            />
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </section>

            {/* 4. Monthly Volume Comparison Bar Chart */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                    Monthly Report Volume
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Month-by-month ward intake trajectory
                  </p>
                </div>
                {activeMonthItem && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-slate-950 dark:text-white">
                      {activeMonthItem.count.toLocaleString()} reports
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {activeMonthItem.label}
                    </div>
                  </div>
                )}
              </div>

              {monthRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-600 dark:text-slate-400">
                  No monthly totals available.
                </div>
              ) : (
                <svg
                  viewBox="0 0 540 200"
                  className="w-full h-auto overflow-visible select-none"
                  role="img"
                  aria-label="Monthly report volume bar chart"
                >
                  {(() => {
                    const W = 540;
                    const H = 200;
                    const padL = 40;
                    const padR = 14;
                    const padT = 18;
                    const padB = 28;
                    const plotW = W - padL - padR;
                    const plotH = H - padT - padB;
                    const maxV = Math.max(1, ...monthRows.map((m) => m.count));
                    const slotW = plotW / Math.max(1, monthRows.length);
                    const barW = Math.min(44, slotW * 0.56);

                    return (
                      <>
                        {[0, 0.5, 1].map((f, i) => {
                          const y = padT + plotH - f * plotH;
                          return (
                            <g key={i}>
                              <line
                                x1={padL}
                                x2={W - padR}
                                y1={y}
                                y2={y}
                                stroke={gridColor}
                                strokeDasharray="3 3"
                              />
                              <text
                                x={padL - 6}
                                y={y + 3}
                                textAnchor="end"
                                fill={axisColor}
                                fontSize="10"
                                fontFamily="var(--font-mono)"
                              >
                                {Math.round(f * maxV)}
                              </text>
                            </g>
                          );
                        })}

                        {monthRows.map((m, idx) => {
                          const h = Math.max(4, (m.count / maxV) * plotH);
                          const x = padL + idx * slotW + (slotW - barW) / 2;
                          const y = padT + plotH - h;
                          const isSelected = activeMonthItem?.month === m.month;
                          return (
                            <g
                              key={m.month}
                              className="cursor-pointer"
                              onMouseEnter={() => setActiveMonthKey(m.month)}
                              onClick={() => setActiveMonthKey(m.month)}
                            >
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                rx={6}
                                fill={isSelected ? primaryAccent : secondaryAccent}
                                opacity={isSelected ? 1 : 0.85}
                              />
                              <text
                                x={x + barW / 2}
                                y={y - 5}
                                textAnchor="middle"
                                fill={axisColor}
                                fontSize="10"
                                fontWeight={isSelected ? '700' : '500'}
                                fontFamily="var(--font-mono)"
                              >
                                {m.count}
                              </text>
                              <text
                                x={x + barW / 2}
                                y={H - 8}
                                textAnchor="middle"
                                fill={axisColor}
                                fontSize="10"
                                fontFamily="var(--font-mono)"
                              >
                                {m.label}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              )}
            </section>

            {/* 5. Weekly Trend Area Chart */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                    Weekly Trend
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    8-week fault volume cadence
                  </p>
                </div>
                {hoveredWeekly && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-sky-700 dark:text-sky-400">
                      {hoveredWeekly.count} reports
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      Week {hoveredWeekly.week}
                    </div>
                  </div>
                )}
              </div>

              {renderAreaSvg(
                weeklyRows.map((w) => ({ label: w.week, value: w.count })),
                secondaryAccent,
                'wardWeeklyGrad',
                activeWeeklyIdx,
                setActiveWeeklyIdx
              )}
            </section>

            {/* 6. Reports by Time of Day (24h Histogram) */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                    Reports by Time of Day
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    24-hour resident submission activity
                  </p>
                </div>
                {activeHourItem && (
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-sm font-bold text-violet-700 dark:text-violet-400">
                      {activeHourItem.count} reports
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      {String(activeHourItem.hour).padStart(2, '0')}:00
                      {activeHourIdx === null ? ' (Peak)' : ''}
                    </div>
                  </div>
                )}
              </div>

              {!timeOfDayRows.some((h) => h.count > 0) ? (
                <div className="py-10 text-center text-xs text-slate-600 dark:text-slate-400">
                  No hourly breakdown yet.
                </div>
              ) : (
                <svg
                  viewBox="0 0 540 190"
                  className="w-full h-auto overflow-visible select-none"
                  role="img"
                  aria-label="Reports by time of day histogram"
                >
                  {(() => {
                    const W = 540;
                    const H = 190;
                    const padL = 34;
                    const padR = 10;
                    const padT = 14;
                    const padB = 26;
                    const plotW = W - padL - padR;
                    const plotH = H - padT - padB;
                    const maxV = Math.max(1, ...timeOfDayRows.map((h) => h.count));
                    const slotW = plotW / 24;
                    const barW = Math.max(6, slotW * 0.65);

                    return (
                      <>
                        {[0, 0.5, 1].map((f, i) => {
                          const y = padT + plotH - f * plotH;
                          return (
                            <g key={i}>
                              <line
                                x1={padL}
                                x2={W - padR}
                                y1={y}
                                y2={y}
                                stroke={gridColor}
                                strokeDasharray="3 3"
                              />
                              <text
                                x={padL - 6}
                                y={y + 3}
                                textAnchor="end"
                                fill={axisColor}
                                fontSize="10"
                                fontFamily="var(--font-mono)"
                              >
                                {Math.round(f * maxV)}
                              </text>
                            </g>
                          );
                        })}

                        {timeOfDayRows.map((h, idx) => {
                          const barH = h.count > 0 ? Math.max(3, (h.count / maxV) * plotH) : 1;
                          const x = padL + idx * slotW + (slotW - barW) / 2;
                          const y = padT + plotH - barH;
                          const isSelected = activeHourIdx === idx || (activeHourIdx === null && peakHour?.hour === h.hour);
                          return (
                            <g
                              key={h.hour}
                              className="cursor-pointer"
                              onMouseEnter={() => setActiveHourIdx(idx)}
                              onMouseLeave={() => setActiveHourIdx(null)}
                              onClick={() => setActiveHourIdx(activeHourIdx === idx ? null : idx)}
                            >
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={barH}
                                rx={3}
                                fill={isSelected ? primaryAccent : tertiaryAccent}
                                opacity={isSelected ? 1 : 0.8}
                              />
                              {h.hour % 6 === 0 && (
                                <text
                                  x={x + barW / 2}
                                  y={H - 6}
                                  textAnchor="middle"
                                  fill={axisColor}
                                  fontSize="10"
                                  fontFamily="var(--font-mono)"
                                >
                                  {`${String(h.hour).padStart(2, '0')}:00`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              )}
            </section>

            {/* 7. Open vs Resolved + Municipal Reference Completion */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Open vs Resolved &amp; Reference Completion</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Ticket closure split and official municipal reference attachment rate
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <div className="w-32 h-32 shrink-0 relative flex items-center justify-center">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r={splitRadius}
                      fill="none"
                      stroke={gridColor}
                      strokeWidth="14"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={splitRadius}
                      fill="none"
                      stroke={primaryAccent}
                      strokeWidth="14"
                      strokeDasharray={`${resolvedDash} ${splitCircumference}`}
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={splitRadius}
                      fill="none"
                      stroke={amberAccent}
                      strokeWidth="14"
                      strokeDasharray={`${openDash} ${splitCircumference}`}
                      strokeDashoffset={-resolvedDash}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                      {resolutionRatePct}%
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">Resolved</span>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: primaryAccent }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Resolved</span>
                    </div>
                    <span className="font-mono font-bold tabular-nums text-slate-950 dark:text-white">
                      {resolvedVal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: amberAccent }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">Open / Queued</span>
                    </div>
                    <span className="font-mono font-bold tabular-nums text-slate-950 dark:text-white">
                      {openVal.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Official Ref # Attached
                      </span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {data.reference?.pctWithRef ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, data.reference?.pctWithRef ?? 0)}%`,
                          backgroundColor: primaryAccent,
                        }}
                      />
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {(data.reference?.withRef ?? 0).toLocaleString()} with ref ·{' '}
                      {(data.reference?.withoutRef ?? 0).toLocaleString()} awaiting ref
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(data.reference?.byCategory || {})
                  .sort(
                    ([, a], [, b]) =>
                      b.withRef + b.withoutRef - (a.withRef + a.withoutRef)
                  )
                  .slice(0, 6)
                  .map(([cat, stats]) => {
                    const tot = stats.withRef + stats.withoutRef;
                    const pct = tot > 0 ? Math.round((stats.withRef / tot) * 100) : 0;
                    return (
                      <div
                        key={cat}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
                      >
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {formatCategoryName(cat)}
                        </div>
                        <div className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {pct}% ref{' '}
                          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            ({tot})
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* 8. Hotspot Streets & Suburbs Breakdown */}
            <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-4 space-y-4">
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>Top Suburbs &amp; Hotspot Corridors</span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Highest-density reporting suburbs and recurring street hotspots
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Top Suburbs
                  </div>
                  {topSuburbs.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No suburb breakdown available.
                    </div>
                  ) : (
                    topSuburbs.map(([suburb, count]) => {
                      const maxSub = Math.max(1, topSuburbs[0][1]);
                      const pct = Math.max(8, Math.round((count / maxSub) * 100));
                      return (
                        <div key={suburb} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate pr-2">
                              {suburb}
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: primaryAccent }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Hotspot Locations
                  </div>
                  {hotspotRows.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No hotspot streets recorded yet.
                    </div>
                  ) : (
                    hotspotRows.map((item) => {
                      const maxStreet = Math.max(1, hotspotRows[0].count);
                      const pct = Math.max(8, Math.round((item.count / maxStreet) * 100));
                      return (
                        <div key={item.street} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate pr-2">
                              {item.street}
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {item.count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: amberAccent }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
