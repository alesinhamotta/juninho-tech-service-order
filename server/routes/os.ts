// ============================================================================
// ROTAS DE ORDENS DE SERVIÇO - /api/os
// ============================================================================

import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Todas as rotas de OS exigem autenticação
router.use(authMiddleware);

// ============================================================================
// GET /api/os - Listar todas as ordens de serviço
// ============================================================================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, tipo, search } = req.query;

    let query = supabase
      .from('service_orders')
      .select(`
        *,
        clientes (id, nome, telefone, email)
      `)
      .order('data_criacao', { ascending: false });

    if (status) query = query.eq('status', status);
    if (tipo) query = query.eq('tipo', tipo);
    if (search) {
      query = query.or(`numero_os.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({ data, total: data?.length || 0 });
  } catch (error) {
    console.error('Erro ao listar ordens de serviço:', error);
    return res.status(500).json({ error: 'Erro interno ao listar ordens de serviço' });
  }
});

// ============================================================================
// GET /api/os/:id - Obter ordem de serviço com itens e acessórios
// ============================================================================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: os, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        clientes (id, nome, telefone, email, endereco, cidade, estado),
        itens_os (
          id, descricao, quantidade, preco_unitario, subtotal, tipo,
          produtos (id, nome, categoria, marca)
        ),
        checklist_items (
          id, marcado, observacao,
          checklists (id, tipo, item, descricao, ordem)
        ),
        pagamentos (id, valor, forma_pagamento, numero_parcela, total_parcelas, data_pagamento, status)
      `)
      .eq('id', id)
      .single();

    if (error || !os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    return res.json(os);
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar ordem de serviço' });
  }
});

// ============================================================================
// POST /api/os - Criar nova ordem de serviço (orçamento)
// ============================================================================
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      cliente_id,
      tipo,
      descricao,
      desconto,
      forma_pagamento,
      parcelas,
      garantia_meses,
      observacoes,
    } = req.body;

    if (!cliente_id || !tipo) {
      return res.status(400).json({ error: 'Cliente e tipo da OS são obrigatórios' });
    }

    const tiposValidos = ['ORCAMENTO', 'VENDA', 'REPARO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` });
    }

    // Gerar número único da OS: OS-YYYYMMDD-XXXX
    const dataAtual = new Date();
    const dataStr = dataAtual.toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });
    const numeroOS = `OS-${dataStr}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data: novaOS, error } = await supabase
      .from('service_orders')
      .insert([{
        numero_os: numeroOS,
        cliente_id,
        tipo,
        status: 'PENDENTE',
        descricao,
        desconto: desconto || 0,
        valor_total: 0,
        valor_final: 0,
        forma_pagamento: forma_pagamento || 'PENDENTE',
        parcelas: parcelas || 1,
        garantia_meses: garantia_meses || 12,
        observacoes,
      }])
      .select(`*, clientes (id, nome, telefone)`)
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Ordem de serviço criada com sucesso',
      data: novaOS,
    });
  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    return res.status(500).json({ error: 'Erro interno ao criar ordem de serviço' });
  }
});

// ============================================================================
// POST /api/os/:id/itens - Adicionar item/peça à ordem de serviço
// ============================================================================
router.post('/:id/itens', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { produto_id, descricao, quantidade, preco_unitario, tipo } = req.body;

    if (!quantidade || !preco_unitario || !tipo) {
      return res.status(400).json({ error: 'Quantidade, preço unitário e tipo são obrigatórios' });
    }

    const subtotal = quantidade * preco_unitario;

    const { data: novoItem, error } = await supabase
      .from('itens_os')
      .insert([{
        os_id: id,
        produto_id: produto_id || null,
        descricao,
        quantidade,
        preco_unitario,
        subtotal,
        tipo,
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Recalcular o valor total da OS
    const { data: todosItens } = await supabase
      .from('itens_os')
      .select('subtotal')
      .eq('os_id', id);

    const valorTotal = todosItens?.reduce((acc, item) => acc + Number(item.subtotal), 0) || 0;

    const { data: osAtualizada } = await supabase
      .from('service_orders')
      .select('desconto')
      .eq('id', id)
      .single();

    const desconto = Number(osAtualizada?.desconto || 0);
    const valorFinal = valorTotal - desconto;

    await supabase
      .from('service_orders')
      .update({ valor_total: valorTotal, valor_final: valorFinal })
      .eq('id', id);

    return res.status(201).json({
      message: 'Item adicionado com sucesso',
      data: novoItem,
      valor_total: valorTotal,
      valor_final: valorFinal,
    });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return res.status(500).json({ error: 'Erro interno ao adicionar item' });
  }
});

// ============================================================================
// PUT /api/os/:id - Atualizar ordem de serviço (status, pagamento, desconto)
// ============================================================================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      forma_pagamento,
      parcelas,
      desconto,
      data_pagamento,
      data_conclusao,
      observacoes,
    } = req.body;

    const statusValidos = ['PENDENTE', 'APROVADO', 'PAGO', 'CONCLUIDO', 'CANCELADO'];
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` });
    }

    // Buscar OS atual para recalcular valor_final se desconto mudar
    const { data: osAtual } = await supabase
      .from('service_orders')
      .select('valor_total, desconto')
      .eq('id', id)
      .single();

    const novoDesconto = desconto !== undefined ? desconto : Number(osAtual?.desconto || 0);
    const valorFinal = Number(osAtual?.valor_total || 0) - novoDesconto;

    const camposAtualizar: Record<string, unknown> = {};
    if (status) camposAtualizar.status = status;
    if (forma_pagamento) camposAtualizar.forma_pagamento = forma_pagamento;
    if (parcelas) camposAtualizar.parcelas = parcelas;
    if (desconto !== undefined) {
      camposAtualizar.desconto = novoDesconto;
      camposAtualizar.valor_final = valorFinal;
    }
    if (data_pagamento) camposAtualizar.data_pagamento = data_pagamento;
    if (data_conclusao) camposAtualizar.data_conclusao = data_conclusao;
    if (observacoes !== undefined) camposAtualizar.observacoes = observacoes;

    const { data: osAtualizada, error } = await supabase
      .from('service_orders')
      .update(camposAtualizar)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !osAtualizada) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    return res.json({
      message: 'Ordem de serviço atualizada com sucesso',
      data: osAtualizada,
    });
  } catch (error) {
    console.error('Erro ao atualizar ordem de serviço:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar ordem de serviço' });
  }
});

// ============================================================================
// POST /api/os/:id/converter-venda - Converter orçamento em venda
// ============================================================================
router.post('/:id/converter-venda', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { forma_pagamento, parcelas, data_pagamento } = req.body;

    // Verificar se a OS existe e é um orçamento
    const { data: os, error: errorBusca } = await supabase
      .from('service_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (errorBusca || !os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    if (os.tipo !== 'ORCAMENTO') {
      return res.status(400).json({ error: 'Somente orçamentos podem ser convertidos em venda' });
    }

    if (os.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Não é possível converter um orçamento cancelado' });
    }

    const { data: osConvertida, error } = await supabase
      .from('service_orders')
      .update({
        tipo: 'VENDA',
        status: 'PAGO',
        forma_pagamento: forma_pagamento || os.forma_pagamento,
        parcelas: parcelas || os.parcelas,
        data_pagamento: data_pagamento || new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return res.json({
      message: 'Orçamento convertido em venda com sucesso',
      data: osConvertida,
    });
  } catch (error) {
    console.error('Erro ao converter orçamento em venda:', error);
    return res.status(500).json({ error: 'Erro interno ao converter orçamento em venda' });
  }
});

export default router;
