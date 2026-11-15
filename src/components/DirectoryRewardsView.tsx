import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import { MUNICIPALITIES, SEED_WARDS } from '../data/civicSeedData';
import type {
  MunicipalityCode,
  WardRecord,
} from '../types/civic';
import { MiniMapPreview } from './MiniMapPreview';
import { AvatarPlaceholder } from './SmartImage';

interface DirectoryViewProps {
  activeWard: WardRecord;
  onBindWard: (wardId: string) => void;
}

const isDarkTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export const DirectoryView: React.FC<DirectoryViewProps> = React.memo(({ activeWard, onBindWard }) => {
  const [metroFilter, setMetroFilter] = useState<'ALL' | MunicipalityCode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

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

  const pageWards = showAll ? filteredWards : filteredWards.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ward & Councillor Directory
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {filteredWards.length} SA metro wards · Search by suburb, street, or councillor
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['ALL', 'CoJ', 'CoCT', 'CoT', 'eThekwini'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetroFilter(m);
              }}
              className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                metroFilter === m
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {m === 'ALL' ? 'All Metros' : m}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suburb, street, ward # or councillor..."
            className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-xs text-slate-950 dark:text-white placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-[border-color,box-shadow,background-color] duration-150"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageWards.map((ward) => {
          const isHome = ward.id === activeWard.id;
          return (
            <article
              key={ward.id}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.06)] overflow-hidden"
            >
              <MiniMapPreview
                lat={ward.lat}
                lng={ward.lng}
                zoom={12}
                darkMode={isDarkTheme()}
                label={`Ward ${ward.wardNumber} · ${ward.suburbs[0]}`}
                className="h-24 w-full rounded-none border-0 border-b border-slate-300 dark:border-white/[0.08]"
              />

              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
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
                    <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">SLA Score</div>
                  </div>
                </div>

                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden">
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
                      <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ward.councillor.email}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1 text-[11px] tabular-nums">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{ward.councillor.whatsappEscalation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
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

                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-300 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span className="truncate">
                      {ward.depots.water} · {ward.depots.electricity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                    {ward.lat.toFixed(3)}, {ward.lng.toFixed(3)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBindWard(ward.id)}
                    className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150 ${
                      isHome
                        ? 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300 border border-emerald-700/45'
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

      {filteredWards.length > 4 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="min-h-[40px] px-5 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] hover:border-slate-500 dark:hover:border-white/20 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-[border-color,transform] duration-150 tabular-nums"
          >
            {showAll ? 'Show fewer wards' : `Show all ${filteredWards.length} wards`}
          </button>
        </div>
      )}
    </div>
  );
});

DirectoryView.displayName = 'DirectoryView';
