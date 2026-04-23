import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../middlewares/authenticateRequest.js';
import {
  messageSequenceRepository,
  type CreateMessageSequenceInput
} from '../services/messageSequenceRepository.js';
import { MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH } from '../utils/messageTemplates.js';

type MessageSequenceBody = {
  title?: unknown;
  cooldownMs?: unknown;
  steps?: unknown;
};

function parseMessageSequenceInput(body: MessageSequenceBody): CreateMessageSequenceInput | null {
  if (
    typeof body.title !== 'string' ||
    typeof body.cooldownMs !== 'number' ||
    !Number.isInteger(body.cooldownMs) ||
    body.cooldownMs < 0 ||
    !Array.isArray(body.steps)
  ) {
    return null;
  }

  const title = body.title.trim();

  if (title.length === 0 || body.steps.length === 0) {
    return null;
  }

  const steps = body.steps
    .map((step) => {
      if (!step || typeof step !== 'object' || typeof (step as { content?: unknown }).content !== 'string') {
        return null;
      }

      const content = (step as { content: string }).content.trim();

      if (content.length === 0 || content.length > MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH) {
        return null;
      }

      return { content };
    })
    .filter((step): step is { content: string } => step !== null);

  if (steps.length !== body.steps.length) {
    return null;
  }

  return {
    title,
    cooldownMs: body.cooldownMs,
    steps
  };
}

export function listMessageSequencesController(req: Request, res: Response): void {
  const userId = getAuthenticatedUserId(req);

  res.status(200).json({
    data: messageSequenceRepository.list(userId)
  });
}

export function createMessageSequenceController(
  req: Request<unknown, unknown, MessageSequenceBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = parseMessageSequenceInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message:
            "Payload invalido. Informe 'title', 'cooldownMs' e 'steps' corretamente."
        }
      });
      return;
    }

    res.status(201).json({
      data: messageSequenceRepository.create(userId, input)
    });
  } catch (error) {
    next(error);
  }
}

export function updateMessageSequenceController(
  req: Request<{ id: string }, unknown, MessageSequenceBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const userId = getAuthenticatedUserId(req);
    const id = Number.parseInt(req.params.id, 10);
    const input = parseMessageSequenceInput(req.body);

    if (!Number.isInteger(id) || id <= 0 || !input) {
      res.status(400).json({
        error: {
          message: 'Sequencia de mensagens invalida.'
        }
      });
      return;
    }

    const sequence = messageSequenceRepository.update(userId, id, input);

    if (!sequence) {
      res.status(404).json({
        error: {
          message: 'Sequencia de mensagens nao encontrada.'
        }
      });
      return;
    }

    res.status(200).json({
      data: sequence
    });
  } catch (error) {
    next(error);
  }
}

export function deleteMessageSequenceController(
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
          message: 'Sequencia de mensagens invalida.'
        }
      });
      return;
    }

    if (!messageSequenceRepository.delete(userId, id)) {
      res.status(404).json({
        error: {
          message: 'Sequencia de mensagens nao encontrada.'
        }
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
