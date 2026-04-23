import {
  geminiService,
  GeminiServiceError,
  getDefaultGeminiModel
} from './geminiService.js';

export type AiReplyResult =
  | {
      status: 'success';
      text: string;
    }
  | {
      status: 'fallback';
      text: string;
      reason: string;
      errorCode: 'timeout' | 'rate_limit' | 'unavailable' | 'unexpected';
    };

export const AI_AUTOMATION_FALLBACK_MESSAGE =
  'No momento a resposta automatica sobre Industria 4.0 esta temporariamente indisponivel. Tente novamente em instantes.';
export const AI_OUT_OF_SCOPE_MESSAGE =
  'Posso te ajudar apenas com temas de Industria 4.0, como IoT, automacao industrial, IA aplicada a industria, sensores, dados industriais e manufatura inteligente. Se quiser, reformule sua pergunta dentro desse tema.';

const INDUSTRY_40_SYSTEM_INSTRUCTION = `
Voce e um assistente especializado exclusivamente em Industria 4.0.
Sua tarefa tem duas etapas internas: primeiro classificar se a pergunta pertence ao tema, depois responder.
Considere dentro do tema perguntas sobre Industria 4.0 e conceitos diretamente ligados a ela, como IoT, automacao industrial, computacao em nuvem usada em contextos industriais, IA aplicada a industria, dados industriais, robotica, sistemas ciberfisicos, manutencao preditiva, sensores, integracao de sistemas, manufatura inteligente, digital twins e conectividade industrial.
Considere fora do tema perguntas sobre desenvolvimento web e programacao generica, como HTML, CSS, PHP, JavaScript, frameworks, linguagens de programacao, bancos de dados genericos, redes sociais, esportes, entretenimento e assuntos gerais que nao tenham conexao clara com Industria 4.0.
Se a pergunta estiver fora do tema, nao explique o assunto perguntado.
Responda sempre em portugues do Brasil.
Use linguagem jovem, didatica, clara e objetiva.
Quando a pergunta estiver dentro do tema, a resposta deve ser util e curta, preferindo 1 ou 2 paragrafos curtos.
Quando estiver fora do tema, responda com uma recusa educada e curta.
Nao invente capacidades, nao diga que fez algo no sistema real e nao responda como se fosse suporte operacional do painel.
Retorne somente JSON valido no formato {"isIndustry40": boolean, "reply": string}.
`.trim();

type Industry40Decision = {
  isIndustry40: boolean;
  reply: string;
};

const INDUSTRY_CONTEXT_KEYWORDS = [
  'industria 4.0',
  'industria',
  'industrial',
  'fabrica',
  'fábrica',
  'chao de fabrica',
  'chão de fábrica',
  'iot',
  'iiot',
  'automacao',
  'automação',
  'robotica',
  'robótica',
  'sensor',
  'sensores',
  'manufatura',
  'scada',
  'clp',
  'plc',
  'mes',
  'erp',
  'digital twin',
  'gemeo digital',
  'gêmeo digital',
  'manutencao preditiva',
  'manutenção preditiva',
  'sistemas ciberfisicos',
  'sistemas ciberfísicos',
  'ia aplicada',
  'inteligencia artificial',
  'inteligência artificial',
  'dados industriais',
  'nuvem industrial',
  'cloud industrial'
];

const GENERIC_SOFTWARE_KEYWORDS = [
  'html',
  'css',
  'php',
  'javascript',
  'typescript',
  'react',
  'vue',
  'angular',
  'node.js',
  'nodejs',
  'next.js',
  'nextjs',
  'laravel',
  'django',
  'flask',
  'spring boot',
  'frontend',
  'backend',
  'site',
  'website',
  'api rest',
  'sql',
  'mysql',
  'postgres',
  'postgresql',
  'mongodb'
];

