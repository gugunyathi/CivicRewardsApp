import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import type { ServiceCategory, ServiceCategoryId, WardRecord } from '../types/civic';
import { SERVICE_INDICATOR_META } from './ServiceCarousel';
import { SmartImage } from './SmartImage';

interface ServiceTilesGridProps {
  categories: ServiceCategory[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onTriggerCategory: (categoryId: ServiceCategoryId) => void;
  activeWard: WardRecord;
}

export const ServiceTilesGrid: React.FC<ServiceTilesGridProps> = React.memo(({
  categories,
  activeIndex,
  onSelectIndex,
  onTriggerCategory,
  activeWard,
}) => {
  return (
    <section
      aria-label="Smart Service Categories Tiles"
      className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-3 sm:p-4 space-y-3"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {categories.map((cat, idx) => {
          const isSelected = idx === activeIndex;
          const meta = SERVICE_INDICATOR_META[cat.id];
          const Icon = meta.icon;
          const numLabel = String(idx + 1).padStart(2, '0');

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectIndex(idx);
                onTriggerCategory(cat.id);
              }}
              aria-label={`${cat.title} (${numLabel})`}
              className={`group relative h-[138px] sm:h-[168px] lg:h-[188px] rounded-xl text-left overflow-hidden border transition-[border-color,transform] duration-150 ease-out cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 dark:border-emerald-400 dark:ring-emerald-400/20'
                  : 'border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-600/60 dark:hover:border-emerald-400/60'
              }`}
            >
              <SmartImage
                src={cat.imageUrl}
                alt={cat.title}
                categoryId={cat.id}
                label={cat.shortTitle}
                eager={idx < 4}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20" />

              {/* Top Row: Icon + SLA */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                <span className="w-7 h-7 rounded-lg bg-slate-950/65 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${meta.colorClass}`} />
                </span>
                <span className="font-mono text-[10px] font-medium tabular-nums text-white/95 bg-slate-950/65 border border-white/20 rounded-md px-1.5 py-0.5 truncate">
                  {cat.slaHours > 0 ? `${cat.slaHours}h SLA` : 'Portal'}
                </span>
              </div>

              {/* Bottom Title + Action Strip */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1.5">
                <div>
                  <div className="font-display text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1 tracking-tight">
                    {cat.title}
                  </div>
                  <div className="text-[10px] text-white/75 truncate">
                    {cat.entity}
                  </div>
                </div>

                {cat.isInfoModule ? (
                  <div className="w-full py-1 px-2 rounded-lg bg-white/95 text-slate-950 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Open Portal</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-full py-1 px-2 rounded-lg bg-red-600 group-hover:bg-red-700 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between transition-colors duration-150">
                    <span>REPORT</span>
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate">
          Ward {activeWard.wardNumber} ({activeWard.suburbs?.[0]}) · Tap any tile to report
        </span>
        <span className="font-medium shrink-0 text-emerald-600 dark:text-emerald-400 tabular-nums">
          10 Services · Tiles
        </span>
      </div>
    </section>
  );
});

ServiceTilesGrid.displayName = 'ServiceTilesGrid';
