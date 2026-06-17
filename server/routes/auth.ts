// ============================================================================
// ROTAS DE AUTENTICACAO - /api/auth
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { query, queryOne } from '../config/database.js';
import { hashSenha, compararSenha, gerarToken } from '../utils/auth.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register - Criar novo usuario (tecnico)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, nome, senha } = req.body as Record<string, string>;

    if (!email || !nome || !senha) {
      res.status(400).json({ error: 'Email, nome e senha sao obrigatorios' });
      return;
    }
    if (senha.length < 6) {
      res.status(400).json({ error: 'A senha deve ter no minimo 6 caracteres' });
      return;
    }

    const usuarioExistente = await queryOne('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (usuarioExistente) {
      res.status(400).json({ error: 'Este email ja esta cadastrado' });
      return;
    }

    const senhaHash = await hashSenha(senha);

    const novoUsuario = await queryOne<{ id: string; email: string; nome: string; ativo: boolean; data_criacao: string }>(
      `INSERT INTO usuarios (email, nome, senha_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, nome, ativo, data_criacao`,
      [email, nome, senhaHash]
    );

    if (!novoUsuario) throw new Error('Erro ao criar usuario');

    const token = gerarToken(novoUsuario.id, novoUsuario.email);

    res.status(201).json({
      message: 'Usuario criado com sucesso',
      usuario: novoUsuario,
      token,
    });
  } catch (error) {
    console.error('Erro ao registrar usuario:', error);
    res.status(500).json({ error: 'Erro interno ao criar usuario' });
  }
});

// POST /api/auth/login - Fazer login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body as Record<string, string>;

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha sao obrigatorios' });
      return;
    }

    const usuario = await queryOne<{ id: string; email: string; nome: string; senha_hash: string; ativo: boolean }>(
      'SELECT id, email, nome, senha_hash, ativo FROM usuarios WHERE email = $1',
      [email]
    );

    if (!usuario) {
      res.status(401).json({ error: 'Email ou senha incorretos' });
      return;
    }
    if (!usuario.ativo) {
      res.status(401).json({ error: 'Usuario inativo. Entre em contato com o administrador.' });
      return;
    }

    const senhaCorreta = await compararSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      res.status(401).json({ error: 'Email ou senha incorretos' });
      return;
    }

    await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);

    const token = gerarToken(usuario.id, usuario.email);

    res.json({
      message: 'Login realizado com sucesso',
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome, ativo: usuario.ativo },
      token,
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// GET /api/auth/me - Obter dados do usuario autenticado
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const usuario = await queryOne(
      'SELECT id, email, nome, ativo, data_criacao, ultimo_login FROM usuarios WHERE id = $1',
      [authReq.usuario?.userId]
    );

    if (!usuario) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuario:', error);
    res.status(500).json({ error: 'Erro interno ao buscar usuario' });
  }
});

export default router;
