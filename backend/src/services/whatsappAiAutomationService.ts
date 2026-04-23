import {
  extractMessageContent,
  isJidGroup,
  isJidNewsletter,
  isJidStatusBroadcast,
  isJidUser,
  isLidUser,
  type BaileysEventMap,
  type WAMessage
} from '@whiskeysockets/baileys';
import { aiService } from './aiService.js';
import { parseIndustry40Command } from '../utils/aiCommand.js';

type HandleMessagesInput = BaileysEventMap['messages.upsert'];

type HandleMessagesContext = {
  sendTextMessageToJid: (jid: string, text: string) => Promise<void>;
};

const AI_USAGE_MESSAGE =
  'Envie sua pergunta no formato /4.0 sua duvida sobre Industria 4.0. Exemplo: /4.0 explique IoT de forma simples';
const DEDUP_TTL_MS = 15 * 60 * 1000;
const DEDUP_MAX_ENTRIES = 500;

function isAiAutomationEnabled(): boolean {
  return process.env.WHATSAPP_AI_AUTOREPLY_ENABLED?.trim().toLowerCase() === 'true';
}

function extractIncomingText(message: WAMessage): string | null {
  const content = extractMessageContent(message.message);

  if (!content) {
    return null;
  }

  if (typeof content.conversation === 'string') {
    return content.conversation;
  }

  if (typeof content.extendedTextMessage?.text === 'string') {
    return content.extendedTextMessage.text;
  }

  if (typeof content.imageMessage?.caption === 'string') {
    return content.imageMessage.caption;
  }

  if (typeof content.videoMessage?.caption === 'string') {
    return content.videoMessage.caption;
  }

  return null;
}

function isPrivateChat(jid: string): boolean {
  return Boolean(isJidUser(jid) || isLidUser(jid));
}

class WhatsappAiAutomationService {
  private processedMessageIds = new Map<string, number>();

  async handleMessagesUpsert(
    input: HandleMessagesInput,
    context: HandleMessagesContext
  ): Promise<void> {
    if (!isAiAutomationEnabled() || input.type !== 'notify') {
      return;
    }

    for (const message of input.messages) {
      try {
        await this.handleIncomingMessage(message, context);
      } catch (error) {
        console.error('[whatsapp-ai] Falha inesperada ao processar mensagem recebida.', error);
      }
    }
  }

  private async handleIncomingMessage(
    message: WAMessage,
    context: HandleMessagesContext
  ): Promise<void> {
    const remoteJid = message.key.remoteJid;
    const messageId = message.key.id;

    if (!remoteJid || !messageId) {
      return;
    }

    if (message.key.fromMe) {
      return;
    }

    if (
      isJidGroup(remoteJid) ||
      isJidStatusBroadcast(remoteJid) ||
      isJidNewsletter(remoteJid) ||
      !isPrivateChat(remoteJid)
    ) {
      return;
    }

    if (this.hasProcessedMessage(messageId)) {
      return;
    }

    this.markMessageAsProcessed(messageId);

    const incomingText = extractIncomingText(message)?.trim();

    if (!incomingText) {
      return;
    }

    const command = parseIndustry40Command(incomingText);

    if (!command.matched) {
      return;
    }

    if (command.requiresUsageReply || !command.prompt) {
      await context.sendTextMessageToJid(remoteJid, AI_USAGE_MESSAGE);
      console.info('[whatsapp-ai] Respondeu com mensagem de uso.', {
        remoteJid,
        messageId
      });
      return;
    }

    console.info('[whatsapp-ai] Comando /4.0 recebido.', {
      remoteJid,
      messageId
    });

    const reply = await aiService.answerIndustry40Question(command.prompt);

    if (reply.status === 'fallback') {
      console.warn('[whatsapp-ai] Usando fallback da automacao de IA.', {
        remoteJid,
        messageId,
        reason: reply.reason,
        errorCode: reply.errorCode
      });
    } else {
      console.info('[whatsapp-ai] Resposta da IA gerada com sucesso.', {
        remoteJid,
        messageId
      });
    }

    await context.sendTextMessageToJid(remoteJid, reply.text);
  }

  private hasProcessedMessage(messageId: string): boolean {
    this.cleanupProcessedMessages();
    return this.processedMessageIds.has(messageId);
  }

  private markMessageAsProcessed(messageId: string): void {
    this.cleanupProcessedMessages();
    this.processedMessageIds.set(messageId, Date.now());
  }

  private cleanupProcessedMessages(): void {
    const cutoff = Date.now() - DEDUP_TTL_MS;

    for (const [messageId, processedAt] of this.processedMessageIds.entries()) {
      if (processedAt < cutoff) {
        this.processedMessageIds.delete(messageId);
      }
    }

    if (this.processedMessageIds.size <= DEDUP_MAX_ENTRIES) {
      return;
    }

    const overflow = this.processedMessageIds.size - DEDUP_MAX_ENTRIES;
    const keysToDelete = [...this.processedMessageIds.keys()].slice(0, overflow);

    for (const key of keysToDelete) {
      this.processedMessageIds.delete(key);
    }
  }
}

export const whatsappAiAutomationService = new WhatsappAiAutomationService();
