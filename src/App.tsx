import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { BurgerMenuDrawer } from './components/BurgerMenuDrawer';
import { CivicAssistantDrawer } from './components/CivicAssistantDrawer';
import { CommandCenterView } from './components/CommandCenterView';
import { CouncillorDeskView } from './components/CouncillorDeskView';
import { DirectoryView } from './components/DirectoryRewardsView';
import { authClient, type SessionProfile } from './utils/authClient';
import { getSastTimeOfDay, type CardTimeMode } from './utils/sastTime';
import { VERIFY_FIX_POINTS, getVerificationWindowState } from './utils/verificationWindow';
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
  UserRole,
} from './types/civic';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [darkMode, setDarkMode] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [cardTimeMode, setCardTimeMode] = useState<CardTimeMode>('am');
  const lastSastPeriodRef = useRef<CardTimeMode>(getSastTimeOfDay());

  useEffect(() => {
    const syncWithSast = () => {
      const currentPeriod = getSastTimeOfDay();
      if (currentPeriod !== lastSastPeriodRef.current) {
        lastSastPeriodRef.current = currentPeriod;
        setCardTimeMode(currentPeriod);
      }
    };
    const interval = window.setInterval(syncWithSast, 30_000);
    window.addEventListener('visibilitychange', syncWithSast);
    window.addEventListener('focus', syncWithSast);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('visibilitychange', syncWithSast);
      window.removeEventListener('focus', syncWithSast);
    };
  }, []);

  const [servicesLayout, setServicesLayout] = useState<'carousel' | 'tiles'>(() => {
    try {
      const saved = localStorage.getItem('civicpulse_services_layout');
      return saved === 'tiles' ? 'tiles' : 'carousel';
    } catch {
      return 'carousel';
    }
  });

  const [role, setRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('civicpulse_user_role');
      if (saved === 'resident' || saved === 'councillor') return saved;
      return 'councillor';
    } catch {
      return 'councillor';
    }
  });

  const handleChangeRole = useCallback((nextRole: UserRole) => {
    setRole(nextRole);
    try {
      localStorage.setItem('civicpulse_user_role', nextRole);
    } catch {
      // ignore storage restrictions
    }
    setActiveView((curr) => {
      if (nextRole === 'resident' && curr === 'desk') return 'hub';
      return curr;
    });
    setToastMessage(nextRole === 'councillor' ? 'Switched to Councillor Desk view.' : 'Switched to Resident view.');
  }, []);

  const handleChangeServicesLayout = useCallback((next: 'carousel' | 'tiles') => {
    setServicesLayout(next);
    try {
      localStorage.setItem('civicpulse_services_layout', next);
    } catch {
      // ignore storage restrictions
    }
  }, []);

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
  const [liveWard115Reports, setLiveWard115Reports] = useState<CivicReport[]>([]);
  const [focusedFeedReportId, setFocusedFeedReportId] = useState<string | null>(null);
  const [verifiedFixIds, setVerifiedFixIds] = useState<string[]>([]);
  const [socialItems, setSocialItems] = useState<SocialPulseItem[]>(SEED_SOCIAL_PULSE);
  const [transactions, setTransactions] = useState<RewardTransaction[]>(SEED_REWARD_TRANSACTIONS);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyMunicipalBill[]>(SEED_USER_MONTHLY_BILLS);

  const [burgerOpen, setBurgerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ServiceCategoryId>('water');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchWard115Feed = () => {
      fetch('/api/ward115/map')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data || !Array.isArray(data.pins)) return;
          setLiveWard115Reports(data.pins as CivicReport[]);
        })
        .catch(() => {
          // keep local seed reports on transient network error
        });
    };
    fetchWard115Feed();
    const timer = window.setInterval(fetchWard115Feed, 90_000);
    window.addEventListener('focus', fetchWard115Feed);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', fetchWard115Feed);
    };
  }, []);

  const mergedReports = useMemo(() => {
    const byId = new Map<string, CivicReport>();
    for (const r of liveWard115Reports) {
      byId.set(r.id, r);
    }
    for (const r of reports) {
      byId.set(r.id, r);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.createdAtIso).getTime() || 0;
      const tb = new Date(b.createdAtIso).getTime() || 0;
      return tb - ta;
    });
  }, [reports, liveWard115Reports]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleAuthSuccess = useCallback((profile: SessionProfile) => {
    if (!profile || !profile.name) return;
    try {
      localStorage.setItem('civic_profile', JSON.stringify(profile));
      localStorage.setItem('civicpulse_user_role', 'resident');
    } catch {
      // private mode
    }
    setRole('resident');
    setUser((prev) => ({
      ...prev,
      name: profile.name || prev.name,
      emailOrHandle: profile.emailOrHandle || prev.emailOrHandle,
      mobileZa: profile.mobileZa || prev.mobileZa,
      authChannel: profile.channel || prev.authChannel,
      signedIn: true,
    }));
  }, []);

  useEffect(() => {
    authClient
      .me()
      .then(({ profile }) => handleAuthSuccess(profile))
      .catch(() => {});
  }, [handleAuthSuccess]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const action = params.get('action');
    const validViews = ['hub', 'feed', 'map', 'desk', 'social', 'directory', 'rewards', 'profile'];
    if (view && validViews.includes(view)) {
      if (view === 'desk' && role !== 'councillor') {
        setActiveView('hub');
      } else {
        setActiveView(view as AppView);
      }
    }
    if (action === 'report') {
      setReportCategory('water');
      setReportModalOpen(true);
    }
    if (view || action) window.history.replaceState({}, '', window.location.pathname);
  }, [role]);

  useEffect(() => {
    if (role === 'resident' && activeView === 'desk') {
      setActiveView('hub');
    }
  }, [role, activeView]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleSignOut = useCallback(() => {
    try {
      localStorage.removeItem('civic_profile');
    } catch {
      // ignore
    }
    setUser((prev) => ({ ...prev, signedIn: false }));
    setToastMessage('Signed out.');
  }, []);

  const requireAuth = useCallback(
    (action: string): boolean => {
      if (user.signedIn) return true;
      setActiveView('profile');
      setToastMessage('Sign in on your Profile page to ' + action + '.');
      return false;
    },
    [user.signedIn]
  );

  const activeWard = useMemo(
    () => SEED_WARDS.find((w) => w.id === user.activeWardId) ?? SEED_WARDS[0]!,
    [user.activeWardId]
  );

  const activeTicketCount = useMemo(
    () => reports.filter((r) => r.status !== 'Resolved').length,
    [reports]
  );

  const pushReward = useCallback(
    (title: string, subtitle: string, points: number, type: 'earn' | 'redeem' = 'earn') => {
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
    },
    []
  );

  const handleSelectWard = useCallback((wardId: string, bindAsHome: boolean) => {
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
  }, []);

  const handleSubmitNewReport = useCallback(
    (newReport: CivicReport, rewardPoints: number) => {
      setReports((prev) => [newReport, ...prev]);
      setRole('resident');
      try {
        localStorage.setItem('civicpulse_user_role', 'resident');
      } catch {
        // ignore storage restrictions
      }
      if (user.signedIn && rewardPoints > 0) {
        pushReward(
          newReport.forensics.status === 'VERIFIED' ? 'Verified Live Capture Report' : 'Civic Fault Logged',
          `${newReport.id} · ${newReport.title}`,
          rewardPoints
        );
        setToastMessage(
          `Report ${newReport.id} escalated to ${activeWard.councillor.name} (+${rewardPoints} Civic Credits)`
        );
      } else {
        setToastMessage(
          `Report ${newReport.id} submitted as Guest. Sign in on Profile to earn Civic Credits.`
        );
      }
    },
    [user.signedIn, pushReward, activeWard.councillor.name]
  );

  const handleCorroborateReport = useCallback(
    (reportId: string): boolean => {
      if (!requireAuth('link your household')) return false;
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
      return true;
    },
    [requireAuth, pushReward]
  );

  const handleInlineCorroborateFromWizard = useCallback(
    (reportId: string) => {
      const incrementReport = (list: CivicReport[]) =>
        list.map((r) =>
          r.id === reportId
            ? {
                ...r,
                clusteredHouseholds: r.clusteredHouseholds + 1,
                escalationLog: [
                  ...r.escalationLog,
                  'Resident added +1 Me Too while filing report',
                ],
              }
            : r
        );
      setReports(incrementReport);
      setLiveWard115Reports(incrementReport);
      if (user.signedIn) {
        pushReward('Neighbor Outage Corroboration', `Linked household to ${reportId}`, 15);
        setToastMessage(`Added Me Too to ${reportId} (+15 Civic Credits)`);
      } else {
        setToastMessage(`Added Me Too to ${reportId}`);
      }
    },
    [user.signedIn, pushReward]
  );

  const handleVerifyResolution = useCallback(
    (reportId: string, reportSnapshot?: CivicReport): boolean => {
      if (!requireAuth('verify a restored service')) return false;
      if (verifiedFixIds.includes(reportId)) {
        setToastMessage(`You already verified the fix on ${reportId}.`);
        return false;
      }

      const target = reports.find((r) => r.id === reportId) ?? reportSnapshot;
      if (target) {
        const win = getVerificationWindowState(target, verifiedFixIds);
        if (!win.canVerify) {
          if (win.windowExpired) {
            setToastMessage('The 15-minute Verify Fix window has closed for this restored service.');
          }
          return false;
        }
      }

      const nowIso = new Date().toISOString();
      setVerifiedFixIds((prev) => (prev.includes(reportId) ? prev : [...prev, reportId]));
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: 'Resolved',
                resolvedAtIso: r.resolvedAtIso ?? nowIso,
                verifiedByResidents: r.verifiedByResidents + 1,
                escalationLog: [...r.escalationLog, 'Resident confirmed service restored within verify window'],
              }
            : r
        )
      );
      pushReward(
        'Verify Fix Confirmation',
        `Confirmed service restoration on ${reportId}`,
        VERIFY_FIX_POINTS
      );
      setToastMessage(`Fix verified on ${reportId} (+${VERIFY_FIX_POINTS} Civic Credits)`);
      return true;
    },
    [requireAuth, verifiedFixIds, reports, pushReward]
  );

  const handleUpdateStatus = useCallback((reportId: string, newStatus: ReportStatus) => {
    const nowIso = new Date().toISOString();
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: newStatus,
              resolvedAtIso:
                newStatus === 'Resolved'
                  ? r.status === 'Resolved' && r.resolvedAtIso
                    ? r.resolvedAtIso
                    : nowIso
                  : null,
              escalationLog: [...r.escalationLog, `Status updated to "${newStatus}" by Councillor/Depot Desk`],
            }
          : r
      )
    );
    setToastMessage(
      newStatus === 'Resolved'
        ? `${reportId} marked restored — 15m resident Verify Fix window opened`
        : `${reportId} updated to ${newStatus}`
    );
  }, []);

  const handleAttachRef = useCallback((reportId: string, refCode: string) => {
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
  }, []);

  const handleSendSlaReminder = useCallback((reportId: string) => {
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
  }, []);

  const handleApproveStrippedMedia = useCallback((reportId: string) => {
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
  }, []);

  const handleAddSocialItem = useCallback((item: SocialPulseItem, matchedReportId?: string | null) => {
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
    setToastMessage(`Ingested ${item.platform} alert`);
  }, []);

  const handleLinkRefToSocial = useCallback(
    (socialId: string, reportId: string, refCode: string) => {
      setSocialItems((prev) =>
        prev.map((s) =>
          s.id === socialId ? { ...s, linkedReportId: reportId, linkedRef: refCode } : s
        )
      );
      pushReward('Social Outage Thread Link', `Linked ${refCode} to community pulse`, 10);
      setToastMessage(`Linked ${refCode} to community thread (+10 Civic Credits)`);
    },
    [pushReward]
  );

  const toggleEmergency = useCallback(() => setEmergencyMode((v) => !v), []);
  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), []);
  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const openBurgerMenu = useCallback(() => setBurgerOpen(true), []);
  const openAssistant = useCallback(() => setAssistantOpen(true), []);
  const openDefaultReportModal = useCallback(() => {
    setReportCategory('water');
    setReportModalOpen(true);
  }, []);
  const openCategoryReportModal = useCallback((catId: ServiceCategoryId) => {
    setReportCategory(catId);
    setReportModalOpen(true);
  }, []);
  const openMap = useCallback(() => setActiveView('map'), []);
  const openFeedReport = useCallback((reportId?: string) => {
    setFocusedFeedReportId(reportId ?? null);
    setActiveView('feed');
  }, []);
  const openProfile = useCallback(() => setActiveView('profile'), []);

  const handleRedeemOffer = useCallback(
    (_offerId: string, cost: number, title: string): boolean => {
      if (!requireAuth('redeem rewards')) return false;
      if (user.credits < cost) {
        setToastMessage('Not enough Civic Credits for this reward.');
        return false;
      }
      pushReward(
        'Cashed Out · ' + title,
        `Redeemed by ${user.mobileZa || user.emailOrHandle || user.name}`,
        cost,
        'redeem'
      );
      setToastMessage(`Redeemed ${title} (-${cost} CR)`);
      return true;
    },
    [requireAuth, user.credits, user.mobileZa, user.emailOrHandle, user.name, pushReward]
  );

  return (
    <div className="min-h-dvh bg-[#EEF2F6] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors duration-150 flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        activeWard={activeWard}
        user={user}
        role={role}
        onChangeRole={handleChangeRole}
        activeTicketCount={activeTicketCount}
        emergencyMode={emergencyMode}
        onToggleEmergency={toggleEmergency}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenAuthModal={openAuthModal}
        onOpenBurgerMenu={openBurgerMenu}
        onOpenAssistant={openAssistant}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-20 lg:pb-6 flex flex-col gap-3">
        <div className="flex-1 flex flex-col">
          {activeView === 'hub' && (
            <CommandCenterView
              activeWard={activeWard}
              user={user}
              emergencyMode={emergencyMode}
              onToggleEmergency={toggleEmergency}
              onOpenReportModal={openCategoryReportModal}
              onOpenAuthModal={openAuthModal}
              servicesLayout={servicesLayout}
              onChangeServicesLayout={handleChangeServicesLayout}
              cardTimeMode={cardTimeMode}
              onChangeCardTimeMode={setCardTimeMode}
              reports={mergedReports}
              onOpenFeedReport={openFeedReport}
            />
          )}

          {activeView === 'feed' && (
            <WardFeedView
              reports={mergedReports}
              activeWard={activeWard}
              verifiedFixIds={verifiedFixIds}
              focusedReportId={focusedFeedReportId}
              onClearFocusedReport={() => setFocusedFeedReportId(null)}
              onCorroborateReport={handleCorroborateReport}
              onVerifyResolution={handleVerifyResolution}
              onOpenReportModal={openDefaultReportModal}
              onOpenOnMap={openMap}
            />
          )}

          {activeView === 'map' && (
            <LiveMapView
              reports={reports}
              activeWard={activeWard}
              darkMode={darkMode}
              verifiedFixIds={verifiedFixIds}
              onSelectWard={(wardId) => handleSelectWard(wardId, false)}
              onCorroborate={handleCorroborateReport}
              onVerifyResolution={handleVerifyResolution}
              onOpenReportModal={openDefaultReportModal}
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

          {(activeView === 'profile' || activeView === 'rewards') && (
            <UserProfileView
              user={user}
              activeWard={activeWard}
              reports={reports}
              transactions={transactions}
              monthlyBills={monthlyBills}
              initialTab={activeView === 'rewards' ? 'points' : undefined}
              onUpdateCurrentBill={(updated) => {
                setMonthlyBills((prev) =>
                  prev.map((b) => (b.monthKey === updated.monthKey ? updated : b))
                );
                setToastMessage(`Updated ${updated.monthLabel} municipal statement`);
              }}
              onOpenAuthModal={openAuthModal}
              onOpenReportModal={openDefaultReportModal}
              onRedeemOffer={handleRedeemOffer}
              onVerifyResolution={handleVerifyResolution}
              onAttachRef={handleAttachRef}
              onSendSlaReminder={handleSendSlaReminder}
              onAuthSuccess={handleAuthSuccess}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </main>

      <MobileBottomNav
        activeView={activeView}
        role={role}
        onSelectView={setActiveView}
      />

      <BurgerMenuDrawer
        isOpen={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        activeWard={activeWard}
        user={user}
        role={role}
        onChangeRole={handleChangeRole}
        activeTicketCount={activeTicketCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        emergencyMode={emergencyMode}
        onToggleEmergency={toggleEmergency}
        onOpenAuthModal={openAuthModal}
        onOpenAssistant={openAssistant}
        onSignOut={handleSignOut}
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
        existingReports={mergedReports}
        onClose={() => setReportModalOpen(false)}
        onSubmitNewReport={handleSubmitNewReport}
        onCorroborateExisting={handleInlineCorroborateFromWizard}
        onViewInFeed={(reportId) => {
          setReportModalOpen(false);
          openFeedReport(reportId);
        }}
        onGoToProfileSignIn={() => {
          setReportModalOpen(false);
          setActiveView('profile');
          setToastMessage('Sign up or sign in on your Profile page to earn Civic Credits.');
        }}
        signedIn={user.signedIn}
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
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold shadow-lg border border-white/10 dark:border-slate-200 max-w-[90vw] text-center ui-modal-enter"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
