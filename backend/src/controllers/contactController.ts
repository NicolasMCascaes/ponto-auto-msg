import type { NextFunction, Request, Response } from 'express';
import { contactListRepository } from '../services/contactListRepository.js';
import {
  contactRepository,
  type ContactFilters
} from '../services/contactRepository.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';

type ContactBody = {
  name?: unknown;
  number?: unknown;
  notes?: unknown;
  isActive?: unknown;
  listIds?: unknown;
};

type ContactQuery = {
  search?: unknown;
  status?: unknown;
  listId?: unknown;
};

function parseContactInput(body: ContactBody): {
  name: string;
  number: string;
  notes?: string;
  isActive: boolean;
  listIds: number[];
} | null {
  if (typeof body.name !== 'string' || typeof body.number !== 'string') {
    return null;
  }

  if (typeof body.isActive !== 'boolean' || !Array.isArray(body.listIds)) {
    return null;
  }

  if (
    body.notes !== undefined &&
    body.notes !== null &&
    typeof body.notes !== 'string'
  ) {
    return null;
  }

  const listIds = body.listIds
    .map((item) => (typeof item === 'number' ? item : Number.NaN))
    .filter((item) => Number.isInteger(item) && item > 0);

  if (listIds.length !== body.listIds.length) {
    return null;
  }

  const name = body.name.trim();
  const number = normalizePhoneNumber(body.number);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

  if (name.length === 0 || !isValidPhoneNumber(number)) {
    return null;
  }

  return {
    name,
    number,
    notes: notes && notes.length > 0 ? notes : undefined,
    isActive: body.isActive,
    listIds: [...new Set(listIds)]
  };
}

function parseFilters(query: ContactQuery): ContactFilters {
  const filters: ContactFilters = {};

  if (typeof query.search === 'string' && query.search.trim().length > 0) {
    filters.search = query.search.trim();
  }

  if (query.status === 'active' || query.status === 'inactive') {
    filters.status = query.status;
  }

  if (typeof query.listId === 'string') {
    const listId = Number.parseInt(query.listId, 10);
    if (Number.isInteger(listId) && listId > 0) {
      filters.listId = listId;
    }
  }

  return filters;
}

export function listContactsController(
  req: Request<unknown, unknown, unknown, ContactQuery>,
  res: Response
): void {
  res.status(200).json({
    data: contactRepository.list(parseFilters(req.query))
  });
}

export function createContactController(
  req: Request<unknown, unknown, ContactBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const input = parseContactInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message:
            "Payload invalido. Informe 'name', 'number', 'isActive' e 'listIds' corretamente."
        }
      });
      return;
    }

    if (contactRepository.existsByNumber(input.number)) {
      res.status(409).json({
        error: {
          message: 'Ja existe um contato com esse numero.'
        }
      });
      return;
    }

    if (!contactListRepository.allExist(input.listIds)) {
      res.status(400).json({
        error: {
          message: 'Uma ou mais listas informadas nao existem.'
        }
      });
      return;
    }

    res.status(201).json({
      data: contactRepository.create(input)
    });
  } catch (error) {
    next(error);
  }
}

export function updateContactController(
  req: Request<{ id: string }, unknown, ContactBody>,
  res: Response,
  next: NextFunction
): void {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const input = parseContactInput(req.body);

    if (!Number.isInteger(id) || id <= 0 || !input) {
      res.status(400).json({
        error: {
          message: 'Contato invalido.'
        }
      });
      return;
    }

    if (contactRepository.existsByNumber(input.number, id)) {
      res.status(409).json({
        error: {
          message: 'Ja existe um contato com esse numero.'
        }
      });
      return;
    }

    if (!contactListRepository.allExist(input.listIds)) {
      res.status(400).json({
        error: {
          message: 'Uma ou mais listas informadas nao existem.'
        }
      });
      return;
    }

    const contact = contactRepository.update(id, input);

    if (!contact) {
      res.status(404).json({
        error: {
          message: 'Contato nao encontrado.'
        }
      });
      return;
    }

    res.status(200).json({
      data: contact
    });
  } catch (error) {
    next(error);
  }
}

export function deleteContactController(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): void {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        error: {
          message: 'Contato invalido.'
        }
      });
      return;
    }

    if (!contactRepository.delete(id)) {
      res.status(404).json({
        error: {
          message: 'Contato nao encontrado.'
        }
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
