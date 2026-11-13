import React, { useState } from 'react';
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

export const DirectoryView: React.FC<DirectoryViewProps> = ({ activeWard, onBindWard }) => {
  const [metroFilter, setMetroFilter] = useState<'ALL' | MunicipalityCode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIdx, setPageIdx] = useState(0);

  const filteredWards = SEED_WARDS.filter((w) => {
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
  });

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filteredWards.length / pageSize));
  const safePage = Math.min(pageIdx, totalPages - 1);
  const pageWards = filteredWards.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Ward & Councillor Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search SA metros by suburb, street, ward #, or councillor
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums mr-1">
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
            aria-label="Previous directory page"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next directory page"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['ALL', 'CoJ', 'CoCT', 'CoT', 'eThekwini'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetroFilter(m);
                setPageIdx(0);
              }}
              className={`min-h-[32px] px-2.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                metroFilter === m
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400'
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
            className="w-full min-h-[36px] pl-8 pr-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#05070B] text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {pageWards.map((ward) => {
          const isHome = ward.id === activeWard.id;
          return (
            <article
              key={ward.id}
              className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 overflow-hidden"
            >
              {/* Free ward location map preview */}
              <MiniMapPreview
                lat={ward.lat}
                lng={ward.lng}
                zoom={12}
                darkMode={isDarkTheme()}
                label={`Ward ${ward.wardNumber} · ${ward.suburbs[0]}`}
                className="h-24 w-full"
              />

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-sky-600 dark:text-sky-400 truncate">
                      {ward.municipalityName} ({MUNICIPALITIES[ward.municipalityCode].totalWards} wards)
                    </div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
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

                <div className="h-1 bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${ward.councillor.resolutionScore}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <AvatarPlaceholder name={ward.councillor.name} className="w-9 h-9 text-[11px]" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {ward.councillor.name} ({ward.councillor.party})
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ward.councillor.email}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{ward.councillor.whatsappEscalation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
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

                <div className="p-2.5 bg-slate-50 dark:bg-white/[0.03] text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {ward.depots.water} · {ward.depots.electricity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-mono text-slate-400">
                    {ward.lat.toFixed(3)}, {ward.lng.toFixed(3)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBindWard(ward.id)}
                    className={`min-h-[36px] px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isHome
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
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
};

interface RewardsViewProps {
  user: UserProfile;
  transactions: RewardTransaction[];
  onRedeemOffer: (offerId: string, cost: number, title: string) => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
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
      <div className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
            CivicRewards Citizen Stewardship Ledger
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>{user.credits} Civic Credits</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            +50 CR verified photo · +30 CR fix check · +15 CR neighbour +1
          </p>
        </div>

        <div className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs shrink-0">
          <div className="font-display font-bold text-slate-900 dark:text-white">{user.tier}</div>
          <div className="font-mono text-[11px] text-slate-500">{user.mobileZa}</div>
        </div>
      </div>

      {issuedVoucher && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
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

      {/* Mobile Tab Switch (Zero Endless Vertical Scroll) */}
      <div className="grid grid-cols-2 lg:hidden border border-slate-200 dark:border-white/15 p-1 bg-slate-100 dark:bg-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('redeem')}
          className={`min-h-[36px] text-xs font-semibold cursor-pointer ${
            activeTab === 'redeem'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Redeem Vouchers ({REWARD_OFFERS.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`min-h-[36px] text-xs font-semibold cursor-pointer ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Ledger History ({transactions.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Partner Redemptions */}
        <section
          className={`${activeTab === 'redeem' ? 'block' : 'hidden lg:block'} lg:col-span-7 space-y-2.5`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              SA Partner Vouchers & Airtime
            </h2>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] text-slate-400 mr-1">
                {offerPage + 1}/{offerPages}
              </span>
              <button
                type="button"
                disabled={offerPage === 0}
                onClick={() => setOfferPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={offerPage >= offerPages - 1}
                onClick={() => setOfferPage((p) => Math.min(offerPages - 1, p + 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
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
                  className="bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarPlaceholder name={offer.partner} className="w-8 h-8 text-[10px]" />
                        <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 truncate">
                          {offer.partner}
                        </span>
                      </div>
                      <span className="shrink-0 w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-amber-600 dark:text-amber-400">
                        <RewardCategoryIcon category={offer.category} />
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{offer.title}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{offer.description}</p>
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
                    className="w-full min-h-[38px] bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
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
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Points Ledger History
            </h2>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[11px] text-slate-400 mr-1">
                {txPage + 1}/{txPages}
              </span>
              <button
                type="button"
                disabled={txPage === 0}
                onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 dark:border-white/15 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={txPage >= txPages - 1}
                onClick={() => setTxPage((p) => Math.min(txPages - 1, p + 1))}
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
};
