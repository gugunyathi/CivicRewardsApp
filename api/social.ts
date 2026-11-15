// api/social.ts – consolidated Vercel serverless function.
// Serves: POST /api/social/link, POST /api/social/summarize
// (see vercel.json rewrites, which map the nested paths here).
import { Type } from '@google/genai';
import { runEconomicAiWithFallback } from '../server-ai.js';
import { recordSocialLinkEvent } from '../server-store.js';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

function handleLink(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body =
    typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body ?? {});

  const { platform, wardId, linkedReportId, linkedRef } = body as {
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

  res.status(200).json({ ok: true });
}

async function handleSummarize(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rawMessage, platform, wardContext, activeReports } = (req.body || {}) as {
      rawMessage?: string;
      platform?: string;
      wardContext?: unknown;
      activeReports?: unknown[];
    };

    if (!rawMessage) {
      return res.status(400).json({ error: 'rawMessage is required.' });
    }

    const aiResult = await runEconomicAiWithFallback({
      task: 'social',
      systemInstruction:
        'You are a South African Municipal Social Outage Ingestion AI. Cluster citizen WhatsApp/Telegram/X posts into structured ward alerts and match them to existing tickets when relevant.',
      promptText: `Platform: ${platform || 'WhatsApp'}\nWard Context: ${JSON.stringify(wardContext ?? {})}\nActive Incidents: ${JSON.stringify(activeReports ?? [])}\n\nIncoming Community / Social Post:\n"${rawMessage}"\n\nExtract the municipal entity handle, fault category, suburb/street, official reference number if present, whether it matches an existing active incident ID, and produce a concise 1-sentence unified ward alert.`,
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

    return res.json({
      ...aiResult.data,
      aiProvider: aiResult.provider,
      aiProviderLabel: aiResult.providerLabel,
      aiModel: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Social summarizer failed.';
    console.error('Social API error:', message);
    return res.status(500).json({ error: message });
  }
}

export default async function handler(req: any, res: any) {
  const action = String(req.query?.action || '');
  if (action === 'link') {
    handleLink(req, res);
    return;
  }
  if (action === 'summarize') {
    await handleSummarize(req, res);
    return;
  }
  res.status(404).json({ error: `Unknown social action: ${action || '(missing)'}` });
}
