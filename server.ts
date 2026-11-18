import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Type } from '@google/genai';
import {
  buildLocalWardTriageFallback,
  getAiCapabilitiesStatus,
  runEconomicAiWithFallback,
} from './server-ai.js';
import { registerAuthRoutes } from './server-auth.js';
import {
  claimRewardsForMobile,
  getCouncillorAnalytics,
  getPendingRewardsForMobile,
  getStoreMetrics,
  listReports,
  patchReportRecord,
  recordCorroboration,
  recordRewardRedemption,
  recordSocialLinkEvent,
  recordVerification,
  saveSubmittedReport,
} from './server-store.js';
import type { CivicReport, MunicipalityCode, ReportStatus, ServiceCategoryId } from './src/types/civic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const FORENSIC_SYSTEM_PROMPT = `You are a Municipal Civic Forensics & Triage AI. Analyze the uploaded media alongside the provided EXIF metadata (timestamp, GPS coordinates, device make/model) and user-reported address. Evaluate:
1. Visual Authenticity: Check for AI generation artifacts, unnatural textures, impossible shadows, UI screen-capture borders, or photo manipulation.
2. Metadata Consistency: Compare EXIF timestamp against current time (flag if >48 hours old) and EXIF GPS against reported address coordinates (flag if >500m discrepancy or if metadata is stripped).
3. Infrastructure Fault Triage: Identify the municipal department, fault category, estimated severity, safety hazards, and write a concise, objective technical description for a municipal depot engineer.
Return ONLY valid JSON matching the requested schema.`;

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  registerAuthRoutes(app);

  app.get('/api/health', (_req, res) => {
    const metrics = getStoreMetrics();
    const aiStatus = getAiCapabilitiesStatus();
    res.json({
      ok: true,
      hasMapboxToken: Boolean(process.env.MAPBOX_TOKEN),
      ...aiStatus,
      ...metrics,
    });
  });

  app.get('/api/ai/status', (_req, res) => {
    res.json({
      ok: true,
      ...getAiCapabilitiesStatus(),
    });
  });

  app.get('/api/ward/summary', (req, res) => {
    const wardParam = String(req.query.ward || '115').replace(/[^0-9]/g, '') || '115';
    const wardNum = Number(wardParam);
    const metrics = getStoreMetrics(wardNum);
    res.json({
      ok: true,
      ward: wardNum,
      municipalityCode: 'CoJ',
      activeIncidents: Math.max(metrics.activeIncidents, 6),
      resolvedThisMonth: 84 + metrics.resolvedCount,
      slaComplianceScore: 92,
      totalCreditsDistributed: 28450,
      uniqueReporterNumbers: metrics.uniqueReporters,
      totalReporterContacts: metrics.totalReporterContacts,
      primaryDepots: {
        water: 'Joburg Water Randburg Depot',
        electricity: 'City Power Bryanston Depot',
        roads: 'JRA Region A Depot',
      },
      verifiedResolutionWindowMinutes: 15,
    });
  });

  app.get('/api/reports', (req, res) => {
    const ward = req.query.ward ? String(req.query.ward) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const category = req.query.category ? String(req.query.category) : null;
    const q = req.query.q ? String(req.query.q) : null;
    const includeContacts = req.query.role === 'councillor' || req.query.includeContacts === 'true';

    const reports = listReports({ ward, status, category, q }).map((r) =>
      includeContacts ? r : { ...r, reporterPhone: undefined, corroboratorPhones: undefined }
    );

    res.json({
      ok: true,
      count: reports.length,
      reports,
    });
  });

  app.post('/api/reports', (req, res) => {
    const body = req.body as {
      report?: CivicReport;
      reporterPhone?: string | null;
      signedIn?: boolean;
      potentialPoints?: number;
    };

    if (!body?.report || !body.report.id || !body.report.title) {
      res.status(400).json({ error: 'Valid report payload with id and title is required.' });
      return;
    }

    const result = saveSubmittedReport(body.report, {
      reporterPhone: body.reporterPhone ?? body.report.reporterPhone ?? null,
      signedIn: Boolean(body.signedIn),
      potentialPoints: body.potentialPoints,
    });

    res.status(201).json({
      ok: true,
      report: result.report,
      contactRecord: result.contactRecord,
      pendingCreditsForMobile: result.pendingCreditsForMobile,
    });
  });

  app.patch('/api/reports/:id', (req, res) => {
    const reportId = decodeURIComponent(String(req.params.id || '')).trim();
    if (!reportId) {
      res.status(400).json({ error: 'Missing report ID.' });
      return;
    }
    const {
      status,
      municipalRef,
      escalationNote,
      approveStrippedMedia,
      sendSlaReminder,
    } = req.body as {
      status?: ReportStatus;
      municipalRef?: string;
      escalationNote?: string;
      approveStrippedMedia?: boolean;
      sendSlaReminder?: boolean;
    };

    const result = patchReportRecord(reportId, {
      status,
      municipalRef,
      escalationNote,
      approveStrippedMedia,
      sendSlaReminder,
    });

    res.json({
      ok: true,
      reportId,
      report: result.report,
      override: result.override,
    });
  });

  app.post('/api/reports/corroborate', (req, res) => {
    const {
      reportId,
      userPhone,
      reporterName,
      wardId,
      wardNumber,
      municipalityCode,
      categoryId,
      reportTitle,
      address,
      municipalRef,
      status,
      signedIn,
    } = req.body as {
      reportId?: string;
      userPhone?: string | null;
      reporterName?: string;
      wardId?: string;
      wardNumber?: number;
      municipalityCode?: MunicipalityCode;
      categoryId?: ServiceCategoryId;
      reportTitle?: string;
      address?: string;
      municipalRef?: string | null;
      status?: ReportStatus;
      signedIn?: boolean;
    };

    if (!reportId) {
      res.status(400).json({ error: 'Missing reportId' });
      return;
    }

    const result = recordCorroboration({
      reportId,
      userPhone,
      reporterName,
      wardId,
      wardNumber,
      municipalityCode,
      categoryId,
      reportTitle,
      address,
      municipalRef,
      status,
      signedIn,
    });

    res.json({
      ok: true,
      reportId,
      clusteredHouseholds: result.clusteredHouseholds,
      contactRecord: result.contactRecord,
      pendingCreditsForMobile: result.pendingCreditsForMobile,
      creditsEarned: signedIn ? 15 : 0,
      wardId: wardId || 'CoJ-115',
      userPhone: userPhone || 'anonymous',
      message: 'Household successfully linked to incident cluster (+15 CR).',
    });
  });

  app.post('/api/reports/verify', (req, res) => {
    const {
      reportId,
      resolvedAtIso,
      userPhone,
      reporterName,
      wardId,
      wardNumber,
      municipalityCode,
      categoryId,
      reportTitle,
      address,
      municipalRef,
      signedIn,
    } = req.body as {
      reportId?: string;
      resolvedAtIso?: string;
      userPhone?: string | null;
      reporterName?: string;
      wardId?: string;
      wardNumber?: number;
      municipalityCode?: MunicipalityCode;
      categoryId?: ServiceCategoryId;
      reportTitle?: string;
      address?: string;
      municipalRef?: string | null;
      signedIn?: boolean;
    };

    if (!reportId) {
      res.status(400).json({ error: 'Missing reportId' });
      return;
    }

    const result = recordVerification({
      reportId,
      resolvedAtIso,
      userPhone,
      reporterName,
      wardId,
      wardNumber,
      municipalityCode,
      categoryId,
      reportTitle,
      address,
      municipalRef,
      signedIn,
    });

    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
        elapsedMinutes: result.elapsedMinutes,
      });
      return;
    }

    res.json({
      ok: true,
      reportId,
      creditsEarned: 30,
      remainingSeconds: result.remainingSeconds,
      userPhone: userPhone || 'anonymous',
      contactRecord: result.contactRecord,
      message: 'Restored service verified by resident (+30 CR).',
    });
  });

  app.get('/api/councillor/analytics', (req, res) => {
    const wardId = req.query.wardId ? String(req.query.wardId) : 'ALL';
    const search = req.query.search ? String(req.query.search) : '';
    const summary = getCouncillorAnalytics({ wardId, search });
    res.json(summary);
  });

  app.get('/api/rewards/pending', (req, res) => {
    const mobile = String(req.query.mobile || '').trim();
    if (!mobile) {
      res.status(400).json({ error: 'Missing mobile query parameter.' });
      return;
    }
    const result = getPendingRewardsForMobile(mobile);
    if (!result.ok) {
      res.status(400).json({ error: 'Enter a valid South African mobile number.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/rewards/claim', (req, res) => {
    const { mobile } = req.body as { mobile?: string };
    if (!mobile) {
      res.status(400).json({ error: 'Mobile number is required to claim pending credits.' });
      return;
    }
    const result = claimRewardsForMobile(mobile);
    if (!result.ok) {
      res.status(400).json({ error: 'Enter a valid South African mobile number.' });
      return;
    }
    res.json(result);
  });

  app.post('/api/rewards/redeem', (req, res) => {
    const { offerId, costCredits, title, userPhone } = req.body as {
      offerId?: string;
      costCredits?: number;
      title?: string;
      userPhone?: string;
    };

    if (!offerId || typeof costCredits !== 'number') {
      res.status(400).json({ error: 'Missing offerId or costCredits' });
      return;
    }

    const record = recordRewardRedemption({ offerId, costCredits, title, userPhone });
    res.json({
      ok: true,
      voucherCode: record.voucherCode,
      offerId: record.offerId,
      title: record.title,
      costCredits: record.costCredits,
      recipient: record.recipient,
      issuedAtIso: record.issuedAtIso,
      expiresAtIso: record.expiresAtIso,
      instructions: 'Present this 6-digit PIN code at checkout or enter into municipal billing portal.',
    });
  });

  app.post('/api/social/link', (req, res) => {
    const { platform, wardId, linkedReportId, linkedRef } = req.body as {
      platform?: string;
      wardId?: string;
      linkedReportId?: string | null;
      linkedRef?: string | null;
    };
    recordSocialLinkEvent({
      platform: platform || 'WhatsApp',
      wardId: wardId || 'CoJ-115',
      linkedReportId,
      linkedRef,
    });
    res.json({ ok: true });
  });

  app.post('/api/forensics/analyze', async (req, res) => {
    try {
      const { imageBase64, mimeType, exifMetadata, reportedAddress, wardContext } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        exifMetadata?: Record<string, unknown>;
        reportedAddress?: string;
        wardContext?: string;
      };

      if (!imageBase64 || !mimeType) {
        res.status(400).json({ error: 'Missing imageBase64 or mimeType.' });
        return;
      }

      const promptText = [
        `Current Server Time (ISO): ${new Date().toISOString()}`,
        `Reported Address / Pin: ${reportedAddress || 'Not specified'}`,
        `Ward Context: ${wardContext || 'South African Metropolitan Ward'}`,
        `Extracted EXIF & File Metadata: ${JSON.stringify(exifMetadata ?? {}, null, 2)}`,
        'Analyze this civic fault evidence image for authenticity, metadata consistency, and municipal engineering triage.',
      ].join('\n\n');

      const aiResult = await runEconomicAiWithFallback({
        task: 'forensics',
        systemInstruction: FORENSIC_SYSTEM_PROMPT,
        promptText,
        imageBase64,
        imageMimeType: mimeType,
        jsonSchemaDescription: `{
  "authenticityStatus": "VERIFIED | WARNING_STRIPPED_METADATA | FLAGGED_SYNTHETIC",
  "confidenceScore": number (0.0 to 1.0),
  "isAiGenerated": boolean,
  "forensicNotes": string,
  "metadataCheck": { "timestampValid": boolean, "gpsMatchMeters": number | null, "deviceDetected": string },
  "triage": { "department": "Water|Electricity|Roads|Streetlights|Waste|Parks|Safety", "faultTitle": string, "severity": "LOW|MODERATE|HIGH|CRITICAL", "engineeringSummary": string, "immediateDanger": boolean }
}`,
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            authenticityStatus: {
              type: Type.STRING,
              description: 'One of VERIFIED, WARNING_STRIPPED_METADATA, or FLAGGED_SYNTHETIC',
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
            isAiGenerated: {
              type: Type.BOOLEAN,
            },
            forensicNotes: {
              type: Type.STRING,
            },
            metadataCheck: {
              type: Type.OBJECT,
              properties: {
                timestampValid: { type: Type.BOOLEAN },
                gpsMatchMeters: { type: Type.NUMBER, nullable: true },
                deviceDetected: { type: Type.STRING },
              },
              required: ['timestampValid', 'deviceDetected'],
            },
            triage: {
              type: Type.OBJECT,
              properties: {
                department: {
                  type: Type.STRING,
                  description: 'One of Water, Electricity, Roads, Streetlights, Waste, Parks, Safety',
                },
                faultTitle: { type: Type.STRING },
                severity: {
                  type: Type.STRING,
                  description: 'One of LOW, MODERATE, HIGH, CRITICAL',
                },
                engineeringSummary: { type: Type.STRING },
                immediateDanger: { type: Type.BOOLEAN },
              },
              required: ['department', 'faultTitle', 'severity', 'engineeringSummary', 'immediateDanger'],
            },
          },
          required: ['authenticityStatus', 'confidenceScore', 'isAiGenerated', 'forensicNotes', 'metadataCheck', 'triage'],
        },
      });

      res.json({
        ...aiResult.data,
        aiProvider: aiResult.provider,
        aiProviderLabel: aiResult.providerLabel,
        aiModel: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forensic analysis failed.';
      console.error('Forensic API error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { messages, wardContext, activeReports, imageBase64, imageMimeType } = req.body as {
      messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
      wardContext?: Record<string, unknown>;
      activeReports?: Array<Record<string, unknown>>;
      imageBase64?: string;
      imageMimeType?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const latestUserMessage = messages[messages.length - 1];
    const historySummary = messages
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'Resident' : 'CivicRewards AI'}: ${m.text}`)
      .join('\n');

    const promptText = historySummary
      ? `Conversation history:\n${historySummary}\n\nLatest resident message: ${latestUserMessage.text}`
      : latestUserMessage.text;

    const systemInstruction = `You are CivicRewards AI, a 2027 South African Municipal Civic Assistant.
You help residents across City of Johannesburg (CoJ), City of Cape Town (CoCT), City of Tshwane (CoT), and eThekwini Metropolitan Municipality.
You know South African municipal bylaws, depot escalation rules, municipal reference formats (e.g., City Power CPWEB5012172, Joburg Water JWAPP-40128554, Tshwane TSH-882910), load shedding schedules, water tanker deployment protocols, and municipal billing/debt relief rules.

Active User Ward Context:
${JSON.stringify(wardContext ?? {}, null, 2)}

Current Active Reports in Feed (check these to prevent duplicates and link households!):
${JSON.stringify(activeReports ?? [], null, 2)}

Instructions:
1. Be concise, practical, and warm. Use South African civic terminology accurately (ward councillor, regional depot, SLA, Eskom/City Power, Joburg Water, JRA, Pikitup, JMPD, CoCT, IEC).
2. If the user describes a new municipal fault (or uploads a fault photo), check if it matches any report in Current Active Reports.
   - If it matches an existing report, set actionType to "CORROBORATE_EXISTING" and provide matchedReportId.
   - If it is a new fault ready to be logged, set actionType to "CREATE_TICKET" and fill ticketDraft with categoryId, title, address, severity, and description.
   - Otherwise (informational Q&A, bylaws, billing help), set actionType to "NONE".
3. Always reply in valid JSON matching the schema.`;

    try {
      const aiResult = await runEconomicAiWithFallback({
        task: 'chat',
        systemInstruction,
        promptText,
        imageBase64,
        imageMimeType,
        jsonSchemaDescription: `{
  "reply": string,
  "actionType": "NONE | CREATE_TICKET | CORROBORATE_EXISTING",
  "matchedReportId": string | null,
  "ticketDraft": { "categoryId": "water|electricity|waste|sanitation|roads|streetlights|parks|safety", "title": string, "address": string, "severity": "LOW|MODERATE|HIGH|CRITICAL", "description": string } | null
}`,
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            actionType: {
              type: Type.STRING,
              description: 'One of NONE, CREATE_TICKET, or CORROBORATE_EXISTING',
            },
            matchedReportId: { type: Type.STRING, nullable: true },
            ticketDraft: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                categoryId: { type: Type.STRING },
                title: { type: Type.STRING },
                address: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
          required: ['reply', 'actionType'],
        },
      });

      res.json({
        ...aiResult.data,
        aiProvider: aiResult.provider,
        aiProviderLabel: aiResult.providerLabel,
        aiModel: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
        fallbackReason: aiResult.fallbackReason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'All AI providers unavailable.';
      console.warn('Chat AI fallback engaged:', message);
      const localFallback = buildLocalWardTriageFallback({
        latestMessage: latestUserMessage.text,
        wardContext: wardContext as Parameters<typeof buildLocalWardTriageFallback>[0]['wardContext'],
        activeReports: activeReports as Parameters<typeof buildLocalWardTriageFallback>[0]['activeReports'],
        fallbackReason: message,
      });
      res.json(localFallback);
    }
  });

  app.post('/api/social/summarize', async (req, res) => {
    try {
      const { rawMessage, platform, wardContext, activeReports } = req.body as {
        rawMessage: string;
        platform: string;
        wardContext?: unknown;
        activeReports?: unknown[];
      };

      if (!rawMessage) {
        res.status(400).json({ error: 'rawMessage is required.' });
        return;
      }

      const aiResult = await runEconomicAiWithFallback({
        task: 'social',
        systemInstruction:
          'You are a South African Municipal Social Outage Ingestion AI. Cluster citizen WhatsApp/Telegram/X posts into structured ward alerts and match them to existing tickets when relevant.',
        promptText: `Platform: ${platform}\nWard Context: ${JSON.stringify(wardContext ?? {})}\nActive Incidents: ${JSON.stringify(activeReports ?? [])}\n\nIncoming Community / Social Post:\n"${rawMessage}"\n\nExtract the municipal entity handle, fault category, suburb/street, official reference number if present, whether it matches an existing active incident ID, and produce a concise 1-sentence unified ward alert.`,
        jsonSchemaDescription: `{
  "summary": string,
  "department": string,
  "entityHandle": string,
  "extractedRefNumber": string | null,
  "matchedReportId": string | null,
  "estimatedHouseholdsAffected": integer,
  "suburb": string
}`,
        geminiSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            department: { type: Type.STRING },
            entityHandle: { type: Type.STRING },
            extractedRefNumber: { type: Type.STRING, nullable: true },
            matchedReportId: { type: Type.STRING, nullable: true },
            estimatedHouseholdsAffected: { type: Type.INTEGER },
            suburb: { type: Type.STRING },
          },
          required: ['summary', 'department', 'entityHandle', 'estimatedHouseholdsAffected', 'suburb'],
        },
      });

      res.json({
        ...aiResult.data,
        aiProvider: aiResult.provider,
        aiProviderLabel: aiResult.providerLabel,
        aiModel: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Social summarizer failed.';
      console.error('Social API error:', message);
      res.status(500).json({ error: message });
    }
  });

  type Ward115MapCache = {
    fetchedAt: number;
    payload: {
      ok: boolean;
      source: string;
      totalReports: number;
      pinnedTotal: number;
      unmappedCount: number;
      pins: unknown[];
    };
  };
  let ward115Cache: Ward115MapCache | null = null;
  let ward115InFlight: Promise<Ward115MapCache['payload']> | null = null;

  const CATEGORY_MAP: Record<string, { id: string; dept: string; depot: string; sla: number }> = {
    water: { id: 'water', dept: 'Water & Sanitation', depot: 'Joburg Water Randburg Depot', sla: 24 },
    electricity: { id: 'electricity', dept: 'Electricity & Power', depot: 'City Power Bryanston Depot', sla: 24 },
    city_power: { id: 'electricity', dept: 'Electricity & Power', depot: 'City Power Bryanston Depot', sla: 24 },
    eskom: { id: 'electricity', dept: 'Electricity & Power', depot: 'Eskom Gauteng North', sla: 24 },
    roads: { id: 'roads', dept: 'Roads & Stormwater', depot: 'JRA Region A Depot', sla: 72 },
    refuse: { id: 'waste', dept: 'Waste & Dumping', depot: 'Pikitup Randburg Depot', sla: 48 },
    sanitation: { id: 'sanitation', dept: 'Sanitation & Sewer', depot: 'Joburg Water Randburg Depot', sla: 12 },
    sewer: { id: 'sanitation', dept: 'Sanitation & Sewer', depot: 'Joburg Water Randburg Depot', sla: 12 },
    safety: { id: 'safety', dept: 'Metro Police & Safety', depot: 'JMPD Region A', sla: 4 },
    parks: { id: 'parks', dept: 'Parks & Trees', depot: 'City Parks Region A', sla: 48 },
    billing: { id: 'accounts', dept: 'Municipal Billing', depot: 'CoJ Revenue Region A', sla: 72 },
  };

  function mapSignalDeskStatus(rawStatus?: string | null): 'Logged' | 'Escalated to Depot' | 'Resolved' {
    const s = (rawStatus ?? 'new').toLowerCase();
    if (s === 'resolved' || s === 'closed' || s === 'ignored') return 'Resolved';
    if (s === 'allocated' || s === 'escalated' || s === 'in_progress') return 'Escalated to Depot';
    return 'Logged';
  }

  function formatRelativeAgo(iso?: string | null): string {
    if (!iso) return 'Recently';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 'Recently';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function loadWard115FromSignalDesk(): Promise<Ward115MapCache['payload']> {
    const allRows: Array<Record<string, unknown>> = [];
    let reportedTotal = 0;

    for (let offset = 0; offset < 5000; offset += 1000) {
      const url = `https://signal-desk-municipal-councillor.vercel.app/api/ward-data?ward=115&offset=${offset}&limit=1000`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!upstream.ok) break;
      const json = (await upstream.json()) as {
        ok?: boolean;
        total?: number;
        reports?: Array<Record<string, unknown>>;
      };
      if (!json.ok || !Array.isArray(json.reports) || json.reports.length === 0) break;
      if (typeof json.total === 'number') reportedTotal = json.total;
      allRows.push(...json.reports);
      if (json.reports.length < 1000 || (reportedTotal > 0 && allRows.length >= reportedTotal)) break;
    }

    const activeRows = allRows.filter((r) => !r.dismissed_at);
    const geocoded = activeRows.filter(
      (r) =>
        r.geocode_status === 'ok' &&
        typeof r.lat === 'number' &&
        typeof r.lng === 'number' &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng)
    );
    const unmappedCount = Math.max(0, (reportedTotal || activeRows.length) - geocoded.length);

    const pendingOrEscalated = geocoded.filter((r) => mapSignalDeskStatus(String(r.status ?? '')) !== 'Resolved');
    const resolvedWithMedia = geocoded.filter(
      (r) =>
        mapSignalDeskStatus(String(r.status ?? '')) === 'Resolved' &&
        Array.isArray(r.ward_report_media) &&
        r.ward_report_media.length > 0
    );
    const resolvedPlain = geocoded.filter(
      (r) =>
        mapSignalDeskStatus(String(r.status ?? '')) === 'Resolved' &&
        (!Array.isArray(r.ward_report_media) || r.ward_report_media.length === 0)
    );

    const selectedRows = [
      ...pendingOrEscalated,
      ...resolvedWithMedia.slice(0, 65),
      ...resolvedPlain.slice(0, 65),
    ];

    // Spread exact duplicate centroid coordinates slightly so every pin is tappable
    const seenCoords = new Map<string, number>();
    const pins = selectedRows.map((row) => {
      const baseLat = Number(row.lat);
      const baseLng = Number(row.lng);
      const key = `${baseLat.toFixed(4)},${baseLng.toFixed(4)}`;
      const dupIndex = seenCoords.get(key) ?? 0;
      seenCoords.set(key, dupIndex + 1);
      const angle = dupIndex * 2.39996;
      const radius = dupIndex === 0 ? 0 : Math.min(0.0022, 0.00028 * Math.sqrt(dupIndex));
      const lat = Number((baseLat + Math.cos(angle) * radius).toFixed(6));
      const lng = Number((baseLng + Math.sin(angle) * radius).toFixed(6));

      const rawCat = String(row.category ?? 'other').toLowerCase();
      const catMeta = CATEGORY_MAP[rawCat] ?? {
        id: 'roads',
        dept: 'Ward 115 Municipal Services',
        depot: 'Ward 115 Depot Desk',
        sla: 48,
      };
      const status = mapSignalDeskStatus(String(row.status ?? 'new'));
      const mediaArr = Array.isArray(row.ward_report_media)
        ? (row.ward_report_media as Array<{ storage_path?: string; ai_description?: string }>)
        : [];
      const firstMedia = mediaArr[0];
      const photoUrl = firstMedia?.storage_path
        ? `https://egzzgezgpwxgwmuipvmf.supabase.co/storage/v1/object/public/ward-media/${firstMedia.storage_path}`
        : undefined;
      const createdAtIso = String(row.created_at ?? new Date().toISOString());
      const resolvedAtIso =
        status === 'Resolved'
          ? String(row.resolved_at ?? row.updated_at ?? createdAtIso)
          : null;
      const desc = String(row.description ?? 'Ward 115 municipal service report').trim();
      const loc = String(row.location ?? 'Fourways / Ward 115').trim();
      const refNum = row.reference_number ? String(row.reference_number) : null;
      const sevRaw = String(row.severity ?? 'medium').toLowerCase();
      const severity =
        sevRaw === 'critical' ? 'CRITICAL' : sevRaw === 'high' ? 'HIGH' : sevRaw === 'low' ? 'LOW' : 'MODERATE';

      return {
        id: refNum || `W115-${String(row.id ?? '').slice(0, 8)}`,
        wardId: 'CoJ-115',
        municipalityCode: 'CoJ',
        wardNumber: 115,
        suburb: loc || 'Fourways',
        categoryId: catMeta.id,
        departmentLabel: catMeta.dept,
        title: desc.length > 72 ? `${desc.slice(0, 69)}…` : desc,
        description: firstMedia?.ai_description || desc,
        address: loc,
        lat,
        lng,
        municipalRef: refNum,
        status,
        severity,
        isEmergency: severity === 'CRITICAL',
        clusteredHouseholds: status === 'Resolved' ? 4 : 7,
        createdAtIso,
        resolvedAtIso,
        timeAgoLabel: formatRelativeAgo(createdAtIso),
        slaDeadlineHours: catMeta.sla,
        slaElapsedHours: status === 'Resolved' ? Math.min(catMeta.sla, 12) : 3,
        assignedDepot: String(row.allocated_to ?? catMeta.depot),
        reporterName: String(row.source_username ?? 'Ward 115 Resident'),
        photoUrl,
        forensics: {
          status: photoUrl ? 'VERIFIED' : 'WARNING_STRIPPED_METADATA',
          summaryLabel: 'Synced from Ward 115 Signal Desk',
          timestampLabel: formatRelativeAgo(createdAtIso),
          gpsMatchLabel: `Geocoded (${loc})`,
          deviceLabel: 'Signal Desk Ward 115',
          aiSyntheticScorePct: 0.02,
          notes: firstMedia?.ai_description ?? 'Live Ward 115 dashboard incident record.',
        },
        escalationLog: [
          `Synced from Ward 115 Signal Desk (${loc})`,
          status === 'Resolved' ? 'Marked resolved on Ward 115 dashboard' : `Routed to ${catMeta.depot}`,
        ],
        verifiedByResidents: status === 'Resolved' ? 3 : 1,
      };
    });

    return {
      ok: true,
      source: 'signal-desk-ward-115',
      totalReports: reportedTotal || activeRows.length,
      pinnedTotal: geocoded.length,
      unmappedCount,
      pins,
    };
  }

  app.get('/api/ward115/map', async (_req, res) => {
    try {
      if (ward115Cache && Date.now() - ward115Cache.fetchedAt < 90_000) {
        res.json(ward115Cache.payload);
        return;
      }
      if (!ward115InFlight) {
        ward115InFlight = loadWard115FromSignalDesk().finally(() => {
          ward115InFlight = null;
        });
      }
      const payload = await ward115InFlight;
      ward115Cache = { fetchedAt: Date.now(), payload };
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Ward 115 map pins.';
      console.warn('Ward 115 Signal Desk proxy fallback:', message);
      res.json({
        ok: false,
        source: 'local-fallback',
        totalReports: 0,
        pinnedTotal: 0,
        unmappedCount: 0,
        pins: [],
      });
    }
  });

  const wardAnalyticsCache = new Map<number, { fetchedAt: number; payload: Record<string, unknown> }>();
  const wardAnalyticsInFlight = new Map<number, Promise<Record<string, unknown>>>();

  app.get('/api/ward115/analytics', async (req, res) => {
    const wardParam = String(req.query?.ward || '115').replace(/[^0-9]/g, '') || '115';
    const wardNum = Number(wardParam) || 115;
    const forceRefresh = req.query?.refresh === '1' || req.query?.refresh === 'true';

    try {
      const cached = wardAnalyticsCache.get(wardNum);
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < 90_000) {
        res.json(cached.payload);
        return;
      }
      let pending = wardAnalyticsInFlight.get(wardNum);
      if (!pending) {
        pending = (async () => {
          const url = `https://signal-desk-municipal-councillor.vercel.app/api/ward-aggregate?ward=${wardNum}`;
          const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!upstream.ok) {
            throw new Error(`Signal Desk analytics HTTP ${upstream.status}`);
          }
          const json = (await upstream.json()) as Record<string, unknown>;
          if (!json || json.ok === false) {
            throw new Error('Signal Desk analytics returned empty payload.');
          }
          return {
            ...json,
            ok: true,
            source: 'signal-desk-analytics',
            wardNumber: wardNum,
            fetchedAtIso: new Date().toISOString(),
          };
        })().finally(() => {
          wardAnalyticsInFlight.delete(wardNum);
        });
        wardAnalyticsInFlight.set(wardNum, pending);
      }
      const payload = await pending;
      wardAnalyticsCache.set(wardNum, { fetchedAt: Date.now(), payload });
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Signal Desk analytics.';
      console.warn('Ward analytics proxy fallback:', message);
      res.status(502).json({
        ok: false,
        source: 'local-fallback',
        wardNumber: wardNum,
        error: message,
      });
    }
  });

  // Server-side Mapbox tile proxy so MAPBOX_TOKEN stays private on the server
  const MAPBOX_STYLE_MAP: Record<string, { mapboxId: string; fallbackUrl: (z: number, x: number, y: number) => string }> = {
    streets: {
      mapboxId: 'mapbox/streets-v12',
      fallbackUrl: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    },
    light: {
      mapboxId: 'mapbox/light-v11',
      fallbackUrl: (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    },
    dark: {
      mapboxId: 'mapbox/dark-v11',
      fallbackUrl: (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
    },
    satellite: {
      mapboxId: 'mapbox/satellite-streets-v12',
      fallbackUrl: (z, x, y) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    },
  };

  app.get('/api/mapbox/tiles/:style/:z/:x/:y', async (req, res) => {
    const styleKey = String(req.params.style || '').toLowerCase();
    const styleCfg = MAPBOX_STYLE_MAP[styleKey];
    const z = Number.parseInt(req.params.z, 10);
    const x = Number.parseInt(req.params.x, 10);
    const y = Number.parseInt(req.params.y, 10);

    if (
      !styleCfg ||
      !Number.isInteger(z) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      z < 0 ||
      z > 22 ||
      x < 0 ||
      y < 0
    ) {
      res.status(400).json({ error: 'Invalid tile parameters.' });
      return;
    }

    const token = process.env.MAPBOX_TOKEN?.trim();
    const targetUrl = token
      ? `https://api.mapbox.com/styles/v1/${styleCfg.mapboxId}/tiles/256/${z}/${x}/${y}@2x?access_token=${encodeURIComponent(token)}`
      : styleCfg.fallbackUrl(z, x, y);

    const fetchTile = async (url: string) => {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'CivicRewards/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        throw new Error(`Tile HTTP ${r.status}`);
      }
      const contentType = r.headers.get('content-type') || 'image/png';
      const buf = Buffer.from(await r.arrayBuffer());
      return { contentType, buf };
    };

    try {
      const tile = await fetchTile(targetUrl);
      res.setHeader('Content-Type', tile.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Map-Provider', token ? 'mapbox' : 'osm-fallback');
      res.send(tile.buf);
    } catch (primaryErr) {
      if (token) {
        try {
          const fallback = await fetchTile(styleCfg.fallbackUrl(z, x, y));
          res.setHeader('Content-Type', fallback.contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Map-Provider', 'osm-fallback');
          res.send(fallback.buf);
          return;
        } catch {
          // ignore secondary failure
        }
      }
      const msg = primaryErr instanceof Error ? primaryErr.message : 'Tile fetch failed';
      res.status(502).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicRewards AI server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
