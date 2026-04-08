import { contactRepository } from './contactRepository.js';
import { messageLogRepository, type MessageSendMode } from './messageLogRepository.js';
import { whatsappSessionService } from './whatsappSessionService.js';

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

export type SendBatchMessageInput = {
  text: string;
  contactIds: number[];
  listIds: number[];
};

export type SendBatchMessageResult = {
  batchId: number;
  totalTargets: number;
  successCount: number;
  failedCount: number;
};

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

    const batch = messageLogRepository.createBatch(userId, input.text, recipients.length);
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        await whatsappSessionService.sendTextMessage(recipient.number, input.text);
        successCount += 1;

        messageLogRepository.create({
          userId,
          destinationNumber: recipient.number,
          content: input.text,
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
          content: input.text,
          sentAt: new Date().toISOString(),
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Falha ao enviar mensagem.',
          contactId: recipient.id,
          batchId: batch.id,
          sendMode: 'batch',
          listIds: recipient.listIds
        });
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
