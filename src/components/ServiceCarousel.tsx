import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Droplets,
  Lightbulb,
  Lock,
  Plus,
  Route,
  Shield,
  Trash2,
  Trees,
  Zap,
} from 'lucide-react';
import type { ServiceCategory, ServiceCategoryId, WardRecord } from '../types/civic';

const SERVICE_INDICATOR_META: Record<
  ServiceCategoryId,
  { icon: React.ComponentType<{ className?: string }>; colorClass: string }
> = {
  water: { icon: Droplets, colorClass: 'text-sky-500 dark:text-sky-400' },
  electricity: { icon: Zap, colorClass: 'text-amber-500 dark:text-amber-400' },
  roads: { icon: Route, colorClass: 'text-emerald-600 dark:text-emerald-400' },
  streetlights: { icon: Lightbulb, colorClass: 'text-yellow-500 dark:text-yellow-300' },
  waste: { icon: Trash2, colorClass: 'text-slate-600 dark:text-slate-300' },
  parks: { icon: Trees, colorClass: 'text-green-600 dark:text-green-400' },
  safety: { icon: Shield, colorClass: 'text-blue-600 dark:text-blue-400' },
  accounts: { icon: CreditCard, colorClass: 'text-cyan-600 dark:text-cyan-400' },
  anticorruption: { icon: Lock, colorClass: 'text-rose-600 dark:text-rose-400' },
  notices: { icon: ClipboardList, colorClass: 'text-indigo-600 dark:text-indigo-400' },
};

interface ServiceCarouselProps {
  categories: ServiceCategory[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onTriggerCategory: (categoryId: ServiceCategoryId) => void;
  activeWard: WardRecord;
}

export const ServiceCarousel: React.FC<ServiceCarouselProps> = ({
  categories,
  activeIndex,
  onSelectIndex,
  onTriggerCategory,
  activeWard,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const activeCategory = categories[activeIndex] ?? categories[0];

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el && trackRef.current) {
      el.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIndex]);

  const handlePrev = () => {
    onSelectIndex((activeIndex - 1 + categories.length) % categories.length);
  };

  const handleNext = () => {
    onSelectIndex((activeIndex + 1) % categories.length);
  };

  return (
    <section
      aria-label="Smart Service Categories Gallery"
      onTouchStart={(e) => {
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          e.stopPropagation();
          if (dx < 0) handleNext();
          else handlePrev();
        }
      }}
      className="relative border border-slate-200 dark:border-white/12 bg-white dark:bg-[#060911] overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.16),transparent_70%)]"
      />

      <div className="relative p-2.5 sm:p-4 space-y-2.5">
        {/* Carousel Track + Floating Edge Arrow Indicators */}
        <div className="relative">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Scroll categories left"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Scroll categories right"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 bg-black/55 hover:bg-black/80 text-white border border-white/25 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={trackRef}
            className="flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory touch-pan-x"
          >
            {categories.map((cat, idx) => {
              const isActive = idx === activeIndex;
              const numLabel = String(idx + 1).padStart(2, '0');

              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      onTriggerCategory(cat.id);
                    } else {
                      onSelectIndex(idx);
                    }
                  }}
                  aria-label={`${cat.title} (${numLabel})`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`group relative shrink-0 snap-center text-left overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    isActive
                      ? 'w-[74vw] sm:w-[460px] lg:w-[540px] h-[270px] sm:h-[360px] lg:h-[400px] border border-sky-500/85 dark:border-sky-400/85'
                      : 'w-[19vw] sm:w-[84px] lg:w-[106px] hover:sm:w-[126px] h-[270px] sm:h-[360px] lg:h-[400px] border border-slate-200 dark:border-white/15 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={cat.imageUrl}
                    alt={cat.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isActive ? 'scale-100' : 'scale-105 group-hover:scale-100'
                    }`}
                  />

                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isActive
                        ? 'bg-gradient-to-t from-black/55 via-transparent to-black/10'
                        : 'bg-gradient-to-t from-black/80 via-black/25 to-black/15'
                    }`}
                  />

                  {isActive && (
                    <>
                      <span className="absolute top-0 left-0 w-2 h-2 border-r border-b border-sky-400 bg-white dark:bg-[#060911]" />
                      <span className="absolute top-0 right-0 w-2 h-2 border-l border-b border-sky-400 bg-white dark:bg-[#060911]" />
                      <span className="absolute bottom-0 left-0 w-2 h-2 border-r border-t border-sky-400 bg-white dark:bg-[#060911]" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 border-l border-t border-sky-400 bg-white dark:bg-[#060911]" />
                    </>
                  )}

                  {!isActive ? (
                    <div className="absolute inset-x-0 bottom-2 px-1.5 flex flex-col items-start gap-0.5 text-white">
                      <span className="text-[10px] font-semibold leading-tight truncate w-full">
                        {cat.shortTitle}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                      <span className="font-mono text-[11px] text-white/90 truncate">
                        {cat.entity}
                      </span>
                      <span className="text-[11px] font-medium text-white/80 hidden sm:inline shrink-0">
                        Tap photo to open
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single-Row 10 Service-Icon Indicator Boxes (Fits cleanly within mobile screen width) */}
        <div
          className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full"
          role="tablist"
          aria-label="Service category indicators"
        >
          {categories.map((cat, idx) => {
            const active = idx === activeIndex;
            const meta = SERVICE_INDICATOR_META[cat.id];
            const Icon = meta.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                title={cat.title}
                aria-label={`Select ${cat.title}`}
                aria-selected={active}
                className={`h-8 sm:h-9 w-full flex items-center justify-center border transition-all cursor-pointer ${
                  active
                    ? 'border-sky-500 bg-sky-500/15 dark:border-sky-400 dark:bg-sky-400/20'
                    : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:border-slate-400 dark:hover:border-white/40 opacity-80 hover:opacity-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${meta.colorClass}`} />
              </button>
            );
          })}
        </div>

        {/* Compact Editorial Footer Bar */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-white/15 flex items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <h2 className="font-display text-sm sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {activeCategory.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
              Ward {activeWard.wardNumber} ({activeWard.suburbs[0]}) · {activeCategory.description}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:block text-right font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
              <div>{activeCategory.slaHours > 0 ? `${activeCategory.slaHours}H SLA` : 'PORTAL'}</div>
              <div className="text-sky-700 dark:text-sky-400">
                {activeCategory.isInfoModule ? 'DIRECT' : '+50 CR'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTriggerCategory(activeCategory.id)}
              className={`min-h-[44px] px-4 sm:px-6 py-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory.isInfoModule
                  ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs font-semibold'
                  : 'bg-red-600 hover:bg-red-700 text-white border border-red-500 text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-lg shadow-red-600/25'
              }`}
            >
              {activeCategory.isInfoModule ? (
                <>
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>REPORT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
