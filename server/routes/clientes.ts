// ============================================================================
// ROTAS DE CLIENTES - /api/clientes
// ============================================================================

import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Todas as rotas de clientes exigem autenticação
router.use(authMiddleware);

// ============================================================================
// GET /api/clientes - Listar todos os clientes
// ============================================================================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from('clientes')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({ data, total: data?.length || 0 });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return res.status(500).json({ error: 'Erro interno ao listar clientes' });
  }
});

// ============================================================================
// GET /api/clientes/:id - Obter cliente específico
// ============================================================================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    return res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar cliente' });
  }
});

// ============================================================================
// POST /api/clientes - Criar novo cliente
// ============================================================================
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    // Verificar se o telefone já está cadastrado
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', telefone)
      .single();

    if (clienteExistente) {
      return res.status(400).json({ error: 'Já existe um cliente com este telefone' });
    }

    const { data: novoCliente, error } = await supabase
      .from('clientes')
      .insert([{ nome, telefone, email, endereco, cidade, estado, cep, observacoes }])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Cliente criado com sucesso',
      data: novoCliente,
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao criar cliente' });
  }
});

// ============================================================================
// PUT /api/clientes/:id - Atualizar cliente
// ============================================================================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const { data: clienteAtualizado, error } = await supabase
      .from('clientes')
      .update({ nome, telefone, email, endereco, cidade, estado, cep, observacoes })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    return res.json({
      message: 'Cliente atualizado com sucesso',
      data: clienteAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar cliente' });
  }
});

// ============================================================================
// DELETE /api/clientes/:id - Desativar cliente (soft delete)
// ============================================================================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clientes')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: 'Cliente desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao desativar cliente' });
  }
});

export default router;
