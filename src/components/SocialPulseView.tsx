import React, { useState } from 'react';
import {
  AtSign,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import type { CivicReport, SocialPulseItem, WardRecord } from '../types/civic';
import { AvatarPlaceholder } from './SmartImage';

interface SocialPulseViewProps {
  socialItems: SocialPulseItem[];
  activeWard: WardRecord;
  reports: CivicReport[];
  onAddSocialItem: (item: SocialPulseItem, matchedReportId?: string | null) => void;
  onLinkRefToSocial: (socialId: string, reportId: string, refCode: string) => void;
}

const PLATFORM_META: Record<
  SocialPulseItem['platform'],
  { icon: React.ComponentType<{ className?: string }>; chip: string }
> = {
  WhatsApp: { icon: MessageCircle, chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  Telegram: { icon: Send, chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  X: { icon: AtSign, chip: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30' },
  Facebook: { icon: ThumbsUp, chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
};

const SAMPLE_FORWARDS = [
  {
    platform: 'WhatsApp' as const,
    channel: 'Fourways Ward 115 Community Alert Group',
    text: 'Cedar Rd & Campbell traffic backing up, Joburg Water valve truck on site now, ref JWAPP-40128554 confirmed.',
  },
  {
    platform: 'X' as const,
    channel: 'X / Twitter Outage Monitor',
    text: '@CityPowerJhb @CityofCTAlerts Fourways Gardens & Craigavon voltage dipping repeatedly since 07:30, mini-sub humming loudly.',
  },
];

export const SocialPulseView: React.FC<SocialPulseViewProps> = React.memo(({
  socialItems,
  activeWard,
  reports,
  onAddSocialItem,
  onLinkRefToSocial,
}) => {
  const [platform, setPlatform] = useState<'WhatsApp' | 'Telegram' | 'X' | 'Facebook'>('WhatsApp');
  const [rawMessage, setRawMessage] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcastLog, setBroadcastLog] = useState<string | null>(null);
  const [linkingSocialId, setLinkingSocialId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id ?? '');
  const [mobileTab, setMobileTab] = useState<'stream' | 'bridge'>('stream');
  const [streamPage, setStreamPage] = useState(0);

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(socialItems.length / pageSize));
  const safePage = Math.min(streamPage, totalPages - 1);
  const visibleSocialItems = socialItems.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawMessage.trim()) return;
    setIsSummarizing(true);
    setError(null);

    try {
      const res = await fetch('/api/social/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMessage,
          platform,
          wardContext: {
            municipality: activeWard.municipalityName,
            wardNumber: activeWard.wardNumber,
            suburbs: activeWard.suburbs,
          },
          activeReports: reports.map((r) => ({
            id: r.id,
            title: r.title,
            address: r.address,
            ref: r.municipalRef,
            suburb: r.suburb,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Outage clustering failed.');

      const matched = data.matchedReportId
        ? reports.find((r) => r.id === data.matchedReportId)
        : undefined;

      const newItem: SocialPulseItem = {
        id: `SP-${Date.now()}`,
        platform,
        sourceChannel:
          platform === 'WhatsApp'
            ? `${activeWard.suburbs[0]} Ward ${activeWard.wardNumber} WhatsApp Bridge`
            : platform === 'Telegram'
              ? `@Ward${activeWard.wardNumber}CivicBot`
              : `${platform} Outage Monitor`,
        wardId: activeWard.id,
        municipalityCode: activeWard.municipalityCode,
        wardNumber: activeWard.wardNumber,
        authorHandle: platform === 'WhatsApp' ? '+27 82 *** 9104' : '@resident_pulse',
        message: rawMessage.trim(),
        timestampLabel: 'Just now',
        linkedReportId: matched?.id ?? data.matchedReportId ?? null,
        linkedRef: data.extractedRefNumber ?? matched?.municipalRef ?? null,
        clusteredCount: data.estimatedHouseholdsAffected ?? 1,
        aiSummary: data.summary,
        entityTags: [data.entityHandle || '@JHBWater', `Ward ${activeWard.wardNumber}`],
      };

      onAddSocialItem(newItem, newItem.linkedReportId);
      setRawMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to summarize message.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleBroadcastAlert = () => {
    const activeTicket = reports.find((r) => r.wardId === activeWard.id && r.status !== 'Resolved');
    setBroadcastLog(
      `Broadcast sent to Ward ${activeWard.wardNumber} subscribers: "${
        activeTicket
          ? `${activeTicket.title} (${activeTicket.municipalRef || activeTicket.id})`
          : `All Ward ${activeWard.wardNumber} feeds nominal.`
      }"`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Social & Group Pulse
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            WhatsApp, Telegram & X outage clustering
          </p>
        </div>

        <button
          type="button"
          onClick={handleBroadcastAlert}
          className="min-h-[38px] px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-[0.98] transition-transform duration-150"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Broadcast Ward {activeWard.wardNumber} Alert</span>
        </button>
      </div>

      {/* Mobile Tab Switch */}
      <div className="grid grid-cols-2 lg:hidden rounded-xl border border-slate-200/80 dark:border-white/[0.08] p-1 bg-slate-100/80 dark:bg-white/[0.04]">
        <button
          type="button"
          onClick={() => setMobileTab('stream')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
            mobileTab === 'stream'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Live Stream ({socialItems.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('bridge')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 ${
            mobileTab === 'bridge'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Forward / Bridge
        </button>
      </div>

      {broadcastLog && (
        <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-600/25 text-xs text-emerald-800 dark:text-emerald-200">
          {broadcastLog}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Group Bridge & Ingestion Simulator */}
        <section
          className={`${
            mobileTab === 'bridge' ? 'block' : 'hidden lg:block'
          } lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4`}
        >
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Group Ingestion Bridge</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste a community alert to extract ref numbers and cluster Ward {activeWard.wardNumber} tickets.
            </p>
          </div>

          <form onSubmit={handleIngest} className="space-y-3">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
              {(['WhatsApp', 'Telegram', 'X', 'Facebook'] as const).map((p) => {
                const PIcon = PLATFORM_META[p].icon;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 transition-colors duration-150 ${
                      platform === p
                        ? 'bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <PIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{p === 'X' ? 'X' : p.slice(0, 4)}</span>
                  </button>
                );
              })}
            </div>

            <textarea
              rows={4}
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              placeholder="Paste a forwarded community group message or @CityPowerJhb / @JHBWater post..."
              className="w-full p-3.5 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 transition-[border-color,box-shadow,background-color] duration-150"
            />

            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_FORWARDS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPlatform(sample.platform);
                    setRawMessage(sample.text);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/12 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-600/60 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                >
                  Load {sample.platform} Sample
                </button>
              ))}
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSummarizing || !rawMessage.trim()}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Clustering Alerts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ingest & Cluster Alert</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right: Clustered Social Pulse Feed */}
        <section
          className={`${
            mobileTab === 'stream' ? 'block' : 'hidden lg:block'
          } lg:col-span-7 space-y-3`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-2">
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {safePage + 1} / {totalPages} · {socialItems.length} Alerts
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setStreamPage((p) => Math.max(0, p - 1))}
                aria-label="Previous social page"
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setStreamPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Next social page"
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08] disabled:opacity-35 cursor-pointer active:scale-95 transition-transform duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {visibleSocialItems.map((item) => {
            const meta = PLATFORM_META[item.platform];
            const PIcon = meta.icon;
            return (
              <article
                key={item.id}
                className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AvatarPlaceholder name={item.authorHandle} className="w-9 h-9 text-[10px]" />
                    <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.chip}`}
                        >
                          <PIcon className="w-3 h-3" />
                          {item.platform}
                        </span>
                        <span className="font-mono text-[11px] truncate">{item.authorHandle}</span>
                      </div>
                      <div className="mt-0.5 truncate">{item.sourceChannel}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{item.timestampLabel}</span>
                </div>

                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                  “{item.message}”
                </p>

                <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-xs space-y-1">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    Summary · {item.clusteredCount} Clustered Reports
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">{item.aiSummary}</div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {item.entityTags.join(' · ')}
                    {item.linkedReportId ? ` · Linked to ${item.linkedReportId}` : ''}
                    {item.linkedRef ? ` (${item.linkedRef})` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {linkingSocialId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <select
                        value={selectedReportId}
                        onChange={(e) => setSelectedReportId(e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-xs"
                      >
                        {reports.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.id} — {r.title} ({r.municipalRef || 'No Ref'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const target = reports.find((r) => r.id === selectedReportId);
                          if (target) {
                            onLinkRefToSocial(item.id, target.id, target.municipalRef || target.id);
                          }
                          setLinkingSocialId(null);
                        }}
                        className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm Link</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLinkingSocialId(item.id)}
                      className="min-h-[36px] px-3 rounded-xl border border-slate-200/90 dark:border-white/12 hover:border-slate-300 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{item.linkedReportId ? 'Change Linked Ticket' : 'Link Official Ref #'}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
});

SocialPulseView.displayName = 'SocialPulseView';