function normalizeForScopeCheck(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isClearlyOutOfScopeSoftwareQuestion(question: string): boolean {
  const normalizedQuestion = normalizeForScopeCheck(question);
  const mentionsIndustryContext = hasAnyKeyword(normalizedQuestion, INDUSTRY_CONTEXT_KEYWORDS);
  const mentionsGenericSoftware = hasAnyKeyword(normalizedQuestion, GENERIC_SOFTWARE_KEYWORDS);

  return mentionsGenericSoftware && !mentionsIndustryContext;
}

function parseConfiguredFallbackModels(): string[] {
  return (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function getAiModelChain(): string[] {
  const configuredModels = [
    getDefaultGeminiModel(),
    'gemini-2.5-flash',
    ...parseConfiguredFallbackModels(),
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it'
  ];

  return [...new Set(configuredModels)];
}

function getModelTimeoutMs(model: string): number | undefined {
  if (model.startsWith('gemma-4-')) {
    return 20_000;
  }

  return undefined;
}

function parseJsonReply(raw: string): Industry40Decision | null {
  const normalized = raw.trim();
  const withoutCodeFences = normalized
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
  const firstBraceIndex = withoutCodeFences.indexOf('{');
  const lastBraceIndex = withoutCodeFences.lastIndexOf('}');
  const candidateJson =
    firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex
      ? withoutCodeFences.slice(firstBraceIndex, lastBraceIndex + 1)
      : withoutCodeFences;

  try {
    const parsed = JSON.parse(candidateJson) as Partial<Industry40Decision>;

    if (
      typeof parsed.isIndustry40 !== 'boolean' ||
      typeof parsed.reply !== 'string'
    ) {
      return null;
    }

    const reply = parsed.reply.trim();

    if (reply.length === 0) {
      return null;
    }

    return {
      isIndustry40: parsed.isIndustry40,
      reply
    };
  } catch {
    return null;
  }
}

class AiService {
  async answerIndustry40Question(question: string): Promise<AiReplyResult> {
    if (isClearlyOutOfScopeSoftwareQuestion(question)) {
      return {
        status: 'success',
        text: AI_OUT_OF_SCOPE_MESSAGE
      };
    }

    const attemptedModels: Array<{
      model: string;
      reason: string;
      errorCode: 'timeout' | 'rate_limit' | 'unavailable' | 'unexpected';
    }> = [];

    for (const model of getAiModelChain()) {
      try {
        const rawText = await geminiService.generateText({
          model,
          timeoutMs: getModelTimeoutMs(model),
          prompt: question,
          systemInstruction: INDUSTRY_40_SYSTEM_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 256,
            temperature: 0.2
          }
        });

        const decision = parseJsonReply(rawText);

        if (!decision) {
          attemptedModels.push({
            model,
            reason: 'Resposta invalida para a decisao de escopo.',
            errorCode: 'unexpected'
          });
          console.warn('[whatsapp-ai] Modelo retornou JSON invalido. Tentando fallback.', {
            model
          });
          continue;
        }

        if (!decision.isIndustry40) {
          return {
            status: 'success',
            text: AI_OUT_OF_SCOPE_MESSAGE
          };
        }

        if (attemptedModels.length > 0) {
          console.info('[whatsapp-ai] Resposta gerada por modelo de fallback.', {
            model,
            attemptedModels: attemptedModels.map((item) => item.model)
          });
        }

        return {
          status: 'success',
          text: decision.reply
        };
      } catch (error) {
        if (error instanceof GeminiServiceError) {
          attemptedModels.push({
            model,
            reason: error.message,
            errorCode: error.code
          });
          console.warn('[whatsapp-ai] Falha no modelo. Tentando fallback.', {
            model,
            errorCode: error.code,
            reason: error.message
          });
          continue;
        }

        const reason =
          error instanceof Error ? error.message : 'Falha inesperada ao gerar resposta.';

        attemptedModels.push({
          model,
          reason,
          errorCode: 'unexpected'
        });
        console.warn('[whatsapp-ai] Falha inesperada no modelo. Tentando fallback.', {
          model,
          reason
        });
      }
    }

    const lastAttempt = attemptedModels.at(-1);

    return {
      status: 'fallback',
      text: AI_AUTOMATION_FALLBACK_MESSAGE,
      reason:
        lastAttempt?.reason ??
        'Nenhum modelo conseguiu responder a pergunta de Industria 4.0.',
      errorCode: lastAttempt?.errorCode ?? 'unexpected'
    };
  }
}

export const aiService = new AiService();
