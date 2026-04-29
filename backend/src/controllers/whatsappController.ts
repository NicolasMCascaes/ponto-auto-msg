import type { NextFunction, Request, Response } from 'express';
import { whatsappSessionService } from '../services/whatsappSessionService.js';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone.js';

type PairingCodeBody = {
  phoneNumber?: unknown;
};

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

export async function requestWhatsappPairingCodeController(
  req: Request<unknown, unknown, PairingCodeBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const phoneNumber =
      typeof req.body.phoneNumber === 'string' ? normalizePhoneNumber(req.body.phoneNumber) : '';

    if (!isValidPhoneNumber(phoneNumber)) {
      res.status(400).json({
        error: {
          message: "Payload invalido. 'phoneNumber' deve conter entre 10 e 15 digitos."
        }
      });
      return;
    }

    const result = await whatsappSessionService.requestPairingCode(phoneNumber);

    res.status(result.pairingCode ? 202 : 200).json({
      message: result.pairingCode
        ? 'Codigo de pareamento gerado.'
        : 'Sessao WhatsApp ja possui credenciais salvas. Tentando reconectar sem novo codigo.',
      pairingCode: result.pairingCode,
      status: result.status
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Sessao WhatsApp ja esta conectada.') {
      res.status(409).json({
        error: {
          message: error.message
        }
      });
      return;
    }

    next(error);
  }
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
