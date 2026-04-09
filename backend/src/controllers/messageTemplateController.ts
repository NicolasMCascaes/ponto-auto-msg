import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../middlewares/authenticateRequest.js';
import {
  messageTemplateRepository,
  type CreateMessageTemplateInput
} from '../services/messageTemplateRepository.js';
import {
  isMessageTemplateGroup,
  MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH
} from '../utils/messageTemplates.js';

type MessageTemplateBody = {
  group?: unknown;
  title?: unknown;
  content?: unknown;
};

function parseMessageTemplateInput(body: MessageTemplateBody): CreateMessageTemplateInput | null {
  if (
    !isMessageTemplateGroup(body.group) ||
    typeof body.title !== 'string' ||
    typeof body.content !== 'string'
  ) {
    return null;
  }

  const title = body.title.trim();
  const content = body.content.trim();

  if (
    title.length === 0 ||
    content.length === 0 ||
    content.length > MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH
  ) {
    return null;
  }

  return {
    group: body.group,
    title,
    content
  };
}

export function listMessageTemplatesController(req: Request, res: Response): void {
  const userId = getAuthenticatedUserId(req);

  res.status(200).json({
    data: messageTemplateRepository.list(userId)
  });
}

export function createMessageTemplateController(
  req: Request<unknown, unknown, MessageTemplateBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = parseMessageTemplateInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message:
            "Payload invalido. Informe 'group', 'title' e 'content' corretamente."
        }
      });
      return;
    }

    res.status(201).json({
      data: messageTemplateRepository.create(userId, input)
    });
  } catch (error) {
    next(error);
  }
}

export function updateMessageTemplateController(
  req: Request<{ id: string }, unknown, MessageTemplateBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = getAuthenticatedUserId(req);
    const id = Number.parseInt(req.params.id, 10);
    const input = parseMessageTemplateInput(req.body);

    if (!Number.isInteger(id) || id <= 0 || !input) {
      res.status(400).json({
        error: {
          message: 'Modelo de mensagem invalido.'
        }
      });
      return;
    }

    const template = messageTemplateRepository.update(userId, id, input);

    if (!template) {
      res.status(404).json({
        error: {
          message: 'Modelo de mensagem nao encontrado.'
        }
      });
      return;
    }

    res.status(200).json({
      data: template
    });
  } catch (error) {
    next(error);
  }
}

export function deleteMessageTemplateController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = getAuthenticatedUserId(req);
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        error: {
          message: 'Modelo de mensagem invalido.'
        }
      });
      return;
    }

    if (!messageTemplateRepository.delete(userId, id)) {
      res.status(404).json({
        error: {
          message: 'Modelo de mensagem nao encontrado.'
        }
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
