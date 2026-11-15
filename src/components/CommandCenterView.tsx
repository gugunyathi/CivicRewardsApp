import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GalleryHorizontalEnd,
  LayoutGrid,
  Lock,
  MapPin,
  Moon,
  Pencil,
  PhoneCall,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import { MUNICIPALITIES, PUBLIC_NOTICES_DATA, SERVICE_CATEGORIES } from '../data/civicSeedData';
import type {
  CivicReport,
  ServiceCategoryId,
  UserProfile,
  WardRecord,
} from '../types/civic';
import type { CardTimeMode } from '../utils/sastTime';
import { ServiceCarousel } from './ServiceCarousel';
import { ServiceTilesGrid } from './ServiceTilesGrid';

interface CommandCenterViewProps {
  activeWard: WardRecord;
  user: UserProfile;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  onOpenReportModal: (categoryId: ServiceCategoryId) => void;
  onOpenAuthModal: () => void;
  servicesLayout: 'carousel' | 'tiles';
  onChangeServicesLayout: (layout: 'carousel' | 'tiles') => void;
  cardTimeMode: CardTimeMode;
  onChangeCardTimeMode: (mode: CardTimeMode) => void;
  reports: CivicReport[];
  onOpenFeedReport: (reportId?: string) => void;
}

const INCOME_BRACKETS = [
  { id: 'under-3500', value: '3200', label: 'Under R3,500 / mo', plan: '100% Indigent / ESP Rebate + 10kL Free Water' },
  { id: '3500-7500', value: '6200', label: 'R3,500 – R7,500 / mo', plan: '50%–100% Expanded Social Package Rebate' },
  { id: '7500-15000', value: '11000', label: 'R7,500 – R15,000 / mo', plan: '50% Arrears Write-off (24-mo Payment Plan)' },
  { id: 'over-15000', value: '18500', label: 'Over R15,000 / mo', plan: 'Standard Municipal Tariff & Meter Audit' },
];

const ACCOUNT_QUERY_TYPES = [
  'Indigent / ESP Rebate Application',
  '50% Arrears Write-Off Arrangement',
  'Submit Actual Water/Power Meter Reading',
  'Billing / Estimated Charge Dispute',
];

const WHISTLE_CATEGORIES = [
  'Bribery or Kickback Solicitation',
  'Illegal Water / Electricity Connection',
  'Tender / Procurement Irregularity',
  'Ghost Contractor / Unfinished Repair',
];

