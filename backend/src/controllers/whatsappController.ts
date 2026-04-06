import type { Request, Response, NextFunction } from 'express';
import { whatsappSessionService } from '../services/whatsappSessionService.js';

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
