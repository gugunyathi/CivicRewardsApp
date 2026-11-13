import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileCheck2,
  Gift,
  Pencil,
  Plus,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { SEED_WARD_TOWN_BENCHMARKS } from '../data/civicSeedData';
import { SmartImage } from './SmartImage';
import type {
  CivicReport,
  MonthlyMunicipalBill,
  RewardTransaction,
  UserProfile,
  WardRecord,
} from '../types/civic';

interface UserProfileViewProps {
  user: UserProfile;
  activeWard: WardRecord;
  reports: CivicReport[];
  transactions: RewardTransaction[];
  monthlyBills: MonthlyMunicipalBill[];
  onUpdateCurrentBill: (updated: MonthlyMunicipalBill) => void;
  onOpenAuthModal: () => void;
  onOpenReportModal: () => void;
  onOpenRewards: () => void;
  onVerifyResolution: (reportId: string) => void;
}

type ProfileTab = 'reports' | 'points' | 'bills' | 'compare';
type BillMetric = 'total' | 'water' | 'electricity' | 'rates' | 'taxes';

const METRIC_LABELS: Record<BillMetric, string> = {
  total: 'Total Bill',
  water: 'Water',
  electricity: 'Electricity',
  rates: 'Rates',
  taxes: 'Mun. Taxes',
};

const getBillMetricValue = (bill: MonthlyMunicipalBill, metric: BillMetric): number => {
  switch (metric) {
    case 'water':
      return bill.waterZar;
    case 'electricity':
      return bill.electricityZar;
    case 'rates':
      return bill.ratesZar;
    case 'taxes':
      return bill.municipalTaxesZar;
    default:
      return bill.waterZar + bill.electricityZar + bill.ratesZar + bill.municipalTaxesZar;
  }
};

