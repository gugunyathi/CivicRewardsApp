import { GoogleGenAI, type Schema } from '@google/genai';

export type AiProviderId =
  | 'gemini-primary'
  | 'gemini-lite'
  | 'claude'
  | 'grok'
  | 'openai'
  | 'openrouter'
  | 'local-triage';

export interface AiRunOptions {
  task: 'chat' | 'forensics' | 'social';
  systemInstruction: string;
  promptText: string;
  geminiSchema: Schema;
  jsonSchemaDescription: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface AiRunResult<T = Record<string, unknown>> {
  data: T;
  provider: AiProviderId;
  providerLabel: string;
  model: string;
  fallbackUsed: boolean;
  triedProviders: string[];
  fallbackReason?: string;
}

// Track temporary cooldowns when a provider hits rate limits / quota exhaustion
const cooldownUntil = new Map<AiProviderId, number>();

function isOnCooldown(provider: AiProviderId): boolean {
  const until = cooldownUntil.get(provider);
  if (!until) return false;
  if (Date.now() > until) {
    cooldownUntil.delete(provider);
    return false;
  }
  return true;
}

function markCooldown(provider: AiProviderId, message: string) {
  const lower = message.toLowerCase();
  const isQuotaOrRate =
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('credit') ||
    lower.includes('billing') ||
    lower.includes('402') ||
    lower.includes('discontinued') ||
    lower.includes('not_found') ||
    lower.includes('404');

  if (isQuotaOrRate) {
    cooldownUntil.set(provider, Date.now() + 60_000);
  }
}

export function getAiCapabilitiesStatus() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasClaude = Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim()
  );
  const hasGrok = Boolean(
    process.env.XAI_API_KEY?.trim() || process.env.GROK_API_KEY?.trim()
  );
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());

  const activeChain: Array<{ id: AiProviderId; model: string; tier: string }> = [];
  if (hasGemini) {
    activeChain.push({ id: 'gemini-primary', model: 'gemini-4-hydrogen', tier: 'free-tier' });
    activeChain.push({ id: 'gemini-lite', model: 'gemini-3.1-flash-lite', tier: 'economic' });
  }
  if (hasClaude) {
    activeChain.push({ id: 'claude', model: 'claude-3-5-haiku-latest', tier: 'economic' });
  }
  if (hasGrok) {
    activeChain.push({ id: 'grok', model: 'grok-3-mini', tier: 'economic' });
  }
  if (hasOpenAi) {
    activeChain.push({ id: 'openai', model: 'gpt-4o-mini', tier: 'economic' });
  }
  if (hasOpenRouter) {
    activeChain.push({ id: 'openrouter', model: 'openai/gpt-4o-mini', tier: 'economic' });
  }

  return {
    hasGeminiKey: hasGemini,
    hasClaudeKey: hasClaude,
    hasGrokKey: hasGrok,
    hasOpenAiKey: hasOpenAi,
    hasOpenRouterKey: hasOpenRouter,
    primaryModel: 'gemini-4-hydrogen',
    economicFallbacks: activeChain,
  };
}

function parseJsonObject<T = Record<string, unknown>>(rawText: string): T {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Model did not return a JSON object.');
  }
  return parsed as T;
}

async function callGemini(
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
  options: AiRunOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (options.imageBase64 && options.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: options.imageMimeType,
        data: options.imageBase64,
      },
    });
  }
  parts.push({ text: options.promptText });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      systemInstruction: options.systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: options.geminiSchema,
    },
  });

  return (response.text ?? '{}').trim();
}

async function callOpenAiCompatible(params: {
  url: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
  supportsJsonFormat: boolean;
  options: AiRunOptions;
}): Promise<string> {
  const { url, apiKey, model, headers = {}, supportsJsonFormat, options } = params;
  const systemText = `${options.systemInstruction}\n\nRespond ONLY with valid JSON matching this schema:\n${options.jsonSchemaDescription}`;

  const userContent:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'auto' } }
      > =
    options.imageBase64 && options.imageMimeType
      ? [
          {
            type: 'image_url',
            image_url: {
              url: `data:${options.imageMimeType};base64,${options.imageBase64}`,
              detail: 'low',
            },
          },
          { type: 'text', text: options.promptText },
        ]
      : options.promptText;

  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userContent },
    ],
  };

  if (supportsJsonFormat) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    throw new Error(payload?.error?.message || `Provider HTTP ${res.status}`);
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from provider.');
  }
  return text;
}

