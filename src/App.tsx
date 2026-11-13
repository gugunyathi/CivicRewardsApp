import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { BurgerMenuDrawer } from './components/BurgerMenuDrawer';
import { CivicAssistantDrawer } from './components/CivicAssistantDrawer';
import { CommandCenterView } from './components/CommandCenterView';
import { CouncillorDeskView } from './components/CouncillorDeskView';
import { DirectoryView, RewardsView } from './components/DirectoryRewardsView';
import { FloatingMenu } from './components/FloatingMenu';
import { authClient, type SessionProfile } from './utils/authClient';
import { LiveMapView } from './components/LiveMapView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ReportFormModal } from './components/ReportFormModal';
import { SocialPulseView } from './components/SocialPulseView';
import { TopBar } from './components/TopBar';
import { UserProfileView } from './components/UserProfileView';
import { WardFeedView } from './components/WardFeedView';
import {
  SEED_REPORTS,
  SEED_REWARD_TRANSACTIONS,
  SEED_SOCIAL_PULSE,
  SEED_USER_MONTHLY_BILLS,
  SEED_WARDS,
} from './data/civicSeedData';
import type {
  AppView,
  CivicReport,
  MonthlyMunicipalBill,
  ReportStatus,
  RewardTransaction,
  ServiceCategoryId,
  SocialPulseItem,
  UserProfile,
} from './types/civic';