const getBenchmarkMetricValue = (
  bench: (typeof SEED_WARD_TOWN_BENCHMARKS)[number],
  metric: BillMetric
): number => {
  switch (metric) {
    case 'water':
      return bench.waterZar;
    case 'electricity':
      return bench.electricityZar;
    case 'rates':
      return bench.ratesZar;
    case 'taxes':
      return bench.municipalTaxesZar;
    default:
      return bench.waterZar + bench.electricityZar + bench.ratesZar + bench.municipalTaxesZar;
  }
};

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  activeWard,
  reports,
  transactions,
  monthlyBills,
  onUpdateCurrentBill,
  onOpenAuthModal,
  onOpenReportModal,
  onOpenRewards,
  onVerifyResolution,
}) => {
  const [tab, setTab] = useState<ProfileTab>('reports');

  // Reports tab state
  const [reportFilter, setReportFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [reportPage, setReportPage] = useState(0);

  // Points tab state
  const [txFilter, setTxFilter] = useState<'all' | 'earn' | 'redeem'>('all');
  const [txPage, setTxPage] = useState(0);

  // Monthly bills tab state
  const [billMetric, setBillMetric] = useState<BillMetric>('total');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(Math.max(0, monthlyBills.length - 1));
  const [editingBill, setEditingBill] = useState(false);

  const latestBill = monthlyBills[monthlyBills.length - 1];
  const [draftWater, setDraftWater] = useState(String(latestBill?.waterZar ?? 1180));
  const [draftElec, setDraftElec] = useState(String(latestBill?.electricityZar ?? 2640));
  const [draftRates, setDraftRates] = useState(String(latestBill?.ratesZar ?? 1850));
  const [draftTaxes, setDraftTaxes] = useState(String(latestBill?.municipalTaxesZar ?? 490));

  // Compare Wards & Towns tab state
  const [compareMetric, setCompareMetric] = useState<BillMetric>('total');
  const [benchmarkIdx, setBenchmarkIdx] = useState(3); // Default Sea Point Cape Town vs user's Fourways W115

  // Filter reports belonging to this user (their authored reports or ward activity)
  const myReports = reports.filter(
    (r) =>
      r.reporterName === user.name ||
      r.reporterName === 'You (Ward Resident)' ||
      r.reporterName === 'Gugu Ndlovu' ||
      r.id === 'CP-2026-1041'
  );
  const resolvedCount = myReports.filter((r) => r.status === 'Resolved').length;

  const filteredReports = myReports.filter((r) => {
    if (reportFilter === 'active') return r.status !== 'Resolved';
    if (reportFilter === 'resolved') return r.status === 'Resolved';
    return true;
  });
  const repTotalPages = Math.max(1, Math.ceil(filteredReports.length / 2));
  const safeRepPage = Math.min(reportPage, repTotalPages - 1);
  const visibleReports = filteredReports.slice(safeRepPage * 2, safeRepPage * 2 + 2);

  // Points & cashouts
  const totalEarned = transactions
    .filter((t) => t.type === 'earn')
    .reduce((acc, t) => acc + t.points, 0);
  const totalCashedOut = transactions
    .filter((t) => t.type === 'redeem')
    .reduce((acc, t) => acc + t.points, 0);

  const filteredTx = transactions.filter((t) => (txFilter === 'all' ? true : t.type === txFilter));
  const txTotalPages = Math.max(1, Math.ceil(filteredTx.length / 3));
  const safeTxPage = Math.min(txPage, txTotalPages - 1);
  const visibleTx = filteredTx.slice(safeTxPage * 3, safeTxPage * 3 + 3);

  // Monthly bills chart math
  const safeMonthIdx = Math.min(selectedMonthIdx, Math.max(0, monthlyBills.length - 1));
  const activeBill = monthlyBills[safeMonthIdx] ?? latestBill;
  const prevBill = safeMonthIdx > 0 ? monthlyBills[safeMonthIdx - 1] : null;
  const maxChartVal = Math.max(
    1,
    ...monthlyBills.map((b) => getBillMetricValue(b, billMetric))
  );
  const activeMetricVal = activeBill ? getBillMetricValue(activeBill, billMetric) : 0;
  const prevMetricVal = prevBill ? getBillMetricValue(prevBill, billMetric) : activeMetricVal;
  const momDeltaPct =
    prevMetricVal > 0 ? Math.round(((activeMetricVal - prevMetricVal) / prevMetricVal) * 1000) / 10 : 0;

  // Comparison math
  const homeAvgBench = SEED_WARD_TOWN_BENCHMARKS[0];
  const compareBench = SEED_WARD_TOWN_BENCHMARKS[benchmarkIdx] ?? SEED_WARD_TOWN_BENCHMARKS[1];
  const userLatestVal = latestBill ? getBillMetricValue(latestBill, compareMetric) : 0;
  const homeAvgVal = getBenchmarkMetricValue(homeAvgBench, compareMetric);
  const targetBenchVal = getBenchmarkMetricValue(compareBench, compareMetric);
  const maxCompareVal = Math.max(1, userLatestVal, homeAvgVal, targetBenchVal);
  const vsTargetDiff = userLatestVal - targetBenchVal;

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveEditedBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestBill) return;
    onUpdateCurrentBill({
      ...latestBill,
      waterZar: Math.max(0, Number(draftWater) || 0),
      electricityZar: Math.max(0, Number(draftElec) || 0),
      ratesZar: Math.max(0, Number(draftRates) || 0),
      municipalTaxesZar: Math.max(0, Number(draftTaxes) || 0),
    });
    setEditingBill(false);
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Citizen Profile Banner */}
      <section className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-sky-600 text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
              {initials || <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {user.name}
                </h1>
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                  {user.tier}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {activeWard.municipalityCode} Ward {activeWard.wardNumber} ({activeWard.suburbs[0]}) · {user.mobileZa}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Account</span>
            </button>
            <button
              type="button"
              onClick={onOpenReportModal}
              className="min-h-[36px] px-3 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>REPORT</span>
            </button>
          </div>
        </div>

        {/* 4 Single-Row Summary KPIs */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={() => setTab('reports')}
            className="p-2 bg-slate-50 dark:bg-white/[0.03] text-left cursor-pointer hover:border-sky-500 border border-transparent"
          >
            <div className="font-mono text-[10px] text-slate-400">REPORTS</div>
            <div className="font-display text-sm sm:text-base font-bold tabular-nums text-slate-900 dark:text-white">
              {myReports.length}
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('reports');
              setReportFilter('resolved');
              setReportPage(0);
            }}
            className="p-2 bg-slate-50 dark:bg-white/[0.03] text-left cursor-pointer hover:border-sky-500 border border-transparent"
          >
            <div className="font-mono text-[10px] text-slate-400">RESOLVED</div>
            <div className="font-display text-sm sm:text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {resolvedCount}
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('points');
              setTxFilter('earn');
              setTxPage(0);
            }}
            className="p-2 bg-slate-50 dark:bg-white/[0.03] text-left cursor-pointer hover:border-sky-500 border border-transparent"
          >
            <div className="font-mono text-[10px] text-slate-400">EARNED</div>
            <div className="font-display text-sm sm:text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">
              +{totalEarned}
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('points');
              setTxFilter('redeem');
              setTxPage(0);
            }}
            className="p-2 bg-slate-50 dark:bg-white/[0.03] text-left cursor-pointer hover:border-sky-500 border border-transparent"
          >
            <div className="font-mono text-[10px] text-slate-400">CASHED OUT</div>
            <div className="font-display text-sm sm:text-base font-bold tabular-nums text-sky-600 dark:text-sky-400">
              -{totalCashedOut}
            </div>
          </button>
        </div>
      </section>

      {/* 4 Segmented Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/15">
        {(
          [
            { id: 'reports', label: 'Reports', icon: FileCheck2 },
            { id: 'points', label: 'Points', icon: Award },
            { id: 'bills', label: 'My Bills', icon: Receipt },
            { id: 'compare', label: 'Compare', icon: BarChart3 },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[38px] px-1.5 flex items-center justify-center gap-1 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY REPORTS & RESOLVED ITEMS */}
      {tab === 'reports' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: `All (${myReports.length})` },
                  { id: 'active', label: `Active (${myReports.length - resolvedCount})` },
                  { id: 'resolved', label: `Resolved (${resolvedCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setReportFilter(f.id);
                    setReportPage(0);
                  }}
                  className={`min-h-[32px] px-2.5 text-xs font-mono cursor-pointer ${
                    reportFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                      : 'border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-slate-400">
                {safeRepPage + 1} / {repTotalPages}
              </span>
              <button
                type="button"
                disabled={safeRepPage === 0}
                onClick={() => setReportPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeRepPage >= repTotalPages - 1}
                onClick={() => setReportPage((p) => Math.min(repTotalPages - 1, p + 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleReports.map((rep) => {
              const isResolved = rep.status === 'Resolved';
              return (
                <article
                  key={rep.id}
                  className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-4 flex flex-col justify-between gap-2.5"
                >
                  <SmartImage
                    src={rep.photoUrl}
                    alt={rep.title}
                    categoryId={rep.categoryId}
                    label={`${rep.departmentLabel} · ${rep.suburb}`}
                    className="h-28 w-full"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">
                        {rep.id} · {rep.municipalRef || 'PENDING REF'}
                      </span>
                      <span
                        className={`font-semibold ${
                          isResolved
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      {rep.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {rep.address} · {rep.assignedDepot}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400">
                      {rep.timeAgoLabel} · SLA {rep.slaElapsedHours}h/{rep.slaDeadlineHours}h
                    </span>
                    {!isResolved ? (
                      <button
                        type="button"
                        onClick={() => onVerifyResolution(rep.id)}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Fixed
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: EARNED POINTS, HISTORY & CASHED OUT POINTS */}
      {tab === 'points' && (
        <section className="space-y-3">
          <div className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span>
                Available: <strong className="text-slate-900 dark:text-white">{user.credits} CR</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Earned: <strong>+{totalEarned} CR</strong>
              </span>
              <span className="text-sky-600 dark:text-sky-400">
                Cashed Out: <strong>-{totalCashedOut} CR</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenRewards}
              className="min-h-[34px] px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Cash Out Points</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: `All (${transactions.length})` },
                  { id: 'earn', label: 'Earned (+)' },
                  { id: 'redeem', label: 'Cashed Out (-)' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setTxFilter(f.id);
                    setTxPage(0);
                  }}
                  className={`min-h-[32px] px-2.5 text-xs font-mono cursor-pointer ${
                    txFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                      : 'border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-slate-400">
                {safeTxPage + 1} / {txTotalPages}
              </span>
              <button
                type="button"
                disabled={safeTxPage === 0}
                onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeTxPage >= txTotalPages - 1}
                onClick={() => setTxPage((p) => Math.min(txTotalPages - 1, p + 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 divide-y divide-slate-100 dark:divide-white/10">
            {visibleTx.map((tx) => (
              <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {tx.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {tx.subtitle}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{tx.timestampLabel}</div>
                </div>
                <div
                  className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                    tx.type === 'earn'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {tx.type === 'earn' ? `+${tx.points} CR` : `-${tx.points} CR`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: MONTH-TO-MONTH WATER, ELECTRICITY, RATES & MUNICIPAL TAXES */}
      {tab === 'bills' && activeBill && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['total', 'water', 'electricity', 'rates', 'taxes'] as BillMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBillMetric(m)}
                  className={`min-h-[32px] px-2.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    billMetric === m
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setEditingBill((v) => !v)}
              className="min-h-[32px] px-2.5 border border-slate-200 dark:border-white/15 text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Pencil className="w-3 h-3" />
              <span>{editingBill ? 'Close Edit' : 'Update My Bill'}</span>
            </button>
          </div>

          {editingBill ? (
            <form
              onSubmit={handleSaveEditedBill}
              className="bg-white dark:bg-[#0A0E17] border border-sky-500/40 p-3.5 space-y-2.5"
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Update {latestBill?.monthLabel} 2026 Municipal Statement (ZAR)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Water (R)</label>
                  <input
                    type="number"
                    value={draftWater}
                    onChange={(e) => setDraftWater(e.target.value)}
                    className="w-full min-h-[36px] px-2 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Electricity (R)</label>
                  <input
                    type="number"
                    value={draftElec}
                    onChange={(e) => setDraftElec(e.target.value)}
                    className="w-full min-h-[36px] px-2 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Rates (R)</label>
                  <input
                    type="number"
                    value={draftRates}
                    onChange={(e) => setDraftRates(e.target.value)}
                    className="w-full min-h-[36px] px-2 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Mun. Taxes (R)</label>
                  <input
                    type="number"
                    value={draftTaxes}
                    onChange={(e) => setDraftTaxes(e.target.value)}
                    className="w-full min-h-[36px] px-2 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="min-h-[36px] px-4 bg-sky-600 text-white text-xs font-bold cursor-pointer"
              >
                Save & Recalculate Trends
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left: 6-Month Bar Chart */}
              <div className="lg:col-span-7 bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    6-Month {METRIC_LABELS[billMetric]} Trend (Tap bar)
                  </span>
                  <span
                    className={`font-mono font-semibold flex items-center gap-1 ${
                      momDeltaPct > 0
                        ? 'text-red-500'
                        : momDeltaPct < 0
                          ? 'text-emerald-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {momDeltaPct > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {momDeltaPct > 0 ? `+${momDeltaPct}%` : `${momDeltaPct}%`} MoM
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 items-end h-32 pt-4">
                  {monthlyBills.map((b, idx) => {
                    const val = getBillMetricValue(b, billMetric);
                    const pct = Math.max(12, Math.round((val / maxChartVal) * 100));
                    const isSel = idx === safeMonthIdx;
                    return (
                      <button
                        key={b.monthKey}
                        type="button"
                        onClick={() => setSelectedMonthIdx(idx)}
                        className="flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
                      >
                        <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 tabular-nums">
                          R{(val / 1000).toFixed(1)}k
                        </span>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className={`w-full transition-all ${
                              isSel
                                ? 'bg-sky-500 dark:bg-sky-400'
                                : 'bg-slate-200 dark:bg-white/15 group-hover:bg-sky-500/60'
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[10px] ${
                            isSel
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {b.monthLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected Month Breakdown */}
              <div className="lg:col-span-5 bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-3.5 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {activeBill.monthLabel} 2026 Breakdown
                  </span>
                  <span className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                    R{getBillMetricValue(activeBill, 'total').toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-sky-500" />
                      Water ({activeBill.waterKl} kL)
                    </span>
                    <strong className="font-mono tabular-nums">R{activeBill.waterZar.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Electricity ({activeBill.electricityKwh} kWh)
                    </span>
                    <strong className="font-mono tabular-nums">R{activeBill.electricityZar.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      Property Rates
                    </span>
                    <strong className="font-mono tabular-nums">R{activeBill.ratesZar.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                      Refuse, Sewer & Mun. Taxes
                    </span>
                    <strong className="font-mono tabular-nums">R{activeBill.municipalTaxesZar.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('compare')}
                  className="w-full min-h-[36px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Compare vs Other Wards & Towns →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: COMPARE BILLS VS OTHER WARDS & TOWNS */}
      {tab === 'compare' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['total', 'water', 'electricity', 'rates', 'taxes'] as BillMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCompareMetric(m)}
                  className={`min-h-[32px] px-2.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    compareMetric === m
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setBenchmarkIdx((i) => (i - 1 + SEED_WARD_TOWN_BENCHMARKS.length) % SEED_WARD_TOWN_BENCHMARKS.length)
                }
                aria-label="Previous ward or town"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                aria-label="Compare against ward or town"
                value={benchmarkIdx}
                onChange={(e) => setBenchmarkIdx(Number(e.target.value))}
                className="min-h-[32px] px-2 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0A0E17] text-xs font-semibold"
              >
                {SEED_WARD_TOWN_BENCHMARKS.map((b, idx) => (
                  <option key={b.id} value={idx}>
                    {b.townOrMetro} · {b.wardLabel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setBenchmarkIdx((i) => (i + 1) % SEED_WARD_TOWN_BENCHMARKS.length)
                }
                aria-label="Next ward or town"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                  {METRIC_LABELS[compareMetric].toUpperCase()} BENCHMARK ({latestBill?.monthLabel} 2026)
                </div>
                <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  You vs Ward {activeWard.wardNumber} Avg vs {compareBench.townOrMetro}
                </h2>
              </div>

              <span
                className={`font-mono text-xs font-bold px-2.5 py-1 border ${
                  vsTargetDiff <= 0
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {vsTargetDiff <= 0
                  ? `R${Math.abs(vsTargetDiff).toLocaleString()} lower than ${compareBench.wardLabel}`
                  : `R${vsTargetDiff.toLocaleString()} higher than ${compareBench.wardLabel}`}
              </span>
            </div>

            {/* 3 Visual Horizontal Comparison Bars */}
            <div className="space-y-2.5">
              {[
                {
                  label: `Your Household (Ward ${activeWard.wardNumber})`,
                  val: userLatestVal,
                  barClass: 'bg-sky-500',
                },
                {
                  label: `${homeAvgBench.label}`,
                  val: homeAvgVal,
                  barClass: 'bg-slate-400 dark:bg-slate-500',
                },
                {
                  label: `${compareBench.label} (${compareBench.townOrMetro})`,
                  val: targetBenchVal,
                  barClass: 'bg-amber-500',
                },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                      {row.label}
                    </span>
                    <strong className="font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                      R{row.val.toLocaleString()}/mo
                    </strong>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${row.barClass}`}
                      style={{ width: `${Math.max(8, Math.round((row.val / maxCompareVal) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Tariff & Service Delivery Matrix */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="p-2 bg-slate-50 dark:bg-white/[0.03]">
                <div className="text-slate-400 text-[10px]">WATER TARIFF</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  R{compareBench.waterTariffPerKl.toFixed(1)}/kL
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-white/[0.03]">
                <div className="text-slate-400 text-[10px]">POWER TARIFF</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  R{compareBench.elecTariffPerKwh.toFixed(2)}/kWh
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-white/[0.03]">
                <div className="text-slate-400 text-[10px]">SLA SCORE</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {compareBench.slaResolutionScore}%
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
