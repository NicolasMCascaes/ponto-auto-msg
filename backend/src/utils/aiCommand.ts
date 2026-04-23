export const INDUSTRY_40_COMMAND_PREFIX = '/4.0';

export type AiCommandParseResult =
  | {
      matched: false;
    }
  | {
      matched: true;
      prompt: string | null;
      requiresUsageReply: boolean;
    };

export function parseIndustry40Command(text: string): AiCommandParseResult {
  const normalized = text.trimStart();

  if (!normalized.startsWith(INDUSTRY_40_COMMAND_PREFIX)) {
    return { matched: false };
  }

  const nextCharacter = normalized.charAt(INDUSTRY_40_COMMAND_PREFIX.length);

  if (nextCharacter && !/\s/.test(nextCharacter)) {
    return { matched: false };
  }

  const prompt = normalized.slice(INDUSTRY_40_COMMAND_PREFIX.length).trim();

  if (prompt.length === 0) {
    return {
      matched: true,
      prompt: null,
      requiresUsageReply: true
    };
  }

  return {
    matched: true,
    prompt,
    requiresUsageReply: false
  };
}
