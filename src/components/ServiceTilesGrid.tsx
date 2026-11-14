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

export const ServiceTilesGrid: React.FC<ServiceTilesGridProps> = ({
  categories,
  activeIndex,
  onSelectIndex,
  onTriggerCategory,
  activeWard,
}) => {
  return (
    <section
      aria-label="Smart Service Categories Tiles"
      className="border border-slate-200 dark:border-white/12 bg-white dark:bg-[#060911] p-2.5 sm:p-4 space-y-2.5"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
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
              className={`group relative h-[132px] sm:h-[164px] lg:h-[188px] text-left overflow-hidden border transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                isSelected
                  ? 'border-sky-500 ring-1 ring-sky-500/40 dark:border-sky-400'
                  : 'border-slate-200 dark:border-white/15 hover:border-sky-500/70'
              }`}
            >
              <SmartImage
                src={cat.imageUrl}
                alt={cat.title}
                categoryId={cat.id}
                label={cat.shortTitle}
                eager={idx < 4}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

              {/* Top Row: Icon + Index & SLA */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                <span className="w-7 h-7 bg-black/65 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${meta.colorClass}`} />
                </span>
                <span className="font-mono text-[10px] text-white/90 bg-black/65 border border-white/20 px-1.5 py-0.5 truncate">
                  {cat.slaHours > 0 ? `${cat.slaHours}H SLA` : 'PORTAL'}
                </span>
              </div>

              {/* Bottom Title + Action Strip */}
              <div className="absolute bottom-2 left-2 right-2 space-y-1.5">
                <div>
                  <div className="font-display text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1">
                    {cat.title}
                  </div>
                  <div className="font-mono text-[10px] text-white/75 truncate">
                    {cat.entity}
                  </div>
                </div>

                {cat.isInfoModule ? (
                  <div className="w-full py-1 px-2 bg-white/90 text-slate-950 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Open Portal</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-full py-1 px-2 bg-red-600 group-hover:bg-red-700 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between shadow-md shadow-red-600/30">
                    <span>REPORT</span>
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-white/15 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate">
          Ward {activeWard.wardNumber} ({activeWard.suburbs?.[0]}) · Tap any tile to report or open portal
        </span>
        <span className="font-mono shrink-0 text-sky-600 dark:text-sky-400">
          10 Services · Tiles
        </span>
      </div>
    </section>
  );
};
