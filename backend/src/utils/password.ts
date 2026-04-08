import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_HASH_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await deriveKey(password, salt);

  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const [salt, expectedHash] = passwordHash.split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = await deriveKey(password, salt);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (derivedKey.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedBuffer);
}
