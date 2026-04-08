import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAuthToken, type AuthTokenPayload } from '../utils/jwt.js';
import {
  userRepository,
  type PublicUserRecord,
  type UserRecord
} from './userRepository.js';

export type AuthResult = {
  token: string;
  user: PublicUserRecord;
};

class AuthService {
  async register(email: string, password: string): Promise<AuthResult> {
    const passwordHash = await hashPassword(password);
    const user = userRepository.create({ email, passwordHash });

    return {
      token: signAuthToken({
        userId: user.id,
        email: user.email
      }),
      user
    };
  }

  async login(user: UserRecord, password: string): Promise<AuthResult | null> {
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return null;
    }

    const publicUser = userRepository.findById(user.id);

    if (!publicUser) {
      return null;
    }

    return {
      token: signAuthToken({
        userId: publicUser.id,
        email: publicUser.email
      }),
      user: publicUser
    };
  }

  getUserFromTokenPayload(payload: AuthTokenPayload): PublicUserRecord | null {
    const user = userRepository.findById(payload.userId);

    if (!user || user.email !== payload.email) {
      return null;
    }

    return user;
  }
}

export const authService = new AuthService();
