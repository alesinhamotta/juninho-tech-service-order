// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: {
    userId: string;
    email: string;
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env['JWT_SECRET'] || 'juninho-tech-secret-2024';
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    authReq.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
}
