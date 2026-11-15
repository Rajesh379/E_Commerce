import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type UserRole = 'customer' | 'worker' | 'admin';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthPayload;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

function getJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'MY_JWT_SECRET') {
    return process.env.JWT_SECRET;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

export const JWT_SECRET = getJwtSecret();
export const COOKIE_NAME = 'eworkers_token';

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  req.auth = decoded;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Access denied for your account role' });
      return;
    }
    next();
  };
}
