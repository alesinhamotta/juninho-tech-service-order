// ============================================================================
// ROTAS DE PRODUTOS/PEÇAS - /api/produtos
// ============================================================================

import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Todas as rotas de produtos exigem autenticação
router.use(authMiddleware);

// ============================================================================
// GET /api/produtos - Listar produtos ativos
// ============================================================================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoria } = req.query;

    let query = supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,categoria.ilike.%${search}%,marca.ilike.%${search}%`);
    }

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({ data, total: data?.length || 0 });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return res.status(500).json({ error: 'Erro interno ao listar produtos' });
  }
});

// ============================================================================
// GET /api/produtos/:id - Obter produto específico
// ============================================================================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: produto, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    return res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar produto' });
  }
});

// ============================================================================
// POST /api/produtos - Criar novo produto
// ============================================================================
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo } = req.body;

    if (!nome || !categoria || preco_venda === undefined) {
      return res.status(400).json({ error: 'Nome, categoria e preço de venda são obrigatórios' });
    }

    const { data: novoProduto, error } = await supabase
      .from('produtos')
      .insert([{
        nome,
        categoria,
        marca,
        modelo,
        descricao,
        preco_custo: preco_custo || null,
        preco_venda,
        estoque: estoque || 0,
        estoque_minimo: estoque_minimo || 5,
      }])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Produto criado com sucesso',
      data: novoProduto,
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao criar produto' });
  }
});

// ============================================================================
// PUT /api/produtos/:id - Atualizar produto
// ============================================================================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo } = req.body;

    if (!nome || !categoria || preco_venda === undefined) {
      return res.status(400).json({ error: 'Nome, categoria e preço de venda são obrigatórios' });
    }

    const { data: produtoAtualizado, error } = await supabase
      .from('produtos')
      .update({ nome, categoria, marca, modelo, descricao, preco_custo, preco_venda, estoque, estoque_minimo })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !produtoAtualizado) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    return res.json({
      message: 'Produto atualizado com sucesso',
      data: produtoAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
});

// ============================================================================
// DELETE /api/produtos/:id - Desativar produto (soft delete)
// ============================================================================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: 'Produto desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao desativar produto' });
  }
});

export default router;
