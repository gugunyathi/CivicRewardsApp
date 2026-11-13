import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Lock,
  Map as MapIcon,
  MapPin,
  Pencil,
  PhoneCall,
  X,
} from 'lucide-react';
import { MUNICIPALITIES, PUBLIC_NOTICES_DATA, SERVICE_CATEGORIES } from '../data/civicSeedData';
import type {
  ServiceCategoryId,
  UserProfile,
  WardRecord,
} from '../types/civic';
import { ServiceCarousel } from './ServiceCarousel';

interface CommandCenterViewProps {
  activeWard: WardRecord;
  user: UserProfile;
  reportCount: number;
  emergencyMode: boolean;
  onToggleEmergency: () => void;
  onOpenReportModal: (categoryId: ServiceCategoryId) => void;
  onOpenAuthModal: () => void;
  onOpenFeed: () => void;
  onOpenMap: () => void;
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

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  activeWard,
  user,
  reportCount,
  emergencyMode,
  onToggleEmergency,
  onOpenReportModal,
  onOpenAuthModal,
  onOpenFeed,
  onOpenMap,
}) => {
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
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

  const metroInfo = MUNICIPALITIES[activeWard.municipalityCode];

  const handleCategoryTrigger = (catId: ServiceCategoryId) => {
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
  };

  const closeInfoDrawer = () => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    setInfoDrawer(null);
    setWhistleSubmittedRef(null);
    setAccountQuerySent(false);
  };

  const currentNotice = PUBLIC_NOTICES_DATA[noticeIdx] ?? PUBLIC_NOTICES_DATA[0];

  return (
    <div className="space-y-4">
      {/* Emergency SOS Banner */}
      {emergencyMode && (
        <section
          aria-live="assertive"
          className="border border-red-500/60 bg-red-600 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h2 className="font-display text-sm font-bold">Emergency SOS Mode Active</h2>
              <p className="text-[11px] text-red-50">
                Municipal reference bypassed · {metroInfo.name}: {metroInfo.emergencyNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenReportModal('electricity')}
              className="min-h-[36px] px-3 py-1 bg-white text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Log Emergency</span>
            </button>
            <button
              type="button"
              onClick={onToggleEmergency}
              className="min-h-[36px] px-2.5 border border-red-200/60 text-xs font-semibold cursor-pointer"
            >
              Exit
            </button>
          </div>
        </section>
      )}

      {/* Compact Single-Screen Ward Bar */}
      <section className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="text-sky-600 dark:text-sky-400 font-semibold">
              WARD {activeWard.wardNumber} · {activeWard.municipalityCode}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">{activeWard.suburbs[0]}</span>
            <span aria-hidden="true">/</span>
            <span>{user.awayFromHome ? 'AWAY GPS' : 'HOME'}</span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Smart Civic Services
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 hover:border-slate-900 dark:hover:border-white text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">{activeWard.councillor.name}</span>
            <span className="sm:hidden">Ward</span>
          </button>

          <button
            type="button"
            onClick={onOpenFeed}
            className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 hover:border-slate-900 dark:hover:border-white text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Feed ({reportCount})</span>
          </button>

          <button
            type="button"
            onClick={onOpenMap}
            className="min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 hover:border-slate-900 dark:hover:border-white text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5 text-sky-500" />
            <span>Map</span>
          </button>
        </div>
      </section>

      {/* Viewport-Contained Editorial Carousel */}
      <ServiceCarousel
        categories={SERVICE_CATEGORIES}
        activeIndex={activeCategoryIdx}
        onSelectIndex={setActiveCategoryIdx}
        onTriggerCategory={handleCategoryTrigger}
        activeWard={activeWard}
      />

      {/* Survey-Style Guided Modal Drawers for Categories 8, 9, 10 */}
      {infoDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl h-[82dvh] sm:h-[520px] max-h-[90dvh] flex flex-col bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 overflow-hidden">
            {/* Pinned Header */}
            <div className="shrink-0 px-4 py-3.5 border-b border-slate-200 dark:border-white/12 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                  {infoDrawer === 'accounts' && `Step 0${accountsStep} / 03 · ${activeWard.municipalityCode} Revenue`}
                  {infoDrawer === 'anticorruption' && `Step 0${whistleStep} / 03 · GFIS Encrypted`}
                  {infoDrawer === 'notices' && `Notice ${noticeIdx + 1} / ${PUBLIC_NOTICES_DATA.length} · Civic Notices`}
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                  {infoDrawer === 'accounts' && 'Municipal Accounts & Debt Relief'}
                  {infoDrawer === 'anticorruption' && 'Anti-Corruption Whistleblowing'}
                  {infoDrawer === 'notices' && 'Public Notices, Bylaws & Voter Info'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeInfoDrawer}
                aria-label="Close module"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guided Survey Body */}
            <div className="flex-1 p-4 flex flex-col justify-between gap-3 overflow-hidden">
              {infoDrawer === 'accounts' && (
                <>
                  {/* Step progress bars */}
                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 ${
                          n === accountsStep
                            ? 'bg-sky-500'
                            : n < accountsStep
                              ? 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-white/15'
                        }`}
                      />
                    ))}
                  </div>

                  {accountsStep === 1 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        What is your combined monthly household income?
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tap a bracket to check {activeWard.municipalityName} debt relief & advance automatically.
                      </p>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {INCOME_BRACKETS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setIncomeBracket(b);
                              autoTimerRef.current = window.setTimeout(() => setAccountsStep(2), 200);
                            }}
                            className={`p-3 border text-left flex items-center justify-between cursor-pointer ${
                              incomeBracket.id === b.id
                                ? 'border-sky-500 bg-sky-500/15 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{b.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-sky-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {accountsStep === 2 && (
                    <div className="flex-1 flex flex-col justify-between gap-2.5">
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          What do you need help with?
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {ACCOUNT_QUERY_TYPES.map((qt) => (
                            <button
                              key={qt}
                              type="button"
                              onClick={() => setAccountQueryType(qt)}
                              className={`px-3 py-2 border text-left text-xs font-medium cursor-pointer ${
                                accountQueryType === qt
                                  ? 'border-sky-500 bg-sky-500 text-white'
                                  : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {qt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                            9-Digit Account #
                          </label>
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="900412881"
                            className="w-full min-h-[38px] px-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                            Meter Reading (Optional)
                          </label>
                          <input
                            type="text"
                            value={meterReading}
                            onChange={(e) => setMeterReading(e.target.value)}
                            placeholder="e.g. 04182 kL"
                            className="w-full min-h-[38px] px-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {accountsStep === 3 && (
                    <div className="flex-1 flex flex-col justify-between gap-2.5">
                      <div className="p-3 bg-sky-500/10 border border-sky-500/30 space-y-1">
                        <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                          ELIGIBILITY MATCH · {activeWard.municipalityCode}
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {incomeBracket.plan}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setAccountsStep(1)}
                          className="w-full p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-mono text-[10px] text-slate-400">01 · HOUSEHOLD INCOME</div>
                            <div className="text-xs font-semibold">{incomeBracket.label}</div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-sky-500" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setAccountsStep(2)}
                          className="w-full p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] text-slate-400">02 · QUERY & ACCOUNT</div>
                            <div className="text-xs font-semibold truncate">
                              {accountQueryType} · #{accountNumber || '900412881'}
                              {meterReading ? ` (${meterReading})` : ''}
                            </div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        </button>
                      </div>

                      {accountQuerySent && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/40 text-xs font-mono text-emerald-700 dark:text-emerald-300">
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
                        className={`h-1.5 ${
                          n === whistleStep
                            ? 'bg-sky-500'
                            : n < whistleStep
                              ? 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-white/15'
                        }`}
                      />
                    ))}
                  </div>

                  {whistleStep === 1 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="p-2.5 bg-slate-100 dark:bg-white/5 text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>Zero-identity channel to GFIS & 0800 701 701.</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        What type of irregularity are you reporting?
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {WHISTLE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setWhistleCategory(cat);
                              autoTimerRef.current = window.setTimeout(() => setWhistleStep(2), 200);
                            }}
                            className={`p-3 border text-left flex items-center justify-between cursor-pointer ${
                              whistleCategory === cat
                                ? 'border-sky-500 bg-sky-500/15 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{cat}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-sky-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {whistleStep === 2 && (
                    <div className="flex-1 flex flex-col justify-center gap-2.5">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Describe the incident anonymously
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Do not include your name or phone number. Include depot, vehicle reg, or dates if known.
                      </p>
                      <textarea
                        rows={5}
                        value={whistleText}
                        onChange={(e) => setWhistleText(e.target.value)}
                        placeholder={`Details for "${whistleCategory}" in Ward ${activeWard.wardNumber}...`}
                        className="w-full p-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm"
                      />
                    </div>
                  )}

                  {whistleStep === 3 && (
                    <div className="flex-1 flex flex-col justify-between gap-2.5">
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setWhistleStep(1)}
                          className="w-full p-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-mono text-[10px] text-slate-400">01 · CATEGORY</div>
                            <div className="text-xs font-bold">{whistleCategory}</div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-sky-500" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setWhistleStep(2)}
                          className="w-full p-3 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] text-slate-400">02 · ENCRYPTED STATEMENT</div>
                            <div className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                              {whistleText.trim() || 'Anonymous tip ready for GFIS submission'}
                            </div>
                          </div>
                          <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        </button>
                      </div>

                      {whistleSubmittedRef && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                          Encrypted Token: {whistleSubmittedRef} · Zero identity metadata stored.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {infoDrawer === 'notices' && currentNotice && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/12 space-y-2.5 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-sky-600 dark:text-sky-400">
                        {currentNotice.municipality} · {currentNotice.tag}
                      </span>
                      <span className="text-slate-400">{currentNotice.date}</span>
                    </div>
                    <div className="text-base font-display font-bold text-slate-900 dark:text-white flex items-start gap-2">
                      <FileText className="w-4 h-4 text-sky-500 shrink-0 mt-1" />
                      <span>{currentNotice.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentNotice.detail}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setNoticeIdx((i) => (i - 1 + PUBLIC_NOTICES_DATA.length) % PUBLIC_NOTICES_DATA.length)
                      }
                      className="min-h-[40px] px-3 border border-slate-200 dark:border-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>

                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {noticeIdx + 1} / {PUBLIC_NOTICES_DATA.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => setNoticeIdx((i) => (i + 1) % PUBLIC_NOTICES_DATA.length)}
                      className="min-h-[40px] px-3 border border-slate-200 dark:border-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
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
              <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/12 flex items-center justify-between gap-2">
                {((infoDrawer === 'accounts' && accountsStep > 1) ||
                  (infoDrawer === 'anticorruption' && whistleStep > 1)) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (infoDrawer === 'accounts') setAccountsStep((s) => (s - 1) as 1 | 2 | 3);
                      if (infoDrawer === 'anticorruption') setWhistleStep((s) => (s - 1) as 1 | 2 | 3);
                    }}
                    className="min-h-[40px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeInfoDrawer}
                    className="min-h-[40px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                )}

                {infoDrawer === 'accounts' && accountsStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setAccountsStep((s) => (s + 1) as 1 | 2 | 3)}
                    className="min-h-[40px] px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{accountsStep === 2 ? 'Review Summary' : 'Next'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {infoDrawer === 'accounts' && accountsStep === 3 && (
                  <button
                    type="button"
                    onClick={() => setAccountQuerySent(true)}
                    className="min-h-[40px] px-4 bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Revenue Query</span>
                  </button>
                )}

                {infoDrawer === 'anticorruption' && whistleStep < 3 && (
                  <button
                    type="button"
                    onClick={() => setWhistleStep((s) => (s + 1) as 1 | 2 | 3)}
                    className="min-h-[40px] px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
                    className="min-h-[40px] px-4 bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
};
