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
import { SmartImage } from './SmartImage';

export const SERVICE_INDICATOR_META: Record<
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

export const ServiceCarousel: React.FC<ServiceCarouselProps> = React.memo(({
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
  const ActiveIcon = SERVICE_INDICATOR_META[activeCategory.id].icon;

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
      className="relative flex-1 flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_50%_0%,rgba(5,150,105,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.10),transparent_70%)]"
      />

      <div className="relative flex-1 flex flex-col justify-between p-3 sm:p-4 gap-3">
        {/* Carousel Track + Floating Edge Arrow Indicators */}
        <div className="relative">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Scroll categories left"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-xl bg-slate-900/65 hover:bg-slate-900/85 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer active:scale-95 transition-[background-color,transform] duration-150"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Scroll categories right"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-xl bg-slate-900/65 hover:bg-slate-900/85 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer active:scale-95 transition-[background-color,transform] duration-150"
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
              const meta = SERVICE_INDICATOR_META[cat.id];
              const ThumbIcon = meta.icon;

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
                  className={`group relative shrink-0 snap-center text-left rounded-2xl overflow-hidden transition-[width,opacity,border-color] duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                    isActive
                      ? 'w-[76vw] sm:w-[480px] lg:w-[580px] h-[clamp(350px,54dvh,520px)] sm:h-[clamp(440px,60dvh,600px)] lg:h-[clamp(480px,62dvh,640px)] border-2 border-emerald-600 dark:border-emerald-400'
                      : 'w-[18vw] sm:w-[88px] lg:w-[112px] hover:sm:w-[132px] h-[clamp(350px,54dvh,520px)] sm:h-[clamp(440px,60dvh,600px)] lg:h-[clamp(480px,62dvh,640px)] border border-slate-200/80 dark:border-white/[0.08] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SmartImage
                    src={cat.imageUrl}
                    alt={cat.title}
                    categoryId={cat.id}
                    label={cat.shortTitle}
                    eager={isActive}
                    className="w-full h-full"
                    imgClassName={`w-full h-full object-cover transition-transform duration-300 ease-out ${
                      isActive ? 'scale-100' : 'scale-105 group-hover:scale-100'
                    }`}
                  />

                  <div
                    className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${
                      isActive
                        ? 'bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/15'
                        : 'bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/15'
                    }`}
                  />

                  {isActive && (
                    <>
                      <span className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="w-8 h-8 rounded-lg bg-slate-950/65 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                          <ThumbIcon className={`w-4 h-4 ${meta.colorClass}`} />
                        </span>
                        <span className="font-mono text-[11px] font-medium tabular-nums text-white/95 bg-slate-950/65 border border-white/20 rounded-lg px-2 py-1 backdrop-blur-sm">
                          {numLabel}
                        </span>
                      </span>
                      <span className="absolute top-3 right-3 font-mono text-[10px] font-semibold tabular-nums text-white bg-slate-950/65 border border-white/20 rounded-lg px-2 py-1 backdrop-blur-sm">
                        {cat.slaHours > 0 ? `${cat.slaHours}h SLA` : 'Portal'}
                      </span>
                    </>
                  )}

                  {!isActive ? (
                    <div className="absolute inset-x-0 bottom-2.5 px-2 flex flex-col items-start gap-1 text-white">
                      <ThumbIcon className={`w-4 h-4 ${meta.colorClass}`} />
                      <span className="text-[10px] font-semibold leading-tight truncate w-full">
                        {cat.shortTitle}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white">
                      <span className="text-xs font-medium text-white/95 truncate">
                        {cat.entity}
                      </span>
                      <span className="text-[11px] font-medium text-white/80 hidden sm:inline shrink-0">
                        Tap card to open
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single-Row 10 Service-Icon Indicator Boxes */}
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
                className={`h-9 sm:h-10 w-full rounded-xl flex items-center justify-center border transition-[border-color,background-color,opacity,transform] duration-150 cursor-pointer active:scale-95 ${
                  active
                    ? 'border-emerald-600 bg-emerald-600/10 dark:border-emerald-400 dark:bg-emerald-400/15'
                    : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20 opacity-80 hover:opacity-100'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${meta.colorClass}`} />
              </button>
            );
          })}
        </div>

        {/* Expanded Card Name & Service Details Footer */}
        <div className="pt-3 pb-0.5 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="font-display text-base sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center border border-emerald-600/25 bg-emerald-600/10 dark:border-emerald-400/25 dark:bg-emerald-400/10">
                <ActiveIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span className="truncate">{activeCategory.title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
              {activeCategory.description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Ward {activeWard.wardNumber} · {activeWard.suburbs[0]}</span>
              <span aria-hidden="true">·</span>
              <span>{activeCategory.entity}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                {activeCategory.slaHours > 0 ? `${activeCategory.slaHours}h SLA` : 'Direct Portal'}
              </span>
              {!activeCategory.isInfoModule && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    +50 CR
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onTriggerCategory(activeCategory.id)}
              className={`min-h-[48px] px-5 sm:px-7 py-2.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 ${
                activeCategory.isInfoModule
                  ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs sm:text-sm font-semibold'
                  : 'bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-sm'
              }`}
            >
              {activeCategory.isInfoModule ? (
                <>
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4" />
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
});

ServiceCarousel.displayName = 'ServiceCarousel';
