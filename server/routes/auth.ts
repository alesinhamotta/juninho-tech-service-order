// ============================================================================
// ROTAS DE AUTENTICAÇÃO - /api/auth
// ============================================================================

import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { hashSenha, compararSenha, gerarToken } from '../utils/auth';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ============================================================================
// POST /api/auth/register - Criar novo usuário (técnico)
// ============================================================================
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, nome, senha } = req.body;

    if (!email || !nome || !senha) {
      return res.status(400).json({ error: 'Email, nome e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Verificar se o email já está cadastrado
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    const senhaHash = await hashSenha(senha);

    const { data: novoUsuario, error } = await supabase
      .from('usuarios')
      .insert([{ email, nome, senha_hash: senhaHash }])
      .select('id, email, nome, ativo, data_criacao')
      .single();

    if (error) throw error;

    const token = gerarToken(novoUsuario.id, novoUsuario.email);

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario: novoUsuario,
      token,
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao criar usuário' });
  }
});

// ============================================================================
// POST /api/auth/login - Fazer login
// ============================================================================
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, senha_hash, ativo')
      .eq('email', email)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (!usuario.ativo) {
      return res.status(401).json({ error: 'Usuário inativo. Entre em contato com o administrador.' });
    }

    const senhaCorreta = await compararSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Atualizar último login
    await supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuario.id);

    const token = gerarToken(usuario.id, usuario.email);

    return res.json({
      message: 'Login realizado com sucesso',
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome, ativo: usuario.ativo },
      token,
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// ============================================================================
// GET /api/auth/me - Obter dados do usuário autenticado
// ============================================================================
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, ativo, data_criacao, ultimo_login')
      .eq('id', req.usuario?.userId)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
});

export default router;
