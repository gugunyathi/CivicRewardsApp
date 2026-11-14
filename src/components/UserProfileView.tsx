import React, { useEffect, useMemo, useState } from 'react';
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
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { REWARD_OFFERS, SEED_WARD_TOWN_BENCHMARKS, SEED_WARDS } from '../data/civicSeedData';
import { AvatarPlaceholder, RewardCategoryIcon, SmartImage } from './SmartImage';
import { EscalationPanel } from './EscalationPanel';
import { SlaCountdown } from './SlaCountdown';
import { openWhatsAppShare } from '../utils/share';
import type {
  CivicReport,
  MonthlyMunicipalBill,
  RewardTransaction,
  UserProfile,
  WardRecord,
} from '../types/civic';

export type ProfileTab = 'reports' | 'points' | 'bills' | 'compare';

interface UserProfileViewProps {
  user: UserProfile;
  activeWard: WardRecord;
  reports: CivicReport[];
  transactions: RewardTransaction[];
  monthlyBills: MonthlyMunicipalBill[];
  initialTab?: ProfileTab;
  onUpdateCurrentBill: (updated: MonthlyMunicipalBill) => void;
  onOpenAuthModal: () => void;
  onOpenReportModal: () => void;
  onRedeemOffer: (offerId: string, cost: number, title: string) => boolean;
  onVerifyResolution: (reportId: string) => void;
  onAttachRef: (reportId: string, refCode: string) => void;
  onSendSlaReminder: (reportId: string) => void;
}
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

const billInputClass =
  'w-full h-10 px-3 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-xs font-mono tabular-nums text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 transition-[border-color,box-shadow,background-color] duration-150';

