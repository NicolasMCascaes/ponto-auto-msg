import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { userRepository } from '../services/userRepository.js';
import { type AuthenticatedRequest } from '../middlewares/authenticateRequest.js';

type AuthBody = {
  email?: unknown;
  password?: unknown;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseAuthInput(body: AuthBody): { email: string; password: string } | null {
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return null;
  }

  const email = normalizeEmail(body.email);
  const password = body.password.trim();

  if (!isValidEmail(email) || password.length < 8) {
    return null;
  }

  return { email, password };
}

export async function registerController(
  req: Request<unknown, unknown, AuthBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseAuthInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message: "Invalid payload. Send a valid 'email' and a 'password' with at least 8 characters."
        }
      });
      return;
    }

    if (userRepository.existsByEmail(input.email)) {
      res.status(409).json({
        error: {
          message: 'An account with this email already exists.'
        }
      });
      return;
    }

    const result = await authService.register(input.email, input.password);

    res.status(201).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request<unknown, unknown, AuthBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseAuthInput(req.body);

    if (!input) {
      res.status(400).json({
        error: {
          message: "Invalid payload. Send a valid 'email' and a 'password' with at least 8 characters."
        }
      });
      return;
    }

    const user = userRepository.findByEmail(input.email);

    if (!user) {
      res.status(401).json({
        error: {
          message: 'Invalid email or password.'
        }
      });
      return;
    }

    const result = await authService.login(user, input.password);

    if (!result) {
      res.status(401).json({
        error: {
          message: 'Invalid email or password.'
        }
      });
      return;
    }

    res.status(200).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export function getCurrentUserController(req: Request, res: Response): void {
  const authUser = (req as AuthenticatedRequest).authUser;

  if (!authUser) {
    res.status(401).json({
      error: {
        message: 'Authentication required.'
      }
    });
    return;
  }

  const user = authService.getUserFromTokenPayload(authUser);

  if (!user) {
    res.status(401).json({
      error: {
        message: 'Invalid token user.'
      }
    });
    return;
  }

  res.status(200).json({
    data: {
      user
    }
  });
}
