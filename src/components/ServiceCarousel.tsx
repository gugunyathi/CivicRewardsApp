import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Droplets,
  Lightbulb,
  Lock,
  Route,
  Shield,
  Trash2,
  Trees,
  Waves,
  Zap,
} from 'lucide-react';
import type { CivicReport, ServiceCategory, ServiceCategoryId, WardRecord } from '../types/civic';
import type { CardTimeMode } from '../utils/sastTime';
import { SmartImage } from './SmartImage';

export const SERVICE_INDICATOR_META: Record<
  ServiceCategoryId,
  {
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    overlayClass: string;
  }
> = {
  water: {
    icon: Droplets,
    colorClass: 'text-sky-700 dark:text-sky-400',
    overlayClass: 'text-sky-300',
  },
  electricity: {
    icon: Zap,
    colorClass: 'text-orange-600 dark:text-amber-400',
    overlayClass: 'text-amber-300',
  },
  waste: {
    icon: Trash2,
    colorClass: 'text-slate-800 dark:text-slate-300',
    overlayClass: 'text-slate-200',
  },
  sanitation: {
    icon: Waves,
    colorClass: 'text-teal-700 dark:text-teal-400',
    overlayClass: 'text-teal-300',
  },
  roads: {
    icon: Route,
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    overlayClass: 'text-emerald-300',
  },
  streetlights: {
    icon: Lightbulb,
    colorClass: 'text-amber-600 dark:text-yellow-300',
    overlayClass: 'text-yellow-300',
  },
  parks: {
    icon: Trees,
    colorClass: 'text-green-700 dark:text-green-400',
    overlayClass: 'text-green-300',
  },
  safety: {
    icon: Shield,
    colorClass: 'text-blue-700 dark:text-blue-400',
    overlayClass: 'text-blue-300',
  },
  accounts: {
    icon: CreditCard,
    colorClass: 'text-cyan-700 dark:text-cyan-400',
    overlayClass: 'text-cyan-300',
  },
  anticorruption: {
    icon: Lock,
    colorClass: 'text-rose-700 dark:text-rose-400',
    overlayClass: 'text-rose-300',
  },
  notices: {
    icon: ClipboardList,
    colorClass: 'text-indigo-700 dark:text-indigo-400',
    overlayClass: 'text-indigo-300',
  },
};

