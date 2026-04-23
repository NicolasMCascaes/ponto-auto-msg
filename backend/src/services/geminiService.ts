type GeminiErrorCode = 'timeout' | 'rate_limit' | 'unavailable' | 'unexpected';

type GeminiGenerateInput = {
  prompt: string;
  systemInstruction: string;
  model?: string;
  timeoutMs?: number;
  generationConfig?: {
    responseMimeType?: 'text/plain' | 'application/json';
    maxOutputTokens?: number;
    temperature?: number;
  };
};

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    readonly code: GeminiErrorCode,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_GEMINI_TIMEOUT_MS = 10_000;

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getDefaultGeminiModel(): string {
  return getGeminiModel();
}

function getGeminiTimeoutMs(): number {
  const raw = Number.parseInt(process.env.GEMINI_API_TIMEOUT_MS ?? '', 10);

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_GEMINI_TIMEOUT_MS;
  }

  return raw;
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiServiceError('GEMINI_API_KEY nao configurada.', 'unexpected');
  }

  return apiKey;
}

function extractResponseText(payload: GeminiResponse): string | null {
  const texts =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .filter((part) => part.thought !== true)
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean) ?? [];

  if (texts.length === 0) {
    return null;
  }

  return texts.join('\n\n').trim();
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeError = payload as {
    error?: {
      message?: string;
    };
  };

  return maybeError.error?.message?.trim() || null;
}

function classifyHttpError(statusCode: number, message: string): GeminiServiceError {
  if (statusCode === 429) {
    return new GeminiServiceError(message, 'rate_limit', statusCode);
  }

  if (statusCode === 408 || statusCode === 503 || statusCode === 504) {
    return new GeminiServiceError(message, 'unavailable', statusCode);
  }

  if (statusCode >= 500) {
    return new GeminiServiceError(message, 'unavailable', statusCode);
  }

  return new GeminiServiceError(message, 'unexpected', statusCode);
}

class GeminiService {
  async generateText(input: GeminiGenerateInput): Promise<string> {
    const apiKey = getApiKey();
    const model = input.model?.trim() || getGeminiModel();
    const controller = new AbortController();
    const timeoutMs = input.timeoutMs ?? getGeminiTimeoutMs();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(buildGeminiUrl(model), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: input.systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: input.prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: input.generationConfig?.responseMimeType ?? 'text/plain',
            maxOutputTokens: input.generationConfig?.maxOutputTokens ?? 256,
            temperature: input.generationConfig?.temperature ?? 0.6
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorPayload = await safeReadJson(response);
        const errorMessage =
          getErrorMessage(errorPayload) ??
          `Falha ao consultar Gemini (HTTP ${response.status}).`;

        throw classifyHttpError(response.status, errorMessage);
      }

      const payload = (await response.json()) as GeminiResponse;
      const text = extractResponseText(payload);

      if (!text) {
        throw new GeminiServiceError('Gemini retornou uma resposta vazia.', 'unexpected');
      }

      return text;
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeminiServiceError('Tempo limite excedido ao consultar Gemini.', 'timeout');
      }

      throw new GeminiServiceError(
        error instanceof Error ? error.message : 'Falha inesperada ao consultar Gemini.',
        'unexpected'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const geminiService = new GeminiService();
