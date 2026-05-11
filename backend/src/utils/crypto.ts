import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Chiffre une valeur JSON en AES-256-CBC avant stockage en BDD
export function encrypt(data: object): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(config.encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  // Format stocké : iv:données — les deux en hex pour rester lisibles en BDD
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// Déchiffre et reparse la valeur JSON stockée en BDD
export function decrypt<T = Record<string, unknown>>(stored: string): T {
  const [ivHex, encryptedHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(config.encryptionKey), iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString()) as T;
}

// Génère un token aléatoire sécurisé pour les URLs webhook
export function generateWebhookToken(): string {
  return randomBytes(32).toString('hex');
}