interface ServiceCarouselProps {
  categories: ServiceCategory[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onTriggerCategory: (categoryId: ServiceCategoryId) => void;
  activeWard: WardRecord;
  cardTimeMode: CardTimeMode;
  reports: CivicReport[];
  onOpenFeedReport: (reportId?: string) => void;
}

export const ServiceCarousel: React.FC<ServiceCarouselProps> = React.memo(({
  categories,
  activeIndex,
  onSelectIndex,
  onTriggerCategory,
  activeWard,
  cardTimeMode,
  reports,
  onOpenFeedReport,
}) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const activeCategory = categories[activeIndex] ?? categories[0];
  const hasUpcomingCards = activeIndex < categories.length - 1;

  const latestWardReport = React.useMemo(() => {
    const matches = reports.filter(
      (r) =>
        r.wardId === activeWard.id &&
        r.categoryId === activeCategory.id &&
        r.status !== 'Blocked by AI Forensics'
    );
    if (matches.length === 0) return null;
    return matches.reduce((latest, curr) => {
      const latestTs = new Date(latest.createdAtIso).getTime() || 0;
      const currTs = new Date(curr.createdAtIso).getTime() || 0;
      return currTs > latestTs ? curr : latest;
    });
  }, [reports, activeWard.id, activeCategory.id]);

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
        didSwipeRef.current = false;
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }}
      onTouchMove={(e) => {
        if (!touchStart.current) return;
        const dx = e.touches[0].clientX - touchStart.current.x;
        const dy = e.touches[0].clientY - touchStart.current.y;
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          didSwipeRef.current = true;
          setSwipeOffset(Math.max(-56, Math.min(56, dx * 0.4)));
        }
      }}
      onTouchEnd={(e) => {
        setSwipeOffset(0);
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
          e.stopPropagation();
          if (dx < 0) handleNext();
          else handlePrev();
        }
      }}
      onTouchCancel={() => {
        touchStart.current = null;
        didSwipeRef.current = false;
        setSwipeOffset(0);
      }}
      className="relative flex-1 flex flex-col justify-between rounded-2xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-[#111827] shadow-sm overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_50%_0%,rgba(5,150,105,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.10),transparent_70%)]"
      />

      <div className="relative flex-1 flex flex-col justify-between p-3 sm:p-4 gap-3">
        {/* Carousel Track + Floating Edge Arrow Indicators */}
        <div className="relative overflow-hidden rounded-2xl touch-pan-y">
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
            style={
              swipeOffset !== 0
                ? { transform: `translate3d(${swipeOffset}px, 0, 0)` }
                : undefined
            }
            className="flex items-stretch gap-2 sm:gap-2.5 transition-transform duration-150 ease-out"
          >
            {categories.map((cat, idx) => {
              if (idx < activeIndex) return null;
              const isActive = idx === activeIndex;
              const numLabel = String(idx + 1).padStart(2, '0');
              const meta = SERVICE_INDICATOR_META[cat.id];
              const ThumbIcon = meta.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (didSwipeRef.current) {
                      didSwipeRef.current = false;
                      return;
                    }
                    if (isActive) {
                      onTriggerCategory(cat.id);
                    } else {
                      onSelectIndex(idx);
                    }
                  }}
                  aria-label={`${cat.title} (${numLabel})`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`group relative shrink-0 text-left rounded-2xl overflow-hidden transition-[width,opacity,border-color] duration-200 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                    isActive
                      ? `${
                          hasUpcomingCards
                            ? 'w-[calc(100%-68px)] sm:w-[460px] lg:w-[560px]'
                            : 'w-full sm:max-w-[680px]'
                        } h-[clamp(320px,50dvh,500px)] sm:h-[clamp(430px,58dvh,590px)] lg:h-[clamp(470px,60dvh,630px)] border-2 border-emerald-600 dark:border-emerald-400`
                      : 'w-[80px] sm:w-[100px] lg:w-[116px] hover:sm:w-[132px] h-[clamp(320px,50dvh,500px)] sm:h-[clamp(430px,58dvh,590px)] lg:h-[clamp(470px,60dvh,630px)] border border-slate-300 dark:border-white/[0.08] opacity-90 hover:opacity-100'
                  }`}
                >
                  <SmartImage
                    src={cardTimeMode === 'am' ? cat.dayImageUrl : cat.imageUrl}
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
                        ? 'bg-gradient-to-b from-slate-950/75 via-slate-950/10 to-slate-950/85'
                        : 'bg-gradient-to-b from-slate-950/80 via-slate-950/15 to-slate-950/85'
                    }`}
                  />

                  {isActive ? (
                    <>
                      {/* TOP: Card Name + Icon */}
                      <div className="absolute top-3 left-3.5 right-3.5 flex items-center gap-2 text-white">
                        <span className="w-8 h-8 rounded-lg bg-slate-950/70 border border-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <ThumbIcon className={`w-4 h-4 ${meta.overlayClass}`} />
                        </span>
                        <span className="font-display text-base sm:text-xl font-extrabold uppercase tracking-wider text-white drop-shadow-sm truncate">
                          {cat.shortTitle}
                        </span>
                      </div>

                      {/* BOTTOM: Card Number + SLA */}
                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between gap-2 text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-white bg-slate-950/65 border border-white/20 rounded-lg px-2 py-1 backdrop-blur-sm">
                            {numLabel}
                          </span>
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-white bg-slate-950/65 border border-white/20 rounded-lg px-2 py-1 backdrop-blur-sm">
                            {cat.slaHours > 0 ? `${cat.slaHours}h SLA` : 'Portal'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-white/90 hidden sm:inline shrink-0">
                          Tap card to open
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* TOP: Icon + Card Name */}
                      <div className="absolute top-2.5 inset-x-0 px-2 flex flex-col items-start gap-1 text-white">
                        <ThumbIcon className={`w-4 h-4 ${meta.overlayClass} shrink-0`} />
                        <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide leading-tight line-clamp-2 w-full">
                          {cat.shortTitle}
                        </span>
                      </div>

                      {/* BOTTOM: Card Number + SLA */}
                      <div className="absolute bottom-2.5 inset-x-0 px-2 flex items-center justify-between gap-1 text-white font-mono text-[10px] font-semibold tabular-nums">
                        <span className="bg-slate-950/65 border border-white/20 rounded px-1.5 py-0.5">
                          {numLabel}
                        </span>
                        <span className="text-white/90 truncate">
                          {cat.slaHours > 0 ? `${cat.slaHours}h` : 'Portal'}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single-Row Service-Icon Indicator Boxes */}
        <div
          className="grid grid-cols-11 gap-1 sm:gap-1.5 w-full"
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
                className={`h-9 sm:h-10 w-full rounded-xl flex items-center justify-center border transition-[border-color,background-color,transform] duration-150 cursor-pointer active:scale-95 ${
                  active
                    ? 'border-2 border-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-400/15 shadow-xs'
                    : 'border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-slate-500 dark:hover:border-white/20'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${meta.colorClass}`} />
              </button>
            );
          })}
        </div>

        {/* Compact Live Ward Status Update Bar */}
        <div className="pt-2 border-t border-slate-300/80 dark:border-white/[0.08]">
          {activeCategory.isInfoModule ? (
            <button
              type="button"
              onClick={() => onTriggerCategory(activeCategory.id)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-emerald-700 dark:hover:border-emerald-400/50 flex items-center justify-between gap-2.5 text-left cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold truncate">
                  {activeCategory.shortTitle} · {activeCategory.entity}
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {activeCategory.description}
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                <span>Open</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : latestWardReport ? (
            <button
              type="button"
              onClick={() => onOpenFeedReport(latestWardReport.id)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-emerald-700 dark:hover:border-emerald-400/50 flex items-center justify-between gap-2.5 text-left cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    latestWardReport.status === 'Resolved'
                      ? 'bg-emerald-600'
                      : latestWardReport.severity === 'CRITICAL'
                        ? 'bg-red-600 animate-pulse'
                        : latestWardReport.status === 'Escalated to Depot' ||
                            latestWardReport.status === 'Technician Dispatched'
                          ? 'bg-amber-600'
                          : 'bg-sky-600'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate tabular-nums">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      W{activeWard.wardNumber} LIVE
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        latestWardReport.status === 'Resolved'
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : latestWardReport.severity === 'CRITICAL'
                            ? 'text-red-700 dark:text-red-400 font-semibold'
                            : 'text-slate-800 dark:text-slate-200 font-semibold'
                      }
                    >
                      {latestWardReport.status}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{latestWardReport.timeAgoLabel}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {latestWardReport.title}
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span>Live Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenFeedReport()}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-emerald-700 dark:hover:border-emerald-400/50 flex items-center justify-between gap-2.5 text-left cursor-pointer active:scale-[0.99] transition-[border-color,transform] duration-150"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate">
                  W{activeWard.wardNumber} LIVE · {activeCategory.shortTitle}
                </div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  No recent {activeCategory.shortTitle.toLowerCase()} incidents in Ward {activeWard.wardNumber}
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span>Live Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
});

ServiceCarousel.displayName = 'ServiceCarousel';