export const CommandCenterView: React.FC<CommandCenterViewProps> = React.memo(({
  activeWard,
  user,
  emergencyMode,
  onToggleEmergency,
  onOpenReportModal,
  onOpenAuthModal,
  servicesLayout,
  onChangeServicesLayout,
  cardTimeMode,
  onChangeCardTimeMode,
  reports,
  onOpenFeedReport,
}) => {
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const activeCategory = SERVICE_CATEGORIES[activeCategoryIdx] ?? SERVICE_CATEGORIES[0];
  const [infoDrawer, setInfoDrawer] = useState<'accounts' | 'anticorruption' | 'notices' | null>(null);

  // Accounts survey state
  const [accountsStep, setAccountsStep] = useState<1 | 2 | 3>(1);
  const [incomeBracket, setIncomeBracket] = useState(INCOME_BRACKETS[0]);
  const [accountQueryType, setAccountQueryType] = useState(ACCOUNT_QUERY_TYPES[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [accountQuerySent, setAccountQuerySent] = useState(false);

  // Whistleblowing survey state
  const [whistleStep, setWhistleStep] = useState<1 | 2 | 3>(1);
  const [whistleCategory, setWhistleCategory] = useState(WHISTLE_CATEGORIES[0]);
  const [whistleText, setWhistleText] = useState('');
  const [whistleSubmittedRef, setWhistleSubmittedRef] = useState<string | null>(null);

  // Notices paged viewer state
  const [noticeIdx, setNoticeIdx] = useState(0);
  const autoTimerRef = useRef<number | null>(null);

  const metroInfo = MUNICIPALITIES[activeWard.municipalityCode] ?? MUNICIPALITIES['CoJ'];

  const handleCategoryTrigger = useCallback((catId: ServiceCategoryId) => {
    if (catId === 'accounts' || catId === 'anticorruption' || catId === 'notices') {
      setAccountsStep(1);
      setAccountQuerySent(false);
      setWhistleStep(1);
      setWhistleSubmittedRef(null);
      setNoticeIdx(0);
      setInfoDrawer(catId);
      return;
    }
    onOpenReportModal(catId);
  }, [onOpenReportModal]);

  const closeInfoDrawer = useCallback(() => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    setInfoDrawer(null);
    setWhistleSubmittedRef(null);
    setAccountQuerySent(false);
  }, []);

  useEffect(() => {
    if (!infoDrawer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInfoDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [infoDrawer, closeInfoDrawer]);

  const currentNotice = PUBLIC_NOTICES_DATA[noticeIdx] ?? PUBLIC_NOTICES_DATA[0];

  const inputClass =
    'w-full h-11 px-3 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-xs font-mono text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 dark:focus:ring-emerald-400/25 dark:focus:border-emerald-400 transition-[border-color,box-shadow,background-color] duration-150';

  return (
    <div className="flex-1 flex flex-col gap-3 sm:gap-4">
      {/* Emergency SOS Banner */}
      {emergencyMode && (
        <section
          aria-live="assertive"
          className="rounded-2xl border border-red-500/40 bg-red-600 text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h2 className="font-display text-sm font-bold tracking-tight">Emergency SOS Active</h2>
              <p className="text-xs text-red-50">
                Reference bypassed · {metroInfo.name}: {metroInfo.emergencyNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenReportModal('electricity')}
              className="min-h-[38px] px-3.5 rounded-xl bg-white text-red-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Log Emergency</span>
            </button>
            <button
              type="button"
              onClick={onToggleEmergency}
              className="min-h-[38px] px-3 rounded-xl border border-red-200/50 hover:bg-red-700/60 text-xs font-semibold cursor-pointer transition-colors duration-150"
            >
              Exit
            </button>
          </div>
        </section>
      )}

      {/* Compact Single-Screen Ward Bar */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                WARD {activeWard.wardNumber} · {activeWard.municipalityCode}
              </span>
              <span aria-hidden="true">/</span>
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">{activeWard.suburbs?.[0]}</span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white tracking-tight truncate">
              Municipal Services
            </h1>
          </div>

          <button
            type="button"
            onClick={() => handleCategoryTrigger(activeCategory.id)}
            className={`shrink-0 min-h-[40px] sm:min-h-[42px] px-4 sm:px-5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 ${
              activeCategory.isInfoModule
                ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 text-xs sm:text-sm font-semibold'
                : 'bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-sm'
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

        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Switch or Find Ward"
            className="min-h-[34px] sm:min-h-[38px] px-2 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 shadow-sm"
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
            <span>My Wards</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <div
              role="group"
              aria-label="Service cards layout"
              className="flex items-center rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-200/80 dark:bg-white/[0.04] p-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => onChangeServicesLayout('carousel')}
                aria-pressed={servicesLayout === 'carousel'}
                aria-label="Cards layout"
                title="Cards layout"
                className={`min-h-[30px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  servicesLayout === 'carousel'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-300/70 dark:border-transparent dark:bg-white dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <GalleryHorizontalEnd className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeServicesLayout('tiles')}
                aria-pressed={servicesLayout === 'tiles'}
                aria-label="Tiles grid layout"
                title="Tiles layout"
                className={`min-h-[30px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  servicesLayout === 'tiles'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-300/70 dark:border-transparent dark:bg-white dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Tiles</span>
              </button>
            </div>

            <div
              role="group"
              aria-label="Daytime AM or Nighttime PM card images"
              className="flex items-center rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-200/80 dark:bg-white/[0.04] p-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => onChangeCardTimeMode('am')}
                aria-pressed={cardTimeMode === 'am'}
                aria-label="Show AM daytime card images"
                title="AM Daytime images (auto 06:00–19:00 SAST)"
                className={`min-h-[30px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  cardTimeMode === 'am'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-300/70 dark:border-transparent dark:bg-white dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600 dark:text-amber-500 shrink-0" />
                <span>AM</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeCardTimeMode('pm')}
                aria-pressed={cardTimeMode === 'pm'}
                aria-label="Show PM nighttime card images"
                title="PM Nighttime images (auto 19:00–06:00 SAST)"
                className={`min-h-[30px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  cardTimeMode === 'pm'
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Moon
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                    cardTimeMode === 'pm'
                      ? 'text-indigo-300 dark:text-indigo-600'
                      : 'text-indigo-700 dark:text-indigo-400'
                  }`}
                />
                <span>PM</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Viewport-Contained Editorial Carousel or Tiles Layout */}
      {servicesLayout === 'tiles' ? (
        <ServiceTilesGrid
          categories={SERVICE_CATEGORIES}
          activeIndex={activeCategoryIdx}
          onSelectIndex={setActiveCategoryIdx}
          onTriggerCategory={handleCategoryTrigger}
          activeWard={activeWard}
          cardTimeMode={cardTimeMode}
        />
      ) : (
        <ServiceCarousel
          categories={SERVICE_CATEGORIES}
          activeIndex={activeCategoryIdx}
          onSelectIndex={setActiveCategoryIdx}
          onTriggerCategory={handleCategoryTrigger}
          activeWard={activeWard}
          cardTimeMode={cardTimeMode}
          reports={reports}
          onOpenFeedReport={onOpenFeedReport}
        />
      )}

      {/* Survey-Style Guided Modal Drawers for Categories 8, 9, 10 */}
      {infoDrawer && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeInfoDrawer();
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm ui-backdrop-enter p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl h-[84dvh] sm:h-[540px] max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-2xl overflow-hidden ui-modal-enter overscroll-contain">
            {/* Pinned Header */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-300 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider tabular-nums">
                  {infoDrawer === 'accounts' && `Step ${accountsStep} of 3 · ${activeWard.municipalityCode} Revenue`}
                  {infoDrawer === 'anticorruption' && `Step ${whistleStep} of 3 · Encrypted Channel`}
                  {infoDrawer === 'notices' && `Notice ${noticeIdx + 1} of ${PUBLIC_NOTICES_DATA.length}`}
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-950 dark:text-white truncate">
                  {infoDrawer === 'accounts' && 'Municipal Accounts & Debt Relief'}
                  {infoDrawer === 'anticorruption' && 'Anti-Corruption Reporting'}
                  {infoDrawer === 'notices' && 'Public Notices & Bylaws'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeInfoDrawer}
                aria-label="Close module"
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-400 cursor-pointer transition-colors duration-150 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guided Survey Body */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-3 overflow-y-auto overscroll-contain">
              {infoDrawer === 'accounts' && (
                <>
                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 rounded-full transition-colors duration-200 ${
                          n <= accountsStep
                            ? 'bg-emerald-600 dark:bg-emerald-400'
                            : 'bg-slate-300 dark:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  {accountsStep === 1 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white">
                        Monthly household income bracket
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Select a bracket to check {activeWard.municipalityName} rebate eligibility.
                      </p>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {INCOME_BRACKETS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setIncomeBracket(b);
                              autoTimerRef.current = window.setTimeout(() => setAccountsStep(2), 180);
                            }}
                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                              incomeBracket.id === b.id
                                ? 'border-emerald-700 bg-emerald-600/10 text-slate-950 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-white'
                                : 'border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-slate-100 hover:border-emerald-700/60'
                            }`}
                          >
                            <span className="text-xs font-semibold">{b.label}</span>
                            <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {accountsStep === 2 && (
                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white">
                          What do you need help with?
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {ACCOUNT_QUERY_TYPES.map((qt) => (
                            <button
                              key={qt}
                              type="button"
                              onClick={() => setAccountQueryType(qt)}
                              className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                                accountQueryType === qt
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 hover:border-slate-500'
                              }`}
                            >
                              {qt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                            9-Digit Account #
                          </label>
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="900412881"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                            Meter Reading
                          </label>
                          <input
                            type="text"
                            value={meterReading}
                            onChange={(e) => setMeterReading(e.target.value)}
                            placeholder="e.g. 04182 kL"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {accountsStep === 3 && (
                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <div className="p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-700/30 dark:bg-emerald-400/10 dark:border-emerald-400/25 space-y-1">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                          Eligibility Match · {activeWard.municipalityCode}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white">
                          {incomeBracket.plan}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setAccountsStep(1)}
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform duration-150"
                        >
                          <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">Household Income</div>
                            <div className="text-xs font-semibold text-slate-950 dark:text-white">{incomeBracket.label}</div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setAccountsStep(2)}
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform duration-150"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">Query & Account</div>
                            <div className="text-xs font-semibold text-slate-950 dark:text-white truncate tabular-nums">
                              {accountQueryType} · #{accountNumber || '900412881'}
                              {meterReading ? ` (${meterReading})` : ''}
                            </div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        </button>
                      </div>

                      {accountQuerySent && (
                        <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-700/30 text-xs font-mono text-emerald-800 dark:text-emerald-300 tabular-nums">
                          Logged: {activeWard.municipalityCode}-REV-{accountNumber || '900412881'}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {infoDrawer === 'anticorruption' && (
                <>
                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 rounded-full transition-colors duration-200 ${
                          n <= whistleStep
                            ? 'bg-emerald-600 dark:bg-emerald-400'
                            : 'bg-slate-300 dark:bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  {whistleStep === 1 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span>Anonymous channel to GFIS & 0800 701 701.</span>
                      </div>
                      <div className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white">
                        Select irregularity type
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {WHISTLE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setWhistleCategory(cat);
                              autoTimerRef.current = window.setTimeout(() => setWhistleStep(2), 180);
                            }}
                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                              whistleCategory === cat
                                ? 'border-emerald-700 bg-emerald-600/10 text-slate-950 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-white'
                                : 'border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-slate-100 hover:border-emerald-700/60'
                            }`}
                          >
                            <span className="text-xs font-semibold">{cat}</span>
                            <ArrowRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {whistleStep === 2 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white">
                        Describe the incident anonymously
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Omit personal names. Include depot, vehicle plate, or date if known.
                      </p>
                      <textarea
                        rows={5}
                        value={whistleText}
                        onChange={(e) => setWhistleText(e.target.value)}
                        placeholder={`Details for "${whistleCategory}" in Ward ${activeWard.wardNumber}...`}
                        className="w-full p-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-[border-color,box-shadow,background-color] duration-150"
                      />
                    </div>
                  )}

                  {whistleStep === 3 && (
                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setWhistleStep(1)}
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform duration-150"
                        >
                          <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">Category</div>
                            <div className="text-xs font-semibold text-slate-950 dark:text-white">{whistleCategory}</div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setWhistleStep(2)}
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-transform duration-150"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">Encrypted Statement</div>
                            <div className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                              {whistleText.trim() || 'Anonymous tip ready for GFIS submission'}
                            </div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        </button>
                      </div>

                      {whistleSubmittedRef && (
                        <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-700/30 text-xs text-emerald-800 dark:text-emerald-300 font-mono tabular-nums">
                          Token: {whistleSubmittedRef} · Zero identity metadata stored.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {infoDrawer === 'notices' && currentNotice && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-300 dark:border-white/[0.08] space-y-2.5 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {currentNotice.municipality} · {currentNotice.tag}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 tabular-nums">{currentNotice.date}</span>
                    </div>
                    <div className="text-base font-display font-bold tracking-tight text-slate-950 dark:text-white flex items-start gap-2">
                      <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-1" />
                      <span>{currentNotice.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {currentNotice.detail}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setNoticeIdx((i) => (i - 1 + PUBLIC_NOTICES_DATA.length) % PUBLIC_NOTICES_DATA.length)
                      }
                      className="min-h-[40px] px-3.5 rounded-xl border border-slate-400 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>

                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {noticeIdx + 1} / {PUBLIC_NOTICES_DATA.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => setNoticeIdx((i) => (i + 1) % PUBLIC_NOTICES_DATA.length)}
                      className="min-h-[40px] px-3.5 rounded-xl border border-slate-400 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Drawer Footer */}
            {infoDrawer !== 'notices' && (
              <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-300 dark:border-white/[0.08] flex items-center justify-between gap-2">
                {((infoDrawer === 'accounts' && accountsStep > 1) ||
                  (infoDrawer === 'anticorruption' && whistleStep > 1)) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (infoDrawer === 'accounts') setAccountsStep((s) => (s - 1) as 1 | 2 | 3);
                      if (infoDrawer === 'anticorruption') setWhistleStep((s) => (s - 1) as 1 | 2 | 3);
                    }}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-400 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeInfoDrawer}
                    className="min-h-[42px] px-4 rounded-xl border border-slate-400 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    Close
                  </button>
                )}

                {infoDrawer === 'accounts' && accountsStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setAccountsStep((s) => (s + 1) as 1 | 2 | 3)}
                    className="min-h-[42px] px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <span>{accountsStep === 2 ? 'Review Summary' : 'Next'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {infoDrawer === 'accounts' && accountsStep === 3 && (
                  <button
                    type="button"
                    onClick={() => setAccountQuerySent(true)}
                    className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Revenue Query</span>
                  </button>
                )}

                {infoDrawer === 'anticorruption' && whistleStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setWhistleStep((s) => (s + 1) as 1 | 2 | 3)}
                    className="min-h-[42px] px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  >
                    <span>{whistleStep === 2 ? 'Review Tip' : 'Next'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {infoDrawer === 'anticorruption' && whistleStep === 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWhistleSubmittedRef(`GFIS-${Math.floor(100000 + Math.random() * 900000)}`);
                    }}
                    className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Encrypt & Submit Tip</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CommandCenterView.displayName = 'CommandCenterView';
