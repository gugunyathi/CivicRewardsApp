import React, { useMemo, useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Mail,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import { MUNICIPALITIES, REWARD_OFFERS, SEED_WARDS } from '../data/civicSeedData';
import type {
  MunicipalityCode,
  RewardTransaction,
  UserProfile,
  WardRecord,
} from '../types/civic';
import { MiniMapPreview } from './MiniMapPreview';
import { AvatarPlaceholder, RewardCategoryIcon } from './SmartImage';

interface DirectoryViewProps {
  activeWard: WardRecord;
  onBindWard: (wardId: string) => void;
}

const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export const DirectoryView: React.FC<DirectoryViewProps> = React.memo(({ activeWard, onBindWard }) => {
  const [metroFilter, setMetroFilter] = useState<'ALL' | MunicipalityCode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIdx, setPageIdx] = useState(0);

  const filteredWards = useMemo(
    () =>
      SEED_WARDS.filter((w) => {
        const matchesMetro = metroFilter === 'ALL' || w.municipalityCode === metroFilter;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return matchesMetro;
        const hay = [
          `ward ${w.wardNumber}`,
          w.municipalityName,
          w.municipalityCode,
          ...w.suburbs,
          ...w.corridors,
          w.councillor.name,
          w.councillor.party,
        ]
          .join(' ')
          .toLowerCase();
        return matchesMetro && hay.includes(q);
      }),
    [metroFilter, searchQuery]
  );

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filteredWards.length / pageSize));
  const safePage = Math.min(pageIdx, totalPages - 1);
  const pageWards = filteredWards.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ward & Councillor Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search SA metros by suburb, street, or councillor
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums mr-1">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            aria-label="Previous directory page"
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next directory page"
            className="min-h-[34px] min-w-[34px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['ALL', 'CoJ', 'CoCT', 'CoT', 'eThekwini'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetroFilter(m);
                setPageIdx(0);
              }}
              className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                metroFilter === m
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m === 'ALL' ? 'All Metros' : m}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIdx(0);
            }}
            placeholder="Search suburb, street, ward # or councillor..."
            className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 transition-[border-color,box-shadow,background-color] duration-150"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageWards.map((ward) => {
          const isHome = ward.id === activeWard.id;
          return (
            <article
              key={ward.id}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
            >
              <MiniMapPreview
                lat={ward.lat}
                lng={ward.lng}
                zoom={12}
                darkMode={isDarkTheme()}
                label={`Ward ${ward.wardNumber} · ${ward.suburbs[0]}`}
                className="h-24 w-full rounded-none border-0 border-b border-slate-200/80 dark:border-white/[0.08]"
              />

              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                      {ward.municipalityName} ({MUNICIPALITIES[ward.municipalityCode].totalWards} wards)
                    </div>
                    <h2 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                      Ward {ward.wardNumber} · {ward.suburbs.join(', ')}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                      {ward.councillor.resolutionScore}%
                    </div>
                    <div className="text-[10px] text-slate-500">SLA Score</div>
                  </div>
                </div>

                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                    style={{ width: `${ward.councillor.resolutionScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AvatarPlaceholder name={ward.councillor.name} className="w-9 h-9 text-[11px]" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {ward.councillor.name} ({ward.councillor.party})
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ward.councillor.email}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 text-[11px] tabular-nums">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{ward.councillor.whatsappEscalation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Active Tickets</span>
                      <strong className="font-mono tabular-nums">{ward.councillor.activeTickets}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Resolved / Mo</span>
                      <strong className="font-mono tabular-nums">{ward.councillor.monthlyResolutions}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">
                      {ward.depots.water} · {ward.depots.electricity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {ward.lat.toFixed(3)}, {ward.lng.toFixed(3)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBindWard(ward.id)}
                    className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150 ${
                      isHome
                        ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                    }`}
                  >
                    {isHome ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{isHome ? 'Active Ward' : 'Set Active'}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
});

DirectoryView.displayName = 'DirectoryView';

interface RewardsViewProps {
  user: UserProfile;
  transactions: RewardTransaction[];
  onRedeemOffer: (offerId: string, cost: number, title: string) => void;
}

export const RewardsView: React.FC<RewardsViewProps> = React.memo(({
  user,
  transactions,
  onRedeemOffer,
}) => {
  const [issuedVoucher, setIssuedVoucher] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'redeem' | 'history'>('redeem');
  const [offerPage, setOfferPage] = useState(0);
  const [txPage, setTxPage] = useState(0);

  const pageSize = 2;
  const offerPages = Math.max(1, Math.ceil(REWARD_OFFERS.length / pageSize));
  const visibleOffers = REWARD_OFFERS.slice(offerPage * pageSize, offerPage * pageSize + pageSize);

  const txPages = Math.max(1, Math.ceil(transactions.length / 3));
  const visibleTx = transactions.slice(txPage * 3, txPage * 3 + 3);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            CivicRewards Ledger
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>{user.credits.toLocaleString()} Civic Credits</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            +50 CR verified photo · +30 CR fix check · +15 CR neighbour +1
          </p>
        </div>

        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-xs shrink-0">
          <div className="font-display font-bold text-slate-900 dark:text-white">{user.tier}</div>
          <div className="font-mono text-[11px] text-slate-500 tabular-nums">{user.mobileZa || 'Guest session'}</div>
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

      {/* Mobile Tab Switch */}
      <div className="grid grid-cols-2 lg:hidden rounded-xl border border-slate-200/80 dark:border-white/[0.08] p-1 bg-slate-100/80 dark:bg-white/[0.04]">
        <button
          type="button"
          onClick={() => setActiveTab('redeem')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
            activeTab === 'redeem'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Redeem ({REWARD_OFFERS.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          History ({transactions.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Partner Redemptions */}
        <section
          className={`${activeTab === 'redeem' ? 'block' : 'hidden lg:block'} lg:col-span-7 space-y-2.5`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Partner Vouchers & Airtime
            </h2>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] text-slate-400 mr-1 tabular-nums">
                {offerPage + 1}/{offerPages}
              </span>
              <button
                type="button"
                disabled={offerPage === 0}
                onClick={() => setOfferPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={offerPage >= offerPages - 1}
                onClick={() => setOfferPage((p) => Math.min(offerPages - 1, p + 1))}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleOffers.map((offer) => {
              const canAfford = user.credits >= offer.costCredits;
              return (
                <div
                  key={offer.id}
                  className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarPlaceholder name={offer.partner} className="w-8 h-8 text-[10px]" />
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
                    <div className="font-mono text-[10px] text-slate-400">{offer.category}</div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      onRedeemOffer(offer.id, offer.costCredits, offer.title);
                      const code = `CP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                      setIssuedVoucher(`Redeemed ${offer.title}! PIN ${code} sent to ${user.mobileZa}.`);
                    }}
                    className="w-full h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150 tabular-nums"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Redeem ({offer.costCredits} cr)</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ledger History */}
        <section
          className={`${activeTab === 'history' ? 'block' : 'hidden lg:block'} lg:col-span-5 space-y-2.5`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Points Ledger History
            </h2>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] text-slate-400 mr-1 tabular-nums">
                {txPage + 1}/{txPages}
              </span>
              <button
                type="button"
                disabled={txPage === 0}
                onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={txPage >= txPages - 1}
                onClick={() => setTxPage((p) => Math.min(txPages - 1, p + 1))}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-slate-100 dark:divide-white/[0.06] overflow-hidden">
            {visibleTx.map((tx) => (
              <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{tx.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{tx.subtitle}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{tx.timestampLabel}</div>
                </div>
                <div
                  className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                    tx.type === 'earn'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tx.type === 'earn' ? `+${tx.points}` : `-${tx.points}`}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
});

RewardsView.displayName = 'RewardsView';