const PAGE_ORDER: Array<{ id: AppView; label: string }> = [
  { id: 'hub', label: 'Categories' },
  { id: 'feed', label: 'Ward Feed' },
  { id: 'map', label: 'Live Map' },
  { id: 'desk', label: 'Councillor Desk' },
  { id: 'social', label: 'Social Pulse' },
  { id: 'directory', label: 'Ward Directory' },
  { id: 'rewards', label: 'CivicRewards' },
  { id: 'profile', label: 'My Profile & Bills' },
];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [darkMode, setDarkMode] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const [user, setUser] = useState<UserProfile>({
    name: 'Guest Resident',
    emailOrHandle: '',
    mobileZa: '',
    authChannel: 'google',
    signedIn: false,
    homeWardId: 'CoJ-115',
    activeWardId: 'CoJ-115',
    awayFromHome: false,
    credits: 0,
    tier: 'New Resident',
  });

  const [reports, setReports] = useState<CivicReport[]>(SEED_REPORTS);
  const [socialItems, setSocialItems] = useState<SocialPulseItem[]>(SEED_SOCIAL_PULSE);
  const [transactions, setTransactions] = useState<RewardTransaction[]>(SEED_REWARD_TRANSACTIONS);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyMunicipalBill[]>(SEED_USER_MONTHLY_BILLS);

  const [burgerOpen, setBurgerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ServiceCategoryId>('water');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const swipeStart = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    authClient
      .me()
      .then(({ profile }) => handleAuthSuccess(profile))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleAuthSuccess = (profile: SessionProfile) => {
    try {
      localStorage.setItem('civic_profile', JSON.stringify(profile));
    } catch {
      // private mode -- session cookie still persists login
    }
    setUser((prev) => ({
      ...prev,
      name: profile.name,
      emailOrHandle: profile.emailOrHandle,
      mobileZa: profile.mobileZa || prev.mobileZa,
      authChannel: profile.channel,
      signedIn: true,
    }));
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('civic_profile');
    } catch {
      // ignore
    }
    setUser((prev) => ({ ...prev, signedIn: false }));
    setToastMessage('Signed out.');
  };

  const requireAuth = (action: string): boolean => {
    if (user.signedIn) return true;
    setAuthModalOpen(true);
    setToastMessage('Sign in to ' + action + '.');
    return false;
  };

  const activeWard =
    SEED_WARDS.find((w) => w.id === user.activeWardId) ?? SEED_WARDS[0];

  const currentPageIdx = PAGE_ORDER.findIndex((p) => p.id === activeView);
  const goToPrevPage = () => {
    const prevIdx = (currentPageIdx - 1 + PAGE_ORDER.length) % PAGE_ORDER.length;
    setActiveView(PAGE_ORDER[prevIdx].id);
  };
  const goToNextPage = () => {
    const nextIdx = (currentPageIdx + 1) % PAGE_ORDER.length;
    setActiveView(PAGE_ORDER[nextIdx].id);
  };

  const pushReward = (title: string, subtitle: string, points: number, type: 'earn' | 'redeem' = 'earn') => {
    setUser((prev) => ({
      ...prev,
      credits: type === 'earn' ? prev.credits + points : Math.max(0, prev.credits - points),
    }));
    setTransactions((prev) => [
      {
        id: `TX-${Date.now()}`,
        title,
        subtitle,
        points,
        timestampLabel: 'Just now',
        type,
      },
      ...prev,
    ]);
  };

  const handleSelectWard = (wardId: string, bindAsHome: boolean) => {
    setUser((prev) => ({
      ...prev,
      activeWardId: wardId,
      homeWardId: bindAsHome ? wardId : prev.homeWardId,
      awayFromHome: !bindAsHome,
    }));
    const w = SEED_WARDS.find((x) => x.id === wardId);
    if (w) {
      setToastMessage(`Active Ward set to ${w.municipalityCode} Ward ${w.wardNumber} (${w.suburbs[0]})`);
    }
  };

  const handleSubmitNewReport = (newReport: CivicReport, rewardPoints: number) => {
    if (!requireAuth('log a fault report')) return;
    setReports((prev) => [newReport, ...prev]);
    pushReward(
      newReport.forensics.status === 'VERIFIED' ? 'Verified Live Capture Report' : 'Civic Fault Logged',
      `${newReport.id} · ${newReport.title}`,
      rewardPoints
    );
    setToastMessage(`Report ${newReport.id} escalated to ${activeWard.councillor.name} (+${rewardPoints} Civic Credits)`);
  };

  const handleCorroborateReport = (reportId: string) => {
    if (!requireAuth('link your household')) return;
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              clusteredHouseholds: r.clusteredHouseholds + 1,
              escalationLog: [...r.escalationLog, 'Additional resident household linked to cluster'],
            }
          : r
      )
    );
    pushReward('Neighbor Outage Corroboration', `Linked household to ${reportId}`, 15);
    setToastMessage(`Linked your household to ${reportId} (+15 Civic Credits)`);
  };

  const handleVerifyResolution = (reportId: string) => {
    if (!requireAuth('verify a resolution')) return;
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'Resolved',
              verifiedByResidents: r.verifiedByResidents + 1,
              escalationLog: [...r.escalationLog, 'Resident confirmed physical repair completed'],
            }
          : r
      )
    );
    pushReward('Verify Resolution Confirmation', `Confirmed street repair on ${reportId}`, 30);
    setToastMessage(`Resolution verified for ${reportId} (+30 Civic Credits)`);
  };

  const handleUpdateStatus = (reportId: string, newStatus: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: newStatus,
              escalationLog: [...r.escalationLog, `Status updated to "${newStatus}" by Councillor/Depot Desk`],
            }
          : r
      )
    );
    setToastMessage(`${reportId} updated to ${newStatus}`);
  };

  const handleAttachRef = (reportId: string, refCode: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              municipalRef: refCode,
              escalationLog: [...r.escalationLog, `Official municipal ref ${refCode} attached`],
            }
          : r
      )
    );
    setToastMessage(`Attached reference ${refCode} to ${reportId}`);
  };

  const handleSendSlaReminder = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              escalationLog: [
                ...r.escalationLog,
                `Automated SLA follow-up dispatched to ${r.assignedDepot} & Regional Director`,
              ],
            }
          : r
      )
    );
    setToastMessage(`SLA follow-up escalation sent for ${reportId}`);
  };

  const handleApproveStrippedMedia = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: r.status === 'Logged' ? 'Escalated to Depot' : r.status,
              forensics: {
                ...r.forensics,
                status: 'VERIFIED',
                summaryLabel: 'Verified by Ward Councillor + Neighbor Corroboration',
              },
              escalationLog: [
                ...r.escalationLog,
                'Councillor manually verified WhatsApp-compressed evidence & escalated to depot',
              ],
            }
          : r
      )
    );
    setToastMessage(`${reportId} manually verified and escalated to depot`);
  };

  const handleAddSocialItem = (item: SocialPulseItem, matchedReportId?: string | null) => {
    setSocialItems((prev) => [item, ...prev]);
    if (matchedReportId) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === matchedReportId
            ? {
                ...r,
                clusteredHouseholds: r.clusteredHouseholds + item.clusteredCount,
                escalationLog: [
                  ...r.escalationLog,
                  `Clustered ${item.platform} alert from ${item.sourceChannel}`,
                ],
              }
            : r
        )
      );
    }
    setToastMessage(`Ingested ${item.platform} alert via Gemini AI`);
  };

  const handleLinkRefToSocial = (socialId: string, reportId: string, refCode: string) => {
    setSocialItems((prev) =>
      prev.map((s) =>
        s.id === socialId ? { ...s, linkedReportId: reportId, linkedRef: refCode } : s
      )
    );
    pushReward('Social Outage Thread Link', `Linked ${refCode} to community pulse`, 10);
    setToastMessage(`Linked ${refCode} to community thread (+10 Civic Credits)`);
  };

  const activeTicketCount = reports.filter((r) => r.status !== 'Resolved').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070B] text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        activeWard={activeWard}
        user={user}
        activeTicketCount={activeTicketCount}
        emergencyMode={emergencyMode}
        onToggleEmergency={() => setEmergencyMode((v) => !v)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenBurgerMenu={() => setBurgerOpen(true)}
      />

      {/* Swipeable Paged Viewport */}
      <main
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          const insideInteractiveTrack = Boolean(
            target.closest('.leaflet-container') || target.closest('[aria-label="Smart Service Categories Gallery"]')
          );
          swipeStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            ignore: insideInteractiveTrack,
          };
        }}
        onTouchEnd={(e) => {
          if (!swipeStart.current || swipeStart.current.ignore) {
            swipeStart.current = null;
            return;
          }
          const dx = e.changedTouches[0].clientX - swipeStart.current.x;
          const dy = e.changedTouches[0].clientY - swipeStart.current.y;
          swipeStart.current = null;
          if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (dx < 0) goToNextPage();
            else goToPrevPage();
          }
        }}
        className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-24 lg:pb-8 flex flex-col justify-between gap-4"
      >
        <div>
          {activeView === 'hub' && (
            <CommandCenterView
              activeWard={activeWard}
              user={user}
              reportCount={reports.length}
              emergencyMode={emergencyMode}
              onToggleEmergency={() => setEmergencyMode((v) => !v)}
              onOpenReportModal={(catId) => {
                setReportCategory(catId);
                setReportModalOpen(true);
              }}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onOpenFeed={() => setActiveView('feed')}
              onOpenMap={() => setActiveView('map')}
            />
          )}

          {activeView === 'feed' && (
            <WardFeedView
              reports={reports}
              activeWard={activeWard}
              onCorroborateReport={handleCorroborateReport}
              onVerifyResolution={handleVerifyResolution}
              onOpenReportModal={() => {
                setReportCategory('water');
                setReportModalOpen(true);
              }}
              onOpenOnMap={() => setActiveView('map')}
            />
          )}

          {activeView === 'map' && (
            <LiveMapView
              reports={reports}
              activeWard={activeWard}
              darkMode={darkMode}
              onSelectWard={(wardId) => handleSelectWard(wardId, false)}
              onCorroborate={handleCorroborateReport}
              onVerifyResolution={handleVerifyResolution}
              onOpenReportModal={() => {
                setReportCategory('water');
                setReportModalOpen(true);
              }}
            />
          )}

          {activeView === 'desk' && (
            <CouncillorDeskView
              reports={reports}
              activeWard={activeWard}
              onUpdateStatus={handleUpdateStatus}
              onAttachRef={handleAttachRef}
              onSendSlaReminder={handleSendSlaReminder}
              onApproveStrippedMedia={handleApproveStrippedMedia}
            />
          )}

          {activeView === 'social' && (
            <SocialPulseView
              socialItems={socialItems}
              activeWard={activeWard}
              reports={reports}
              onAddSocialItem={handleAddSocialItem}
              onLinkRefToSocial={handleLinkRefToSocial}
            />
          )}

          {activeView === 'directory' && (
            <DirectoryView
              activeWard={activeWard}
              onBindWard={(wardId) => handleSelectWard(wardId, true)}
            />
          )}

          {activeView === 'rewards' && (
            <RewardsView
              user={user}
              transactions={transactions}
              onRedeemOffer={(_offerId, cost, title) => {
                if (!requireAuth('redeem rewards')) return;
                pushReward('Cashed Out · ' + title, `Redeemed by ${user.mobileZa}`, cost, 'redeem');
              }}
            />
          )}

          {activeView === 'profile' && (
            <UserProfileView
              user={user}
              activeWard={activeWard}
              reports={reports}
              transactions={transactions}
              monthlyBills={monthlyBills}
              onUpdateCurrentBill={(updated) => {
                setMonthlyBills((prev) =>
                  prev.map((b) => (b.monthKey === updated.monthKey ? updated : b))
                );
                setToastMessage(`Updated ${updated.monthLabel} municipal statement`);
              }}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onOpenReportModal={() => {
                setReportCategory('water');
                setReportModalOpen(true);
              }}
              onOpenRewards={() => setActiveView('rewards')}
              onVerifyResolution={handleVerifyResolution}
              onAttachRef={handleAttachRef}
              onSendSlaReminder={handleSendSlaReminder}
            />
          )}
        </div>

        {/* Clean Arrow Page Stepper for Left/Right Navigation */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={goToPrevPage}
            className="min-h-[34px] px-2.5 border border-slate-200 dark:border-white/15 hover:border-slate-900 dark:hover:border-white text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{PAGE_ORDER[(currentPageIdx - 1 + PAGE_ORDER.length) % PAGE_ORDER.length].label}</span>
          </button>

          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {currentPageIdx + 1} / {PAGE_ORDER.length} · {PAGE_ORDER[currentPageIdx].label}
          </span>

          <button
            type="button"
            onClick={goToNextPage}
            className="min-h-[34px] px-2.5 border border-slate-200 dark:border-white/15 hover:border-slate-900 dark:hover:border-white text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <span>{PAGE_ORDER[(currentPageIdx + 1) % PAGE_ORDER.length].label}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      <MobileBottomNav
        activeView={activeView}
        onSelectView={setActiveView}
      />

      <FloatingMenu
        emergencyMode={emergencyMode}
        onOpenReport={() => {
          setReportCategory('water');
          setReportModalOpen(true);
        }}
        onOpenMap={() => setActiveView('map')}
        onOpenAssistant={() => setAssistantOpen(true)}
        onToggleEmergency={() => setEmergencyMode((v) => !v)}
        onOpenWardPicker={() => setAuthModalOpen(true)}
        onOpenProfile={() => setActiveView('profile')}
      />

      <BurgerMenuDrawer
        isOpen={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        activeWard={activeWard}
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        emergencyMode={emergencyMode}
        onToggleEmergency={() => setEmergencyMode((v) => !v)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenAssistant={() => setAssistantOpen(true)}
      />

      <AuthOnboardingModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={user}
        activeWard={activeWard}
        onUpdateProfile={(updates) => setUser((prev) => ({ ...prev, ...updates }))}
        onSelectWard={handleSelectWard}
        onAuthSuccess={handleAuthSuccess}
        onSignOut={handleSignOut}
      />

      <ReportFormModal
        isOpen={reportModalOpen}
        initialCategoryId={reportCategory}
        activeWard={activeWard}
        darkMode={darkMode}
        emergencyMode={emergencyMode}
        existingReports={reports}
        onClose={() => setReportModalOpen(false)}
        onSubmitNewReport={handleSubmitNewReport}
        onCorroborateExisting={handleCorroborateReport}
        signedIn={user.signedIn}
        onRequireAuth={() => {
          setAuthModalOpen(true);
          setToastMessage('Sign in to submit your report -- your draft is kept.');
        }}
      />

      <CivicAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        activeWard={activeWard}
        reports={reports}
        onCreateTicketFromChat={handleSubmitNewReport}
        onCorroborateFromChat={handleCorroborateReport}
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold shadow-lg max-w-[90vw] text-center"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
