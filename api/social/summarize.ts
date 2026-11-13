// api/social/summarize.ts – Vercel serverless function
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rawMessage, platform, wardContext, activeReports } = req.body as {
      rawMessage: string;
      platform: string;
      wardContext?: unknown;
      activeReports?: unknown[];
    };

    if (!rawMessage) {
      return res.status(400).json({ error: 'rawMessage is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Platform: ${platform}\nWard Context: ${JSON.stringify(wardContext ?? {})}\nActive Incidents: ${JSON.stringify(activeReports ?? [])}\n\nIncoming Community / Social Post:\n"${rawMessage}"\n\nExtract the municipal entity handle, fault category, suburb/street, official reference number if present, whether it matches an existing active incident ID, and produce a concise 1-sentence unified ward alert.`,
      config: {
        systemInstruction:
          'You are a South African Municipal Social Outage Ingestion AI. Cluster citizen WhatsApp/Telegram/X posts into structured ward alerts and match them to existing tickets when relevant.',
        responseMimeType: 'application/json',
        responseSchema: {
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
      },
    });

    const rawText = (response.text ?? '{}').trim();
    res.json(JSON.parse(rawText));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Social summarizer failed.';
    console.error('Social API error:', message);
    res.status(500).json({ error: message });
  }
}
