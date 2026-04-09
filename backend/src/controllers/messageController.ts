import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../middlewares/authenticateRequest.js';
import { messageLogRepository, type MessageLogStatus } from '../services/messageLogRepository.js';
import { messageService } from '../services/messageService.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';

type SendMessageBody = {
  number?: unknown;
  contactId?: unknown;
  text?: unknown;
};

type SendBatchBody = {
  mode?: unknown;
  contactIds?: unknown;
  listIds?: unknown;
  text?: unknown;
};

type MessageQuery = {
  limit?: unknown;
  status?: unknown;
  contactId?: unknown;
  listId?: unknown;
  search?: unknown;
};

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function getRecentMessagesController(
  req: Request<unknown, unknown, unknown, MessageQuery>,
  res: Response
): void {
  const userId = getAuthenticatedUserId(req);

  res.status(200).json({
    data: messageLogRepository.listRecent(userId, parseLimit(req.query.limit, 10))
  });
}

export function getMessagesController(
  req: Request<unknown, unknown, unknown, MessageQuery>,
  res: Response
): void {
  const userId = getAuthenticatedUserId(req);
  const parsedContactId =
    typeof req.query.contactId === 'string' ? Number.parseInt(req.query.contactId, 10) : undefined;
  const parsedListId =
    typeof req.query.listId === 'string' ? Number.parseInt(req.query.listId, 10) : undefined;
  const contactId =
    typeof parsedContactId === 'number' && parsedContactId > 0 ? parsedContactId : undefined;
  const listId =
    typeof parsedListId === 'number' && parsedListId > 0 ? parsedListId : undefined;
  const status =
    req.query.status === 'sent' || req.query.status === 'failed'
      ? (req.query.status as MessageLogStatus)
      : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  res.status(200).json({
    data: messageLogRepository.list(userId, {
      limit: parseLimit(req.query.limit, 50),
      status,
      contactId,
      listId,
      search: search && search.length > 0 ? search : undefined
    })
  });
}

export async function sendWhatsappMessageController(
  req: Request<unknown, unknown, SendMessageBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { number, contactId, text } = req.body;

    if (typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: {
          message: "Payload invalido. Informe 'text' corretamente."
        }
      });
      return;
    }

    const hasNumber = typeof number === 'string';
    const hasContactId = typeof contactId === 'number';

    if (hasNumber === hasContactId) {
      res.status(400).json({
        error: {
          message: "Informe exatamente um destino: 'number' ou 'contactId'."
        }
      });
      return;
    }

    if (hasNumber) {
      const normalized = normalizePhoneNumber(number);

      if (!isValidPhoneNumber(normalized)) {
        res.status(400).json({
          error: {
            message: "Payload invalido. 'number' deve conter entre 10 e 15 digitos."
          }
        });
        return;
      }

      const result = await messageService.sendSingle(userId, {
        number: normalized,
        text: text.trim()
      });

      res.status(200).json({
        message: 'Mensagem enviada com sucesso.',
        data: result
      });
      return;
    }

    if (typeof contactId !== 'number' || !Number.isInteger(contactId) || contactId <= 0) {
      res.status(400).json({
        error: {
          message: "Payload invalido. 'contactId' deve ser um inteiro positivo."
        }
      });
      return;
    }

    const parsedContactId = contactId;
    const result = await messageService.sendSingle(userId, {
      contactId: parsedContactId,
      text: text.trim()
    });

    res.status(200).json({
      message: 'Mensagem enviada com sucesso.',
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('nao esta conectada')) {
        res.status(409).json({
          error: {
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Contato nao encontrado')) {
        res.status(404).json({
          error: {
            message: error.message
          }
        });
        return;
      }
    }

    next(error);
  }
}

export async function sendBatchMessagesController(
  req: Request<unknown, unknown, SendBatchBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { mode, contactIds, listIds, text } = req.body;

    if (!Array.isArray(contactIds) || !Array.isArray(listIds)) {
      res.status(400).json({
        error: {
          message: "Payload invalido. Informe 'contactIds' e 'listIds' como arrays."
        }
      });
      return;
    }

    const parsedContactIds = [
      ...new Set(
        contactIds
          .map((item) => (typeof item === 'number' ? item : Number.NaN))
          .filter((item) => Number.isInteger(item) && item > 0)
      )
    ];
    const parsedListIds = [
      ...new Set(
        listIds
          .map((item) => (typeof item === 'number' ? item : Number.NaN))
          .filter((item) => Number.isInteger(item) && item > 0)
      )
    ];

    if (parsedContactIds.length !== contactIds.length || parsedListIds.length !== listIds.length) {
      res.status(400).json({
        error: {
          message: 'Payload invalido. Todos os IDs devem ser inteiros positivos.'
        }
      });
      return;
    }

    if (parsedContactIds.length === 0 && parsedListIds.length === 0) {
      res.status(400).json({
        error: {
          message: 'Selecione ao menos um contato ou uma lista para o envio em lote.'
        }
      });
      return;
    }

    const parsedMode =
      mode === undefined || mode === null || mode === 'manual'
        ? 'manual'
        : mode === 'group-random'
          ? 'group-random'
          : null;

    if (!parsedMode) {
      res.status(400).json({
        error: {
          message: "Payload invalido. Informe 'mode' corretamente."
        }
      });
      return;
    }

    if (parsedMode === 'manual') {
      if (typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({
          error: {
            message: "Payload invalido. Informe 'text' corretamente."
          }
        });
        return;
      }
      const result = await messageService.sendBatch(userId, {
        mode: 'manual',
        text: text.trim(),
        contactIds: parsedContactIds,
        listIds: parsedListIds
      });

      res.status(200).json({
        message: 'Envio em lote concluido.',
        data: result
      });
      return;
    }

    const result = await messageService.sendBatch(userId, {
      mode: 'group-random',
      contactIds: parsedContactIds,
      listIds: parsedListIds
    });

    res.status(200).json({
      message: 'Envio em lote concluido.',
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('nao esta conectada')) {
        res.status(409).json({
          error: {
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('Nenhum contato ativo')) {
        res.status(400).json({
          error: {
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('mensagens cadastradas')) {
        res.status(400).json({
          error: {
            message: error.message
          }
        });
        return;
      }
    }

    next(error);
  }
}
