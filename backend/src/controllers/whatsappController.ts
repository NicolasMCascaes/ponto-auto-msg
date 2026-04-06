import type { NextFunction, Request, Response } from 'express';
import { whatsappSessionService } from '../services/whatsappSessionService.js';
import { messageLogRepository } from '../services/messageLogRepository.js';

type SendMessageBody = {
  number?: unknown;
  text?: unknown;
};

export async function startWhatsappConnectionController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await whatsappSessionService.startConnection();
    res.status(202).json({ message: 'Inicialização da conexão solicitada.', status });
  } catch (error) {
    next(error);
  }
}

export function getWhatsappStatusController(_req: Request, res: Response): void {
  const status = whatsappSessionService.getStatus();
  res.status(200).json(status);
}

export function getRecentMessagesController(req: Request, res: Response): void {
  const queryLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(queryLimit) ? Math.min(Math.max(queryLimit, 1), 50) : 10;
  const data = messageLogRepository.listRecent(limit);

  res.status(200).json({
    data
  });
}

export async function sendWhatsappMessageController(
  req: Request<unknown, unknown, SendMessageBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number, text } = req.body;

    if (typeof number !== 'string' || typeof text !== 'string') {
      res.status(400).json({
        error: {
          message: "Payload inválido. Campos obrigatórios: 'number' e 'text' (string)."
        }
      });
      return;
    }

    const sanitizedNumber = number.replace(/\D/g, '');
    const trimmedText = text.trim();

    if (sanitizedNumber.length < 10 || sanitizedNumber.length > 15 || trimmedText.length === 0) {
      res.status(400).json({
        error: {
          message:
            "Payload inválido. 'number' deve conter entre 10 e 15 dígitos e 'text' não pode ser vazio."
        }
      });
      return;
    }

    try {
      const result = await whatsappSessionService.sendTextMessage(sanitizedNumber, trimmedText);
      const logId = messageLogRepository.create({
        destinationNumber: sanitizedNumber,
        content: trimmedText,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });

      res.status(200).json({
        message: 'Mensagem enviada com sucesso.',
        data: {
          ...result,
          logId
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha ao enviar mensagem.';
      const logId = messageLogRepository.create({
        destinationNumber: sanitizedNumber,
        content: trimmedText,
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage
      });

      if (errorMessage.includes('não está conectada')) {
        res.status(409).json({
          error: {
            message: errorMessage,
            logId
          }
        });
        return;
      }

      next(error);
    }
  } catch (error) {
    next(error);
  }
}
