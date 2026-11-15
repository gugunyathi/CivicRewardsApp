// api/chat.ts – Vercel serverless function
import { Type } from '@google/genai';
import { buildLocalWardTriageFallback, runEconomicAiWithFallback } from '../server-ai';

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req: any, res: any) {
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