async function callAnthropicClaude(options: AiRunOptions): Promise<string> {
  const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY / CLAUDE_API_KEY not configured.');
  }

  const systemText = `${options.systemInstruction}\n\nReturn ONLY raw JSON (no markdown fences) matching:\n${options.jsonSchemaDescription}`;
  const contentBlocks: Array<
    | { type: 'text'; text: string }
    | {
        type: 'image';
        source: { type: 'base64'; media_type: string; data: string };
      }
  > = [];

  if (options.imageBase64 && options.imageMimeType) {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: options.imageMimeType,
        data: options.imageBase64,
      },
    });
  }
  contentBlocks.push({ type: 'text', text: options.promptText });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system: systemText,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    content?: Array<{ type: string; text?: string }>;
  };

  if (!res.ok) {
    throw new Error(payload?.error?.message || `Anthropic HTTP ${res.status}`);
  }

  const text = payload?.content?.find((c) => c.type === 'text')?.text;
  if (!text) {
    throw new Error('Empty response from Anthropic Claude.');
  }
  return text;
}

export async function runEconomicAiWithFallback<T = Record<string, unknown>>(
  options: AiRunOptions
): Promise<AiRunResult<T>> {
  const hasImage = Boolean(options.imageBase64 && options.imageMimeType);

  interface Candidate {
    id: AiProviderId;
    label: string;
    model: string;
    configured: boolean;
    run: () => Promise<string>;
  }

  const geminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const claudeKey = Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim()
  );
  const grokKey = (process.env.XAI_API_KEY || process.env.GROK_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

  const grokModel = hasImage ? 'grok-2-vision-1212' : 'grok-3-mini';

  const candidates: Candidate[] = [
    {
      id: 'gemini-primary',
      label: 'Gemini 4 Hydrogen (Free Tier)',
      model: 'gemini-4-hydrogen',
      configured: geminiKey,
      run: () => callGemini('gemini-4-hydrogen', options),
    },
    {
      id: 'gemini-lite',
      label: 'Gemini 3.1 Flash-Lite',
      model: 'gemini-3.1-flash-lite',
      configured: geminiKey,
      run: () => callGemini('gemini-3.1-flash-lite', options),
    },
    {
      id: 'claude',
      label: 'Anthropic Claude 3.5 Haiku',
      model: 'claude-3-5-haiku-latest',
      configured: claudeKey,
      run: () => callAnthropicClaude(options),
    },
    {
      id: 'grok',
      label: hasImage ? 'xAI Grok 2 Vision' : 'xAI Grok 3 Mini',
      model: grokModel,
      configured: Boolean(grokKey),
      run: () =>
        callOpenAiCompatible({
          url: 'https://api.x.ai/v1/chat/completions',
          apiKey: grokKey,
          model: grokModel,
          supportsJsonFormat: !hasImage,
          options,
        }),
    },
    {
      id: 'openai',
      label: 'OpenAI GPT-4o Mini',
      model: 'gpt-4o-mini',
      configured: Boolean(openAiKey),
      run: () =>
        callOpenAiCompatible({
          url: 'https://api.openai.com/v1/chat/completions',
          apiKey: openAiKey,
          model: 'gpt-4o-mini',
          supportsJsonFormat: true,
          options,
        }),
    },
    {
      id: 'openrouter',
      label: 'OpenRouter Economic Fallback',
      model: 'openai/gpt-4o-mini',
      configured: Boolean(openRouterKey),
      run: () =>
        callOpenAiCompatible({
          url: 'https://openrouter.ai/api/v1/chat/completions',
          apiKey: openRouterKey,
          model: 'openai/gpt-4o-mini',
          headers: { 'HTTP-Referer': process.env.APP_URL || 'https://civicrewards.app' },
          supportsJsonFormat: true,
          options,
        }),
    },
  ];

  const configuredCandidates = candidates.filter((c) => c.configured);
  const triedProviders: string[] = [];
  const errors: string[] = [];
  let firstFailureReason: string | undefined;

  for (let i = 0; i < configuredCandidates.length; i++) {
    const candidate = configuredCandidates[i];
    if (isOnCooldown(candidate.id) && i < configuredCandidates.length - 1) {
      triedProviders.push(`${candidate.model} (cooldown skipped)`);
      continue;
    }

    try {
      triedProviders.push(candidate.model);
      const rawText = await candidate.run();
      const parsed = parseJsonObject<T>(rawText);
      const fallbackUsed = candidate.id !== 'gemini-primary';
      return {
        data: parsed,
        provider: candidate.id,
        providerLabel: candidate.label,
        model: candidate.model,
        fallbackUsed,
        triedProviders,
        fallbackReason: fallbackUsed ? firstFailureReason : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!firstFailureReason) firstFailureReason = msg;
      errors.push(`${candidate.model}: ${msg}`);
      markCooldown(candidate.id, msg);
    }
  }

  const configuredSummary =
    configuredCandidates.length === 0
      ? 'No AI API keys are configured in Settings > Secrets.'
      : errors.join(' | ');
  throw new Error(configuredSummary);
}

