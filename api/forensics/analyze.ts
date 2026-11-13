// api/forensics/analyze.ts – Vercel serverless function
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

const FORENSIC_SYSTEM_PROMPT = `You are a Municipal Civic Forensics & Triage AI. Analyze the uploaded media alongside the provided EXIF metadata (timestamp, GPS coordinates, device make/model) and user-reported address. Evaluate:
1. Visual Authenticity: Check for AI generation artifacts, unnatural textures, impossible shadows, UI screen-capture borders, or photo manipulation.
2. Metadata Consistency: Compare EXIF timestamp against current time (flag if >48 hours old) and EXIF GPS against reported address coordinates (flag if >500m discrepancy or if metadata is stripped).
3. Infrastructure Fault Triage: Identify the municipal department, fault category, estimated severity, safety hazards, and write a concise, objective technical description for a municipal depot engineer.
Return ONLY valid JSON matching the requested schema.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, mimeType, exifMetadata, reportedAddress, wardContext } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      exifMetadata?: Record<string, unknown>;
      reportedAddress?: string;
      wardContext?: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = [
      `Current Server Time (ISO): ${new Date().toISOString()}`,
      `Reported Address / Pin: ${reportedAddress || 'Not specified'}`,
      `Ward Context: ${wardContext || 'South African Metropolitan Ward'}`,
      `Extracted EXIF & File Metadata: ${JSON.stringify(exifMetadata ?? {}, null, 2)}`,
      'Analyze this civic fault evidence image for authenticity, metadata consistency, and municipal engineering triage.',
    ].join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction: FORENSIC_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
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
                department: { type: Type.STRING },
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
      },
    });

    const rawText = (response.text ?? '{}').trim();
    res.json(JSON.parse(rawText));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Forensic analysis failed.';
    console.error('Forensic API error:', message);
    res.status(500).json({ error: message });
  }
}
