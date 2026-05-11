import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const SALT_ROUNDS = 12;

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_TAKEN');

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, password: hashed },
    select: { id: true, email: true, createdAt: true },
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  };
}

export function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
    return signAccessToken(payload.userId);
  } catch {
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}