/**
 * Deterministic SA Ward Triage Fallback when Gemini free-tier is exhausted
 * AND no external Claude / Grok / OpenAI key is configured or reachable.
 */
export function buildLocalWardTriageFallback(params: {
  latestMessage: string;
  wardContext?: {
    municipality?: string;
    municipalityCode?: string;
    wardNumber?: number;
    suburbs?: string[];
    councillor?: string;
    depots?: Record<string, string>;
  };
  activeReports?: Array<{
    id?: string;
    wardId?: string;
    title?: string;
    address?: string;
    status?: string;
    municipalRef?: string | null;
    clusteredHouseholds?: number;
  }>;
  fallbackReason?: string;
}) {
  const msg = params.latestMessage.trim();
  const lower = msg.toLowerCase();
  const wardNum = params.wardContext?.wardNumber ?? 115;
  const suburb = params.wardContext?.suburbs?.[0] ?? 'Fourways';

  // Detect category
  let categoryId = 'water';
  let label = 'Water Supply';
  let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'HIGH';

  if (/(power|outage|electric|substation|transformer|trip|blackout|cable|eskom|city power)/.test(lower)) {
    categoryId = 'electricity';
    label = 'Electricity & Power';
    severity = /(spark|live|downed|fire|substation|explosion)/.test(lower) ? 'CRITICAL' : 'HIGH';
  } else if (/(sewer|sewage|sanitation|drain overflow|manhole smell)/.test(lower)) {
    categoryId = 'sanitation';
    label = 'Sanitation & Sewer';
    severity = 'CRITICAL';
  } else if (/(pothole|road|sinkhole|stormwater|tar|asphalt|bridge|jra)/.test(lower)) {
    categoryId = 'roads';
    label = 'Roads & Stormwater';
    severity = /(sinkhole|collapse)/.test(lower) ? 'CRITICAL' : 'HIGH';
  } else if (/(robot|signal|traffic light|streetlight|street lamp|pole dark)/.test(lower)) {
    categoryId = 'streetlights';
    label = 'Signals & Lighting';
    severity = /(traffic|robot|intersection)/.test(lower) ? 'CRITICAL' : 'MODERATE';
  } else if (/(bin|refuse|rubbish|trash|dumping|pikitup|waste)/.test(lower)) {
    categoryId = 'waste';
    label = 'Refuse & Waste';
    severity = 'MODERATE';
  } else if (/(tree|park|grass|verge|branch)/.test(lower)) {
    categoryId = 'parks';
    label = 'Parks & Trees';
    severity = /(fallen tree|blocking)/.test(lower) ? 'HIGH' : 'MODERATE';
  } else if (/(bylaw|police|jmpd|unsafe|abandoned|traffic jam)/.test(lower)) {
    categoryId = 'safety';
    label = 'Metro Safety & Bylaws';
    severity = 'MODERATE';
  } else if (/(pipe|burst|leak|water|tap|pressure|hydrant|tanker)/.test(lower)) {
    categoryId = 'water';
    label = 'Water Supply';
    severity = /(burst|gushing|flood)/.test(lower) ? 'CRITICAL' : 'HIGH';
  }

  // Informational Q&A check (billing, tariff, bylaw, tanker schedule)
  const isInfoQuery =
    /(bill|invoice|tariff|account|dispute|rebate|bylaw|how do i|what is|schedule)/.test(lower) &&
    !/(burst|outage|pothole|leak|overflow|broken|dead|dark|dump)/.test(lower);

  if (isInfoQuery) {
    return {
      reply: `Using Ward ${wardNum} local municipal guidance: For ${params.wardContext?.municipalityCode || 'CoJ'} billing or meter queries, keep your municipal account number ready, submit an actual meter reading photo, or log a query from the Accounts portal on Services Hub. Escalations in Ward ${wardNum} route to ${params.wardContext?.councillor || 'your Ward Councillor'}.`,
      actionType: 'NONE',
      matchedReportId: null,
      ticketDraft: null,
      aiProvider: 'local-triage' as AiProviderId,
      aiProviderLabel: 'Local Ward Triage Fallback',
      aiModel: 'ward-rules-v1',
      fallbackUsed: true,
      fallbackReason: params.fallbackReason,
    };
  }

  // Check activeReports for possible match
  const tokens = lower
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !['water', 'power', 'street', 'road', 'ward', 'near', 'hours'].includes(t));
  const match = (params.activeReports || []).find((r) => {
    if (!r.id || r.status === 'Resolved') return false;
    const hay = `${r.title || ''} ${r.address || ''}`.toLowerCase();
    return tokens.some((tok) => hay.includes(tok));
  });

  if (match && match.id) {
    return {
      reply: `I matched your description with active Ward ${wardNum} report ${match.id} (${match.title} at ${match.address || suburb}). Tap "+1 Link" below to corroborate it and boost depot priority.`,
      actionType: 'CORROBORATE_EXISTING',
      matchedReportId: match.id,
      ticketDraft: null,
      aiProvider: 'local-triage' as AiProviderId,
      aiProviderLabel: 'Local Ward Triage Fallback',
      aiModel: 'ward-rules-v1',
      fallbackUsed: true,
      fallbackReason: params.fallbackReason,
    };
  }

  // Extract rough street phrase or fallback to ward suburb
  const streetMatch = msg.match(/\b(?:on|at|near)\s+([A-Za-z0-9\s&'-]{4,40})/i);
  const address = streetMatch?.[1]?.trim()
    ? `${streetMatch[1].trim()}, ${suburb}, Ward ${wardNum}`
    : `${suburb}, Ward ${wardNum}`;

  return {
    reply: `I've prepared a ${label} ticket draft for Ward ${wardNum} (${suburb}). Review the location and severity below and confirm to route it to the regional depot & Ward Councillor.`,
    actionType: 'CREATE_TICKET',
    matchedReportId: null,
    ticketDraft: {
      categoryId,
      title: msg.length > 68 ? `${label}: ${msg.slice(0, 62)}...` : `${label}: ${msg}`,
      address,
      severity,
      description: `Reported via Ward ${wardNum} Triage Assistant: ${msg}`,
    },
    aiProvider: 'local-triage' as AiProviderId,
    aiProviderLabel: 'Local Ward Triage Fallback',
    aiModel: 'ward-rules-v1',
    fallbackUsed: true,
    fallbackReason: params.fallbackReason,
  };
}
