import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken, type AuthTokenPayload } from '../utils/jwt.js';

export type AuthenticatedRequest = Request & {
  authUser?: AuthTokenPayload;
};

export function getAuthenticatedUserId(req: Request<any, any, any, any>): number {
  const userId = (req as AuthenticatedRequest).authUser?.userId;

  if (!Number.isInteger(userId) || userId! <= 0) {
    throw new Error('Authenticated user is missing from request context.');
  }

  return userId!;
}

export function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        message: 'Authorization bearer token is required.'
      }
    });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  const payload = verifyAuthToken(token);

  if (!payload) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired token.'
      }
    });
    return;
  }

  (req as AuthenticatedRequest).authUser = payload;
  next();
}
