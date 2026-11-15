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

export const EscalationPanel: React.FC<EscalationPanelProps> = React.memo(({
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

  const _mData = MUNICIPALITIES[ward.municipalityCode] ?? MUNICIPALITIES['CoJ'];
  const entity =
    _mData.entities.find((e) =>
      report.assignedDepot.toLowerCase().includes(e.name.split(' ')[0].toLowerCase())
    ) ?? _mData.entities[0];
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
    <div
      className={`rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.03] p-3.5 space-y-2.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Escalation Path
        </span>
        <SlaCountdown report={report} />
      </div>

      <ol className="space-y-2">
        {steps.map((s, idx) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500 dark:text-slate-600" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {idx + 1}. {s.title}
              </div>
              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {s.detail}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {!hasRef && (
        <div className="space-y-2 pt-2 border-t border-slate-300 dark:border-white/[0.08]">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={refDraft}
              onChange={(e) => setRefDraft(e.target.value)}
              placeholder={`Official ref (e.g. ${entity.refExample})`}
              className="flex-1 h-9 px-2.5 rounded-lg border border-slate-500 dark:border-white/15 bg-white dark:bg-[#0B0F17] text-xs font-mono text-slate-950 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
            />
            <button
              type="button"
              disabled={!refDraft.trim()}
              onClick={() => {
                onAttachRef(report.id, refDraft.trim());
                setRefDraft('');
              }}
              className="h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              Save
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>{showGuide ? 'Hide ref guide' : 'How do I get my ref?'}</span>
          </button>
          {showGuide && (
            <ol className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 list-decimal list-inside rounded-lg bg-white dark:bg-[#0B0F17] border border-slate-300 dark:border-white/[0.08] p-2.5">
              {guidance.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              <li className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                {guidance.depot} · {guidance.entityHandle} · {guidance.slaHours}h SLA
              </li>
            </ol>
          )}
        </div>
      )}

      {hasRef && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-300 dark:border-white/[0.08]">
          <RefBadge value={report.municipalRef} />
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => openWhatsAppShare(report, shareCtx, ward.councillor.whatsappEscalation)}
            className="min-h-[34px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp {ward.councillor.name.split(' ').slice(-1)[0]}</span>
          </button>
          {!escalated && (
            <button
              type="button"
              onClick={() => onSendSlaReminder(report.id)}
              className="min-h-[34px] px-3 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform duration-150"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SLA nudge</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

EscalationPanel.displayName = 'EscalationPanel';
