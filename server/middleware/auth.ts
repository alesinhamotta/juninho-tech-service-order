// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO - Proteção de rotas com JWT
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { verificarToken, JWTPayload } from '../utils/auth';

export interface AuthRequest extends Request {
  usuario?: JWTPayload;
}

/**
 * Middleware que verifica o token JWT nas requisições protegidas.
 * O token deve ser enviado no header Authorization: Bearer <token>
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verificarToken(token);
    req.usuario = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
