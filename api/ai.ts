// api/ai.ts – consolidated Vercel serverless function.
// Serves: POST /api/chat, GET /api/ai/status, POST /api/forensics/analyze
// (see vercel.json rewrites, which map the nested paths here).
import { Type } from '@google/genai';
import {
  buildLocalWardTriageFallback,
  getAiCapabilitiesStatus,
  runEconomicAiWithFallback,
} from '../server-ai';

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

function handleStatus(_req: any, res: any) {
  res.json({
    ok: true,
    ...getAiCapabilitiesStatus(),
  });
}

const FORENSIC_SYSTEM_PROMPT = `You are a Municipal Civic Forensics & Triage AI. Analyze the uploaded media alongside the provided EXIF metadata (timestamp, GPS coordinates, device make/model) and user-reported address. Evaluate:
1. Visual Authenticity: Check for AI generation artifacts, unnatural textures, impossible shadows, UI screen-capture borders, or photo manipulation.
2. Metadata Consistency: Compare EXIF timestamp against current time (flag if >48 hours old) and EXIF GPS against reported address coordinates (flag if >500m discrepancy or if metadata is stripped).
3. Infrastructure Fault Triage: Identify the municipal department, fault category, estimated severity, safety hazards, and write a concise, objective technical description for a municipal depot engineer.
Return ONLY valid JSON matching the requested schema.`;

async function handleForensics(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, exifMetadata, reportedAddress, wardContext } = (req.body || {}) as {
      imageBase64?: string;
      mimeType?: string;
      exifMetadata?: Record<string, unknown>;
      reportedAddress?: string;
      wardContext?: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType.' });
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
          confidenceScore: { type: Type.NUMBER },
          isAiGenerated: { type: Type.BOOLEAN },
          forensicNotes: { type: Type.STRING },
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
              severity: { type: Type.STRING, description: 'One of LOW, MODERATE, HIGH, CRITICAL' },
              engineeringSummary: { type: Type.STRING },
              immediateDanger: { type: Type.BOOLEAN },
            },
            required: ['department', 'faultTitle', 'severity', 'engineeringSummary', 'immediateDanger'],
          },
        },
        required: ['authenticityStatus', 'confidenceScore', 'isAiGenerated', 'forensicNotes', 'metadataCheck', 'triage'],
      },
    });

    return res.json({
      ...aiResult.data,
      aiProvider: aiResult.provider,
      aiProviderLabel: aiResult.providerLabel,
      aiModel: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Forensic analysis failed.';
    console.error('Forensic API error:', message);
    return res.status(500).json({ error: message });
  }
}

async function handleChat(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, wardContext, activeReports, imageBase64, imageMimeType } = (req.body || {}) as {
    messages?: Array<{ role: 'user' | 'assistant'; text: string }>;
    wardContext?: Record<string, unknown>;
    activeReports?: Array<Record<string, unknown>>;
    imageBase64?: string;
    imageMimeType?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
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

    return res.json({
      ...aiResult.data,
      aiProvider: aiResult.provider,
      aiProviderLabel: aiResult.providerLabel,
      aiModel: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
      fallbackReason: aiResult.fallbackReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'All AI providers unavailable.';
    console.warn('Chat API fallback engaged:', message);
    const localFallback = buildLocalWardTriageFallback({
      latestMessage: latestUserMessage.text,
      wardContext: wardContext as Parameters<typeof buildLocalWardTriageFallback>[0]['wardContext'],
      activeReports: activeReports as Parameters<typeof buildLocalWardTriageFallback>[0]['activeReports'],
      fallbackReason: message,
    });
    return res.json(localFallback);
  }
}

export default async function handler(req: any, res: any) {
  const action = String(req.query?.action || '');
  if (action === 'status') {
    handleStatus(req, res);
    return;
  }
  if (action === 'forensics') {
    await handleForensics(req, res);
    return;
  }
  if (action === 'chat') {
    await handleChat(req, res);
    return;
  }
  res.status(404).json({ error: `Unknown ai action: ${action || '(missing)'}` });
}
