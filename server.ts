import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { registerAuthRoutes } from './server-auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

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
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
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

      const ai = getAiClient();
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
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
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
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forensic analysis failed.';
      console.error('Forensic API error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, wardContext, activeReports, imageBase64, imageMimeType } = req.body as {
        messages: Array<{ role: 'user' | 'assistant'; text: string }>;
        wardContext?: unknown;
        activeReports?: unknown[];
        imageBase64?: string;
        imageMimeType?: string;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const ai = getAiClient();
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
   - If it is a new fault ready to be logged, set actionType to "CREATE_TICKET" and fill ticketDraft with department, title, address, severity, and engineeringSummary.
   - Otherwise (informational Q&A, bylaws, billing help), set actionType to "NONE".
3. Always reply in valid JSON matching the schema.`;

      const latestUserMessage = messages[messages.length - 1];
      const historySummary = messages
        .slice(0, -1)
        .map((m) => `${m.role === 'user' ? 'Resident' : 'CivicRewards AI'}: ${m.text}`)
        .join('\n');

      const promptText = historySummary
        ? `Conversation history:\n${historySummary}\n\nLatest resident message: ${latestUserMessage.text}`
        : latestUserMessage.text;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64 && imageMimeType) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
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
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat assistant error.';
      console.error('Chat API error:', message);
      res.status(500).json({ error: message });
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

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
