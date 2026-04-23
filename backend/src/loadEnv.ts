import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const sourceFile = fileURLToPath(import.meta.url);
const sourceDir = dirname(sourceFile);
const backendRootDir = resolve(sourceDir, '..');
const envFilePaths = [resolve(backendRootDir, '.env'), resolve(backendRootDir, '.env.local')];
const originalEnvKeys = new Set(Object.keys(process.env));

for (const envFilePath of envFilePaths) {
  if (!existsSync(envFilePath)) {
    continue;
  }

  const parsed = parse(readFileSync(envFilePath));
  const isLocalOverride = envFilePath.endsWith('.env.local');

  for (const [key, value] of Object.entries(parsed)) {
    if (!isLocalOverride) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }

      continue;
    }

    if (!originalEnvKeys.has(key)) {
      process.env[key] = value;
    }
  }
}
