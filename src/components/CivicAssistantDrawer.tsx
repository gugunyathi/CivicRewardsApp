import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
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
  'Water has been gushing out of a pipe on Cedar Road for 3 hours',
  'How do I dispute an estimated municipal water bill in CoJ?',
  'Check active outages and tanker schedule for my ward',
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
      text: `Hello! I'm your CivicRewards AI Assistant for ${activeWard.municipalityName}, Ward ${activeWard.wardNumber} (${activeWard.suburbs.join(', ')}). Describe a fault, upload a photo, or ask about municipal bylaws, billing disputes, or depot escalation rules.`,
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
      text: text || 'Please inspect this municipal fault photo.',
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
        throw new Error(data.error || 'Gemini Civic Assistant error.');
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
          text: err instanceof Error ? err.message : 'Unable to reach Civic AI service.',
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
      timeAgoLabel: 'Just now (via AI Chat)',
      slaDeadlineHours: 24,
      slaElapsedHours: 0,
      assignedDepot: getDepotForCategory(activeWard, validCat),
      reporterName: 'You (AI Assistant)',
      forensics: {
        status: 'WARNING_STRIPPED_METADATA',
        summaryLabel: 'Logged via Conversational AI Triage',
        timestampLabel: 'Timestamp: Live Chat Session',
        gpsMatchLabel: `Ward ${activeWard.wardNumber} Bound Pin`,
        deviceLabel: 'CivicRewards AI Chat',
        aiSyntheticScorePct: 0,
        notes: 'Parsed and validated by Gemini Civic Assistant.',
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>CivicRewards AI Assistant</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ward {activeWard.wardNumber} · Bylaws, Depots & Conversational Reporting
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI assistant"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
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

                {/* Action Card: Corroborate */}
                {m.role === 'assistant' &&
                  m.actionType === 'CORROBORATE_EXISTING' &&
                  m.matchedReportId && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={m.actionExecuted}
                        onClick={() => {
                          onCorroborateFromChat(m.matchedReportId!);
                          setMessages((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, actionExecuted: true } : x))
                          );
                        }}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {m.actionExecuted
                            ? `Linked to ${m.matchedReportId} (+15 cr)`
                            : `Link to Existing ${m.matchedReportId} (+15 cr)`}
                        </span>
                      </button>
                    </div>
                  )}

                {/* Action Card: Create Ticket */}
                {m.role === 'assistant' && m.actionType === 'CREATE_TICKET' && m.ticketDraft && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-[11px] font-mono opacity-80">
                      Draft: {m.ticketDraft.title} · {m.ticketDraft.address} ({m.ticketDraft.severity})
                    </div>
                    <button
                      type="button"
                      disabled={m.actionExecuted}
                      onClick={() => handleConfirmTicket(m.id, m.ticketDraft!)}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {m.actionExecuted
                          ? 'Ticket Logged to Ward Feed (+40 cr)'
                          : 'Confirm & Log to Ward Feed (+40 cr)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Checking ward records & municipal bylaws...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto">
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void sendMessage(p)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
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
          className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2"
        >
          {attachedImage && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <img src={attachedImage.preview} alt="Preview" className="w-8 h-8 rounded object-cover" />
                <span>Photo attached for multimodal triage</span>
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
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Report a fault or ask a municipal question..."
              className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />

            <button
              type="submit"
              disabled={isSending || (!input.trim() && !attachedImage)}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
