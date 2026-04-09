import { contactRepository } from './contactRepository.js';
import { messageLogRepository, type MessageSendMode } from './messageLogRepository.js';
import { messageTemplateRepository } from './messageTemplateRepository.js';
import { whatsappSessionService } from './whatsappSessionService.js';
import {
  getMessageTemplateGroupLabel,
  renderMessageTemplateContent,
  type MessageTemplateGroup
} from '../utils/messageTemplates.js';

export type SendSingleMessageInput =
  | {
      text: string;
      number: string;
      contactId?: never;
    }
  | {
      text: string;
      number?: never;
      contactId: number;
    };

export type SendSingleMessageResult = {
  jid: string;
  messageId: string;
  destinationNumber: string;
  contactId?: number;
};

export type SendBatchMessageInput =
  | {
      mode: 'manual';
      text: string;
      contactIds: number[];
      listIds: number[];
    }
  | {
      mode: 'group-random';
      contactIds: number[];
      listIds: number[];
    };

export type SendBatchMessageResult = {
  batchId: number;
  totalTargets: number;
  successCount: number;
  failedCount: number;
};

const DEFAULT_BATCH_DELAY_MIN_MS = 4_000;
const DEFAULT_BATCH_DELAY_MAX_MS = 7_000;

function parsePositiveDelay(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function getBatchDelayRange(): { minMs: number; maxMs: number } {
  const minMs = parsePositiveDelay(process.env.BATCH_SEND_DELAY_MIN_MS, DEFAULT_BATCH_DELAY_MIN_MS);
  const maxMs = parsePositiveDelay(process.env.BATCH_SEND_DELAY_MAX_MS, DEFAULT_BATCH_DELAY_MAX_MS);

  return {
    minMs: Math.min(minMs, maxMs),
    maxMs: Math.max(minMs, maxMs)
  };
}

function getRandomBatchDelayMs(): number {
  const { minMs, maxMs } = getBatchDelayRange();

  if (minMs === maxMs) {
    return minMs;
  }

  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class MessageService {
  async sendSingle(
    userId: number,
    input: SendSingleMessageInput
  ): Promise<SendSingleMessageResult> {
    const isContactSend = typeof input.contactId === 'number';
    const recipient = isContactSend
      ? contactRepository.getRecipientById(userId, input.contactId)
      : null;

    if (isContactSend && !recipient) {
      throw new Error('Contato nao encontrado ou esta inativo.');
    }

    const destinationNumber = isContactSend ? recipient!.number : input.number;
    const contactId = isContactSend ? recipient!.id : undefined;
    const sendMode: MessageSendMode = isContactSend ? 'contact' : 'manual';

    try {
      const result = await whatsappSessionService.sendTextMessage(destinationNumber, input.text);

      messageLogRepository.create({
        userId,
        destinationNumber,
        content: input.text,
        sentAt: new Date().toISOString(),
        status: 'sent',
        contactId,
        sendMode
      });

      return {
        ...result,
        destinationNumber,
        contactId
      };
    } catch (error) {
      messageLogRepository.create({
        userId,
        destinationNumber,
        content: input.text,
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Falha ao enviar mensagem.',
        contactId,
        sendMode
      });

      throw error;
    }
  }

  async sendBatch(userId: number, input: SendBatchMessageInput): Promise<SendBatchMessageResult> {
    if (!whatsappSessionService.getStatus().isConnected) {
      throw new Error('Sessao WhatsApp nao esta conectada. Conecte antes de enviar mensagens.');
    }

    const recipients = contactRepository.getBatchRecipients(userId, input.contactIds, input.listIds);

    if (recipients.length === 0) {
      throw new Error('Nenhum contato ativo foi encontrado para o envio em lote.');
    }

    if (input.mode === 'manual') {
      return this.dispatchBatchMessages(userId, recipients, input.text, () => input.text);
    }

    const groupsInBatch = [...new Set(recipients.map((recipient) => recipient.group))];
    const templates = messageTemplateRepository.listByGroups(userId, groupsInBatch);
    const templatesByGroup = new Map<MessageTemplateGroup, typeof templates>();

    for (const template of templates) {
      const groupTemplates = templatesByGroup.get(template.group) ?? [];
      groupTemplates.push(template);
      templatesByGroup.set(template.group, groupTemplates);
    }

    const missingGroups = groupsInBatch.filter((group) => {
      return (templatesByGroup.get(group)?.length ?? 0) === 0;
    });

    if (missingGroups.length > 0) {
      const missingLabels = missingGroups.map((group) => getMessageTemplateGroupLabel(group));
      throw new Error(`Faltam mensagens cadastradas para ${missingLabels.join(' e ')}.`);
    }

    return this.dispatchBatchMessages(
      userId,
      recipients,
      'Envio aleatorio por grupo',
      (recipient) => {
        const groupTemplates = templatesByGroup.get(recipient.group) ?? [];
        const selectedTemplate =
          groupTemplates[Math.floor(Math.random() * groupTemplates.length)];

        return renderMessageTemplateContent(selectedTemplate.content, recipient.name);
      }
    );
  }

  private async dispatchBatchMessages(
    userId: number,
    recipients: ReturnType<typeof contactRepository.getBatchRecipients>,
    batchContent: string,
    resolveContent: (recipient: ReturnType<typeof contactRepository.getBatchRecipients>[number]) => string
  ): Promise<SendBatchMessageResult> {
    const batch = messageLogRepository.createBatch(userId, batchContent, recipients.length);
    let successCount = 0;
    let failedCount = 0;

    for (const [index, recipient] of recipients.entries()) {
      const content = resolveContent(recipient);

      try {
        await whatsappSessionService.sendTextMessage(recipient.number, content);
        successCount += 1;

        messageLogRepository.create({
          userId,
          destinationNumber: recipient.number,
          content,
          sentAt: new Date().toISOString(),
          status: 'sent',
          contactId: recipient.id,
          batchId: batch.id,
          sendMode: 'batch',
          listIds: recipient.listIds
        });
      } catch (error) {
        failedCount += 1;

        messageLogRepository.create({
          userId,
          destinationNumber: recipient.number,
          content,
          sentAt: new Date().toISOString(),
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Falha ao enviar mensagem.',
          contactId: recipient.id,
          batchId: batch.id,
          sendMode: 'batch',
          listIds: recipient.listIds
        });
      }

      if (index < recipients.length - 1) {
        await wait(getRandomBatchDelayMs());
      }
    }

    messageLogRepository.updateBatchCounts(userId, batch.id, successCount, failedCount);

    return {
      batchId: batch.id,
      totalTargets: recipients.length,
      successCount,
      failedCount
    };
  }
}

export const messageService = new MessageService();
