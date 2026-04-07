import type { NextFunction, Request, Response } from 'express';
import { whatsappSessionService } from '../services/whatsappSessionService.js';

export async function startWhatsappConnectionController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await whatsappSessionService.startConnection();

    res.status(202).json({
      message: 'Inicializacao da conexao solicitada.',
      status
    });
  } catch (error) {
    next(error);
  }
}

export function getWhatsappStatusController(_req: Request, res: Response): void {
  res.status(200).json(whatsappSessionService.getStatus());
}

export async function resetWhatsappConnectionController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await whatsappSessionService.resetConnection();

    res.status(200).json({
      message: 'Sessao WhatsApp reiniciada.',
      status
    });
  } catch (error) {
    next(error);
  }
}
