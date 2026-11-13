import React, { useState } from 'react';
import { CheckCircle2, Circle, FileText, MessageCircle, Send } from 'lucide-react';
import { MUNICIPALITIES } from '../data/civicSeedData';
import type { CivicReport, WardRecord } from '../types/civic';
import { getRefGuidance } from '../utils/municipalRefs';
import { openWhatsAppShare } from '../utils/share';
import { RefBadge } from './RefBadge';
import { SlaCountdown } from './SlaCountdown';

interface EscalationPanelProps {
  report: CivicReport;
  ward: WardRecord;
  onAttachRef: (reportId: string, refCode: string) => void;
  onSendSlaReminder: (reportId: string) => void;
  className?: string;
}

/**
 * Guided escalation workflow: 1 Log fault → 2 Get municipal ref →
 * 3 Escalate to councillor/depot. Derives step state from the report and
 * offers the next action inline (copy ref, paste official ref, WhatsApp).
 */
export const EscalationPanel: React.FC<EscalationPanelProps> = ({
  report,
  ward,
  onAttachRef,
  onSendSlaReminder,
  className = '',
}) => {
  const [refDraft, setRefDraft] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const hasRef = Boolean(report.municipalRef);
  const escalated =
    report.status === 'Escalated to Depot' ||
    report.status === 'Technician Dispatched' ||
    report.status === 'Resolved' ||
    report.escalationLog.some((e) => /sla follow-up|escalat/i.test(e));

  const entity =
    MUNICIPALITIES[ward.municipalityCode].entities.find((e) =>
      report.assignedDepot.toLowerCase().includes(e.name.split(' ')[0].toLowerCase())
    ) ?? MUNICIPALITIES[ward.municipalityCode].entities[0];
  const guidance = getRefGuidance(report.assignedDepot, entity.handle, entity.slaHours);

  const shareCtx = {
    wardLabel: `${ward.municipalityCode} Ward ${ward.wardNumber} (${report.suburb})`,
    councillorName: ward.councillor.name,
  };

  const steps = [
    {
      id: 'log',
      title: 'Fault logged',
      done: true,
      detail: `${report.id} · ${report.timeAgoLabel}`,
    },
    {
      id: 'ref',
      title: hasRef ? 'Municipal ref captured' : 'Get your municipal ref',
      done: hasRef,
      detail: hasRef ? report.municipalRef! : 'Quote your ticket ID at the depot',
    },
    {
      id: 'escalate',
      title: escalated ? 'Escalated to councillor/depot' : 'Escalate if unresolved',
      done: escalated,
      detail: escalated ? report.assignedDepot : `Send to ${ward.councillor.name}`,
    },
  ];

  return (
    <div className={`border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] p-3 space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Escalation path
        </span>
        <SlaCountdown report={report} />
      </div>

      <ol className="space-y-2">
        {steps.map((s, idx) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {idx + 1}. {s.title}
              </div>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {s.detail}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Step 2 action: capture the official ref */}
      {!hasRef && (
        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-white/10">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={refDraft}
              onChange={(e) => setRefDraft(e.target.value)}
              placeholder={`Official ref (e.g. ${entity.refExample})`}
              className="flex-1 min-h-[36px] px-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs font-mono text-slate-900 dark:text-white"
            />
            <button
              type="button"
              disabled={!refDraft.trim()}
              onClick={() => {
                onAttachRef(report.id, refDraft.trim());
                setRefDraft('');
              }}
              className="min-h-[36px] px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold cursor-pointer"
            >
              Save
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>{showGuide ? 'Hide ref guide' : 'How do I get my ref?'}</span>
          </button>
          {showGuide && (
            <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside bg-white dark:bg-[#05070B] border border-slate-200 dark:border-white/10 p-2.5">
              {guidance.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              <li className="font-mono text-[10px] text-slate-400">
                {guidance.depot} · {guidance.entityHandle} · {guidance.slaHours}h SLA
              </li>
            </ol>
          )}
        </div>
      )}

      {/* Step 3 action: one-tap WhatsApp escalation */}
      {hasRef && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-white/10">
          <RefBadge value={report.municipalRef} />
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => openWhatsAppShare(report, shareCtx, ward.councillor.whatsappEscalation)}
            className="min-h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp {ward.councillor.name.split(' ').slice(-1)[0]}</span>
          </button>
          {!escalated && (
            <button
              type="button"
              onClick={() => onSendSlaReminder(report.id)}
              className="min-h-[36px] px-3 border border-slate-300 dark:border-white/25 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SLA nudge</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
