import jwt, { type SignOptions } from 'jsonwebtoken';

const defaultJwtSecret = 'development-jwt-secret-change-me';
const jwtSecret = process.env.JWT_SECRET?.trim() || defaultJwtSecret;
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN?.trim() || '7d') as SignOptions['expiresIn'];

if (jwtSecret === defaultJwtSecret) {
  console.warn('[auth] JWT_SECRET not set. Using an insecure development fallback secret.');
}

export type AuthTokenPayload = {
  userId: number;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign({ email: payload.email }, jwtSecret, {
    subject: String(payload.userId),
    expiresIn: jwtExpiresIn
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === 'string') {
      return null;
    }

    const userId = Number.parseInt(decoded.sub ?? '', 10);
    const email = typeof decoded.email === 'string' ? decoded.email : '';

    if (!Number.isInteger(userId) || userId <= 0 || email.length === 0) {
      return null;
    }

    return {
      userId,
      email
    };
  } catch {
    return null;
  }
}
