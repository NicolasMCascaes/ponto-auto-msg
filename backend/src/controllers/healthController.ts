import type { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/healthService.js';

export function getHealthController(_req: Request, res: Response, next: NextFunction): void {
  try {
    const health = getHealthStatus();
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
}
