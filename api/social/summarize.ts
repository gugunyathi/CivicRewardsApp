// api/social/summarize.ts – Vercel serverless function
import { Type } from '@google/genai';
import { runEconomicAiWithFallback } from '../../server-ai';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req: any, res: any) {
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
