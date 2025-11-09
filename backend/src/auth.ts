import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface JwtPayloadCustom {
  userId: string;
  iat?: number;
  exp?: number;
}

export function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId } as JwtPayloadCustom, secret, { expiresIn: '1d' });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication failed' });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, secret) as JwtPayloadCustom;
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