export const UserProfileView: React.FC<UserProfileViewProps> = React.memo(({
  user,
  activeWard,
  reports,
  transactions,
  monthlyBills,
  initialTab,
  onUpdateCurrentBill,
  onOpenAuthModal,
  onOpenReportModal,
  onRedeemOffer,
  onVerifyResolution,
  onAttachRef,
  onSendSlaReminder,
}) => {
  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'reports');
  const [issuedVoucher, setIssuedVoucher] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const [reportFilter, setReportFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [repLimit, setRepLimit] = useState(4);

  const [txFilter, setTxFilter] = useState<'all' | 'earn' | 'redeem'>('all');
  const [txLimit, setTxLimit] = useState(6);

  const [billMetric, setBillMetric] = useState<BillMetric>('total');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(Math.max(0, monthlyBills.length - 1));
  const [editingBill, setEditingBill] = useState(false);

  const latestBill = monthlyBills[monthlyBills.length - 1];
  const [draftWater, setDraftWater] = useState(String(latestBill?.waterZar ?? 1180));
  const [draftElec, setDraftElec] = useState(String(latestBill?.electricityZar ?? 2640));
  const [draftRates, setDraftRates] = useState(String(latestBill?.ratesZar ?? 1850));
  const [draftTaxes, setDraftTaxes] = useState(String(latestBill?.municipalTaxesZar ?? 490));

  const [compareMetric, setCompareMetric] = useState<BillMetric>('total');
  const [benchmarkIdx, setBenchmarkIdx] = useState(3);

  const myReports = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.reporterName === user.name ||
          r.reporterName === 'You (Ward Resident)' ||
          r.reporterName === 'Gugu Ndlovu' ||
          r.timeAgoLabel === 'Just now' ||
          r.id === 'CP-2026-1041'
      ),
    [reports, user.name]
  );

  const resolvedCount = useMemo(
    () => myReports.filter((r) => r.status === 'Resolved').length,
    [myReports]
  );

  const filteredReports = useMemo(
    () =>
      myReports.filter((r) => {
        if (reportFilter === 'active') return r.status !== 'Resolved';
        if (reportFilter === 'resolved') return r.status === 'Resolved';
        return true;
      }),
    [myReports, reportFilter]
  );

  const visibleReports = filteredReports.slice(0, repLimit);
  const remainingReports = Math.max(0, filteredReports.length - visibleReports.length);

  const { totalEarned, totalCashedOut } = useMemo(
    () => ({
      totalEarned: transactions.filter((t) => t.type === 'earn').reduce((acc, t) => acc + t.points, 0),
      totalCashedOut: transactions.filter((t) => t.type === 'redeem').reduce((acc, t) => acc + t.points, 0),
    }),
    [transactions]
  );

  const filteredTx = useMemo(
    () => transactions.filter((t) => (txFilter === 'all' ? true : t.type === txFilter)),
    [transactions, txFilter]
  );
  const visibleTx = filteredTx.slice(0, txLimit);
  const remainingTx = Math.max(0, filteredTx.length - visibleTx.length);

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
    <div className="space-y-4">
      {/* Compact Citizen Profile Banner */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
              {initials || <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {user.name}
                </h1>
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                  {user.tier}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate tabular-nums">
                {activeWard.municipalityCode} Ward {activeWard.wardNumber} ({activeWard.suburbs[0]}) · {user.mobileZa || 'Guest'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="min-h-[38px] px-3 rounded-xl border border-slate-200/90 dark:border-white/12 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Account</span>
            </button>
            <button
              type="button"
              onClick={onOpenReportModal}
              className="min-h-[38px] px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>REPORT</span>
            </button>
          </div>
        </div>

        {/* 4 Single-Row Summary KPIs */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('reports')}
            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] text-left cursor-pointer hover:border-emerald-600/50 border border-transparent transition-colors duration-150"
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
              setRepLimit(4);
            }}
            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] text-left cursor-pointer hover:border-emerald-600/50 border border-transparent transition-colors duration-150"
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
              setTxLimit(6);
            }}
            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] text-left cursor-pointer hover:border-emerald-600/50 border border-transparent transition-colors duration-150"
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
              setTxLimit(6);
            }}
            className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] text-left cursor-pointer hover:border-emerald-600/50 border border-transparent transition-colors duration-150"
          >
            <div className="font-mono text-[10px] text-slate-400">CASHED OUT</div>
            <div className="font-display text-sm sm:text-base font-bold tabular-nums text-slate-700 dark:text-slate-200">
              -{totalCashedOut}
            </div>
          </button>
        </div>
      </section>

      {/* 4 Segmented Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
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
              className={`min-h-[38px] px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
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
            <div className="flex items-center gap-1.5">
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
                    setRepLimit(4);
                  }}
                  className={`min-h-[34px] px-3 rounded-xl text-xs font-mono cursor-pointer transition-colors duration-150 tabular-nums ${
                    reportFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                      : 'border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              Showing {visibleReports.length} of {filteredReports.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {visibleReports.map((rep) => {
              const isResolved = rep.status === 'Resolved';
              return (
                <article
                  key={rep.id}
                  className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 flex flex-col justify-between gap-3"
                >
                  <SmartImage
                    src={rep.photoUrl}
                    alt={rep.title}
                    categoryId={rep.categoryId}
                    label={`${rep.departmentLabel} · ${rep.suburb}`}
                    className="h-28 w-full rounded-xl"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SlaCountdown report={rep} />
                    <button
                      type="button"
                      onClick={() => {
                        const w = SEED_WARDS.find((x) => x.id === rep.wardId) ?? activeWard;
                        openWhatsAppShare(
                          rep,
                          {
                            wardLabel: `${rep.municipalityCode} Ward ${rep.wardNumber} (${rep.suburb})`,
                            councillorName: w.councillor.name,
                          },
                          w.councillor.whatsappEscalation
                        );
                      }}
                      title="Share report to WhatsApp"
                      className="min-h-[32px] px-2.5 rounded-lg border border-slate-200/90 dark:border-white/15 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Share</span>
                    </button>
                  </div>
                  <EscalationPanel
                    report={rep}
                    ward={SEED_WARDS.find((w) => w.id === rep.wardId) ?? activeWard}
                    onAttachRef={onAttachRef}
                    onSendSlaReminder={onSendSlaReminder}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
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
                    <h2 className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                      {rep.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {rep.address} · {rep.assignedDepot}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400 tabular-nums">
                      {rep.timeAgoLabel} · SLA {rep.slaElapsedHours}h/{rep.slaDeadlineHours}h
                    </span>
                    {!isResolved ? (
                      <button
                        type="button"
                        onClick={() => onVerifyResolution(rep.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer flex items-center gap-1 active:scale-[0.98] transition-[background-color,transform] duration-150"
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
          {remainingReports > 0 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setRepLimit((n) => n + 4)}
                className="min-h-[38px] px-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
              >
                Show more ({remainingReports} remaining)
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CIVICREWARDS LEDGER, REDEEM VOUCHERS & HISTORY */}
      {tab === 'points' && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo-mark.png"
                alt="CivicRewards logo"
                className="w-9 h-9 rounded-xl bg-white p-0.5 border border-slate-200/80 dark:border-white/15 object-contain shrink-0"
              />
              <div>
                <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  CivicRewards Credits & Vouchers
                </div>
                <div className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {user.credits.toLocaleString()} Available CR
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400">
                Earned: <strong>+{totalEarned} CR</strong>
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                Cashed Out: <strong>-{totalCashedOut} CR</strong>
              </span>
            </div>
          </div>

          {issuedVoucher && (
            <div className="p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
              <span>{issuedVoucher}</span>
              <button
                type="button"
                onClick={() => setIssuedVoucher(null)}
                className="font-semibold underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Partner Vouchers & Cash Out */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Partner Vouchers & Airtime
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                +50 CR photo · +30 CR fix check · +15 CR +1
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {REWARD_OFFERS.map((offer) => {
                const canAfford = user.credits >= offer.costCredits;
                return (
                  <div
                    key={offer.id}
                    className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <AvatarPlaceholder name={offer.partner} className="w-7 h-7 text-[10px]" />
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                            {offer.partner}
                          </span>
                        </div>
                        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-amber-600 dark:text-amber-400">
                          <RewardCategoryIcon category={offer.category} />
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{offer.title}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{offer.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        const ok = onRedeemOffer(offer.id, offer.costCredits, offer.title);
                        if (ok) {
                          const code = `CP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                          setIssuedVoucher(
                            `Redeemed ${offer.title}! PIN ${code} sent to ${user.mobileZa || 'your account'}.`
                          );
                        }
                      }}
                      className="w-full h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Redeem ({offer.costCredits} cr)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Points Ledger History */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
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
                      setTxLimit(6);
                    }}
                    className={`min-h-[34px] px-3 rounded-xl text-xs font-mono cursor-pointer transition-colors duration-150 ${
                      txFilter === f.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                        : 'border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                Showing {visibleTx.length} of {filteredTx.length}
              </span>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06] overflow-hidden">
              {visibleTx.map((tx) => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
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
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tx.type === 'earn' ? `+${tx.points} CR` : `-${tx.points} CR`}
                  </div>
                </div>
              ))}
            </div>

            {remainingTx > 0 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setTxLimit((n) => n + 6)}
                  className="min-h-[38px] px-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
                >
                  Show more ({remainingTx} remaining)
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: MONTH-TO-MONTH WATER, ELECTRICITY, RATES & MUNICIPAL TAXES */}
      {tab === 'bills' && activeBill && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['total', 'water', 'electricity', 'rates', 'taxes'] as BillMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBillMetric(m)}
                  className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                    billMetric === m
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setEditingBill((v) => !v)}
              className="min-h-[34px] px-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.98] transition-transform duration-150"
            >
              <Pencil className="w-3 h-3" />
              <span>{editingBill ? 'Close Edit' : 'Update Bill'}</span>
            </button>
          </div>

          {editingBill ? (
            <form
              onSubmit={handleSaveEditedBill}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-emerald-600/30 p-4 sm:p-5 space-y-3"
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Update {latestBill?.monthLabel} 2026 Statement (ZAR)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Water (R)</label>
                  <input
                    type="number"
                    value={draftWater}
                    onChange={(e) => setDraftWater(e.target.value)}
                    className={billInputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Electricity (R)</label>
                  <input
                    type="number"
                    value={draftElec}
                    onChange={(e) => setDraftElec(e.target.value)}
                    className={billInputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Rates (R)</label>
                  <input
                    type="number"
                    value={draftRates}
                    onChange={(e) => setDraftRates(e.target.value)}
                    className={billInputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Mun. Taxes (R)</label>
                  <input
                    type="number"
                    value={draftTaxes}
                    onChange={(e) => setDraftTaxes(e.target.value)}
                    className={billInputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
              >
                Save & Recalculate
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Left: 6-Month Bar Chart */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    6-Month {METRIC_LABELS[billMetric]} Trend
                  </span>
                  <span
                    className={`font-mono font-semibold flex items-center gap-1 tabular-nums ${
                      momDeltaPct > 0
                        ? 'text-red-500'
                        : momDeltaPct < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
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
                            className={`w-full rounded-t-lg transition-[background-color] duration-150 ${
                              isSel
                                ? 'bg-emerald-600 dark:bg-emerald-400'
                                : 'bg-slate-200 dark:bg-white/10 group-hover:bg-emerald-600/50'
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
              <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] p-4 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2">
                  <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {activeBill.monthLabel} 2026 Breakdown
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    R{getBillMetricValue(activeBill, 'total').toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
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
                  className="w-full h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  Compare vs Other Wards →
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
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['total', 'water', 'electricity', 'rates', 'taxes'] as BillMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCompareMetric(m)}
                  className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                    compareMetric === m
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300'
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
                className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                aria-label="Compare against ward or town"
                value={benchmarkIdx}
                onChange={(e) => setBenchmarkIdx(Number(e.target.value))}
                className="h-[34px] px-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] text-xs font-semibold"
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
                className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {METRIC_LABELS[compareMetric].toUpperCase()} BENCHMARK ({latestBill?.monthLabel} 2026)
                </div>
                <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  You vs Ward {activeWard.wardNumber} Avg vs {compareBench.townOrMetro}
                </h2>
              </div>

              <span
                className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border tabular-nums ${
                  vsTargetDiff <= 0
                    ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}
              >
                {vsTargetDiff <= 0
                  ? `R${Math.abs(vsTargetDiff).toLocaleString()} lower than ${compareBench.wardLabel}`
                  : `R${vsTargetDiff.toLocaleString()} higher than ${compareBench.wardLabel}`}
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: `Your Household (Ward ${activeWard.wardNumber})`,
                  val: userLatestVal,
                  barClass: 'bg-emerald-600 dark:bg-emerald-400',
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
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-200 ease-out ${row.barClass}`}
                      style={{ width: `${Math.max(8, Math.round((row.val / maxCompareVal) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-3 gap-2 text-center font-mono text-[11px] tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03]">
                <div className="text-slate-400 text-[10px]">WATER TARIFF</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  R{compareBench.waterTariffPerKl.toFixed(1)}/kL
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03]">
                <div className="text-slate-400 text-[10px]">POWER TARIFF</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  R{compareBench.elecTariffPerKwh.toFixed(2)}/kWh
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03]">
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
});

UserProfileView.displayName = 'UserProfileView';
