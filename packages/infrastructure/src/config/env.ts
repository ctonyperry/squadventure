import { config } from 'dotenv';
import * as path from 'node:path';

/**
 * Load environment variables from .env file
 * Searches up the directory tree for .env
 */
export function loadEnv(startDir?: string): void {
  const searchPaths = [
    startDir ?? process.cwd(),
    path.join(startDir ?? process.cwd(), '..'),
    path.join(startDir ?? process.cwd(), '..', '..'),
  ];

  for (const searchPath of searchPaths) {
    const result = config({ path: path.join(searchPath, '.env') });
    if (!result.error) {
      return;
    }
  }
}

/**
 * Get required environment variable or throw
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get optional environment variable as number
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get optional environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}
