import type { CivicReport } from '../types/civic';
import { copyText } from './clipboard';
import { osmDirectionsUrl } from './mapTiles';
import { slaCountdownLabel } from './sla';

export interface ShareContext {
  wardLabel: string;
  councillorName: string;
}

/** Pre-formatted plain-text fault summary for WhatsApp / SMS / email. */
export function buildReportShareText(report: CivicReport, ctx: ShareContext): string {
  const lines = [
    `CIVIC FAULT REPORT — ${report.id}`,
    `Ref: ${report.municipalRef ?? 'pending (provisional)'}`,
    `${ctx.wardLabel} — ${report.address}`,
    `${report.departmentLabel}: ${report.title}`,
    `Status: ${report.status} · ${report.severity}`,
    report.status === 'Resolved'
      ? 'SLA: resolved and verified'
      : `SLA: ${slaCountdownLabel(report)}`,
    `Households affected: +${report.clusteredHouseholds}`,
    `Map: ${osmDirectionsUrl(report.lat, report.lng)}`,
    `Escalated via CivicPulse AI (${ctx.councillorName})`,
  ];
  return lines.join('\n');
}

/** Normalize a display phone number to wa.me digits (e.g. "+27 82 555 0115" -> "27825550115"). */
export function toWaDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  // Local 0-prefixed SA numbers -> international 27 prefix
  if (d.length === 10 && d.startsWith('0')) return `27${d.slice(1)}`;
  return d;
}

/** One-tap WhatsApp deep link (opens chat with pre-filled message). */
export function waShareUrl(report: CivicReport, ctx: ShareContext, phone: string): string {
  const text = encodeURIComponent(buildReportShareText(report, ctx));
  return `https://wa.me/${toWaDigits(phone)}?text=${text}`;
}

export function openWhatsAppShare(report: CivicReport, ctx: ShareContext, phone: string): void {
  window.open(waShareUrl(report, ctx, phone), '_blank', 'noopener,noreferrer');
}

export async function copyReportSummary(report: CivicReport, ctx: ShareContext): Promise<boolean> {
  return copyText(buildReportShareText(report, ctx));
}
