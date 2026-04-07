import type { NextFunction, Request, Response } from 'express';
import { contactListRepository } from '../services/contactListRepository.js';

type ContactListBody = {
  name?: unknown;
  description?: unknown;
};

function parseContactListInput(body: ContactListBody): { name: string; description?: string } | null {
  if (typeof body.name !== 'string') {
    return null;
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== 'string'
  ) {
    return null;
  }

  const name = body.name.trim();
  const description = typeof body.description === 'string' ? body.description.trim() : undefined;

  if (name.length === 0) {
    return null;
  }

  return {
    name,
    description: description && description.length > 0 ? description : undefined
  };
}

export function listContactListsController(_req: Request, res: Response): void {
  res.status(200).json({
    data: contactListRepository.list()
  });
}

export function createContactListController(
  req: Request<unknown, unknown, ContactListBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const input = parseContactListInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message: "Payload invalido. Informe 'name' e 'description' corretamente."
        }
      });
      return;
    }

    if (contactListRepository.existsByName(input.name)) {
      res.status(409).json({
        error: {
          message: 'Ja existe uma lista com esse nome.'
        }
      });
      return;
    }

    res.status(201).json({
      data: contactListRepository.create(input)
    });
  } catch (error) {
    next(error);
  }
}

export function updateContactListController(
  req: Request<{ id: string }, unknown, ContactListBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const input = parseContactListInput(req.body);

    if (!Number.isInteger(id) || id <= 0 || !input) {
      res.status(400).json({
        error: {
          message: 'Lista invalida.'
        }
      });
      return;
    }

    if (contactListRepository.existsByName(input.name, id)) {
      res.status(409).json({
        error: {
          message: 'Ja existe uma lista com esse nome.'
        }
      });
      return;
    }

    const list = contactListRepository.update(id, input);

    if (!list) {
      res.status(404).json({
        error: {
          message: 'Lista nao encontrada.'
        }
      });
      return;
    }

    res.status(200).json({
      data: list
    });
  } catch (error) {
    next(error);
  }
}

export function deleteContactListController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): void {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        error: {
          message: 'Lista invalida.'
        }
      });
      return;
    }

    if (!contactListRepository.delete(id)) {
      res.status(404).json({
        error: {
          message: 'Lista nao encontrada.'
        }
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
