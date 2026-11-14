import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  Users,
  X,
} from 'lucide-react';
import type {
  CivicReport,
  ServiceCategoryId,
  SeverityLevel,
  WardRecord,
} from '../types/civic';
import { getDepotForCategory } from '../utils/wardResolver';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePreview?: string;
  actionType?: 'NONE' | 'CREATE_TICKET' | 'CORROBORATE_EXISTING';
  matchedReportId?: string | null;
  ticketDraft?: {
    categoryId: string;
    title: string;
    address: string;
    severity: string;
    description: string;
  } | null;
  actionExecuted?: boolean;
}

interface CivicAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeWard: WardRecord;
  reports: CivicReport[];
  onCreateTicketFromChat: (report: CivicReport, credits: number) => void;
  onCorroborateFromChat: (reportId: string) => void;
}

const SUGGESTED_PROMPTS = [
  'Water pipe burst on Cedar Road for 3 hours',
  'Dispute an estimated CoJ water bill',
  'Active ward outages and water tankers',
];

export const CivicAssistantDrawer: React.FC<CivicAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeWard,
  reports,
  onCreateTicketFromChat,
  onCorroborateFromChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Ward ${activeWard.wardNumber} (${activeWard.suburbs[0]}) support ready. Describe a fault, attach a photo, or ask about bylaws and billing.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<{
    preview: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAttachPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachedImage({
        preview: dataUrl,
        base64: dataUrl.split(',')[1],
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text && !attachedImage) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || 'Inspect attached fault photo.',
      imagePreview: attachedImage?.preview,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          wardContext: {
            municipality: activeWard.municipalityName,
            municipalityCode: activeWard.municipalityCode,
            wardNumber: activeWard.wardNumber,
            suburbs: activeWard.suburbs,
            councillor: activeWard.councillor.name,
            depots: activeWard.depots,
          },
          activeReports: reports.map((r) => ({
            id: r.id,
            wardId: r.wardId,
            title: r.title,
            address: r.address,
            status: r.status,
            municipalRef: r.municipalRef,
            clusteredHouseholds: r.clusteredHouseholds,
          })),
          imageBase64: currentImage?.base64,
          imageMimeType: currentImage?.mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ward chat service error.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          actionType: data.actionType,
          matchedReportId: data.matchedReportId,
          ticketDraft: data.ticketDraft,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Unable to reach civic service.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmTicket = (msgId: string, draft: NonNullable<ChatMessage['ticketDraft']>) => {
    const validCat = (['water', 'electricity', 'roads', 'streetlights', 'waste', 'parks', 'safety'].includes(
      draft.categoryId
    )
      ? draft.categoryId
      : 'water') as ServiceCategoryId;

    const newReport: CivicReport = {
      id: `CP-2026-${Math.floor(1100 + Math.random() * 8800)}`,
      wardId: activeWard.id,
      municipalityCode: activeWard.municipalityCode,
      wardNumber: activeWard.wardNumber,
      suburb: activeWard.suburbs[0],
      categoryId: validCat,
      departmentLabel: validCat.charAt(0).toUpperCase() + validCat.slice(1),
      title: draft.title,
      description: draft.description,
      address: draft.address || `${activeWard.corridors[0]}, ${activeWard.suburbs[0]}`,
      lat: activeWard.lat,
      lng: activeWard.lng,
      municipalRef: null,
      status: 'Logged',
      severity: (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(draft.severity)
        ? draft.severity
        : 'MODERATE') as SeverityLevel,
      isEmergency: draft.severity === 'CRITICAL',
      clusteredHouseholds: 1,
      createdAtIso: new Date().toISOString(),
      timeAgoLabel: 'Just now (via Triage Chat)',
      slaDeadlineHours: 24,
      slaElapsedHours: 0,
      assignedDepot: getDepotForCategory(activeWard, validCat),
      reporterName: 'You (Ward Chat)',
      forensics: {
        status: 'WARNING_STRIPPED_METADATA',
        summaryLabel: 'Logged via Conversational Triage',
        timestampLabel: 'Timestamp: Live Chat Session',
        gpsMatchLabel: `Ward ${activeWard.wardNumber} Bound Pin`,
        deviceLabel: 'CivicRewards Chat',
        aiSyntheticScorePct: 0,
        notes: 'Parsed and validated via ward triage.',
      },
      escalationLog: [
        `Logged conversationally to Ward ${activeWard.wardNumber}`,
        `Escalated to ${activeWard.councillor.name} & ${getDepotForCategory(activeWard, validCat)}`,
      ],
      verifiedByResidents: 1,
    };

    onCreateTicketFromChat(newReport, 40);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionExecuted: true } : m))
    );
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm ui-backdrop-enter"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-[#111827] border-l border-slate-200/80 dark:border-white/[0.08] flex flex-col shadow-2xl ui-drawer-right overscroll-contain">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ward Triage Assistant</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ward {activeWard.wardNumber} · Depots, Bylaws & Faults
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close triage assistant"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 cursor-pointer transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-slate-100'
                }`}
              >
                {m.imagePreview && (
                  <img
                    src={m.imagePreview}
                    alt="Chat attachment"
                    className="rounded-xl max-h-40 object-cover"
                  />
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>

                {m.role === 'assistant' &&
                  m.actionType === 'CORROBORATE_EXISTING' &&
                  m.matchedReportId && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
                      <button
                        type="button"
                        disabled={m.actionExecuted}
                        onClick={() => {
                          onCorroborateFromChat(m.matchedReportId!);
                          setMessages((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, actionExecuted: true } : x))
                          );
                        }}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {m.actionExecuted
                            ? `Linked to ${m.matchedReportId} (+15 cr)`
                            : `Link to ${m.matchedReportId} (+15 cr)`}
                        </span>
                      </button>
                    </div>
                  )}

                {m.role === 'assistant' && m.actionType === 'CREATE_TICKET' && m.ticketDraft && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="text-[11px] font-mono opacity-80">
                      {m.ticketDraft.title} · {m.ticketDraft.address} ({m.ticketDraft.severity})
                    </div>
                    <button
                      type="button"
                      disabled={m.actionExecuted}
                      onClick={() => handleConfirmTicket(m.id, m.ticketDraft!)}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {m.actionExecuted
                          ? 'Ticket Logged (+40 cr)'
                          : 'Confirm & Log Ticket (+40 cr)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>Checking ward records...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-white/[0.08] flex gap-1.5 overflow-x-auto no-scrollbar">
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void sendMessage(p)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2"
        >
          {attachedImage && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <img src={attachedImage.preview} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                <span>Photo attached</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttachPhoto(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach fault photo"
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200/90 dark:border-white/12 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer active:scale-95 transition-transform duration-150 shrink-0"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Report a fault or ask a question..."
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200/90 dark:border-white/12 bg-slate-50/70 dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600 transition-[border-color,box-shadow,background-color] duration-150"
            />

            <button
              type="submit"
              disabled={isSending || (!input.trim() && !attachedImage)}
              aria-label="Send message"
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer active:scale-95 transition-[background-color,transform] duration-150 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
