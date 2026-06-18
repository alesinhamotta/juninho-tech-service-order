// ============================================================================
// ROTAS DE RELATÓRIOS — /api/relatorios
// Sistema Juninho Tech OS v2
// ============================================================================
import { Router, type Request, type Response } from 'express';
import { queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/relatorios/os-resumo — Resumo geral do dashboard
router.get('/os-resumo', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;
    let filtroData = '';
    const params: unknown[] = [];
    let idx = 1;
    if (data_inicio) { filtroData += ` AND data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { filtroData += ` AND data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    const resultado = await queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'ABERTA') AS abertas,
         COUNT(*) FILTER (WHERE status = 'EM_ANDAMENTO') AS em_andamento,
         COUNT(*) FILTER (WHERE status = 'AGUARDANDO_PECA') AS aguardando_peca,
         COUNT(*) FILTER (WHERE status = 'PRONTO') AS prontas,
         COUNT(*) FILTER (WHERE status = 'ENTREGUE') AS entregues,
         COUNT(*) FILTER (WHERE status = 'SEM_SOLUCAO') AS sem_solucao,
         COUNT(*) FILTER (WHERE status = 'ORCAMENTO_NEGADO') AS orcamento_negado,
         COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS faturamento_total
       FROM service_orders WHERE 1=1${filtroData}`,
      params
    );

    res.json({
      data: {
        total: Number(resultado?.total || 0),
        abertas: Number(resultado?.abertas || 0),
        em_andamento: Number(resultado?.em_andamento || 0),
        aguardando_peca: Number(resultado?.aguardando_peca || 0),
        prontas: Number(resultado?.prontas || 0),
        entregues: Number(resultado?.entregues || 0),
        sem_solucao: Number(resultado?.sem_solucao || 0),
        orcamento_negado: Number(resultado?.orcamento_negado || 0),
        faturamento_total: Number(resultado?.faturamento_total || 0),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de OS:', error);
    res.status(500).json({ error: 'Erro interno ao buscar resumo de OS' });
  }
});

// GET /api/relatorios/faturamento — Faturamento por mês
router.get('/faturamento', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;
    let filtroData = '';
    const params: unknown[] = [];
    let idx = 1;
    if (data_inicio) { filtroData += ` AND data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { filtroData += ` AND data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    const data = await queryMany(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', data_criacao), 'YYYY-MM') AS mes,
         COUNT(*) AS total_os,
         COUNT(*) FILTER (WHERE status = 'ENTREGUE') AS os_entregues,
         COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_faturado,
         COALESCE(SUM(custo_total) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_custo,
         COALESCE(SUM(lucro_liquido) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_lucro
       FROM service_orders WHERE 1=1${filtroData}
       GROUP BY DATE_TRUNC('month', data_criacao)
       ORDER BY DATE_TRUNC('month', data_criacao) DESC
       LIMIT 24`,
      params
    );
    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ error: 'Erro interno ao buscar faturamento' });
  }
});

// GET /api/relatorios/por-status — OS agrupadas por status
router.get('/por-status', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;
    let filtroData = '';
    const params: unknown[] = [];
    let idx = 1;
    if (data_inicio) { filtroData += ` AND data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { filtroData += ` AND data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    const data = await queryMany(
      `SELECT status, COUNT(*) AS total, COALESCE(SUM(valor_final), 0) AS valor_total
       FROM service_orders WHERE 1=1${filtroData}
       GROUP BY status ORDER BY total DESC`,
      params
    );
    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar OS por status:', error);
    res.status(500).json({ error: 'Erro interno ao buscar OS por status' });
  }
});

// GET /api/relatorios/clientes-recorrentes — Top 10 clientes
router.get('/clientes-recorrentes', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;
    let filtroData = '';
    const params: unknown[] = [];
    let idx = 1;
    if (data_inicio) { filtroData += ` AND os.data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { filtroData += ` AND os.data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    const data = await queryMany(
      `SELECT
         c.id AS cliente_id, c.nome, c.telefone,
         COUNT(os.id) AS total_os,
         COALESCE(SUM(os.valor_final), 0) AS valor_total
       FROM clientes c
       LEFT JOIN service_orders os ON os.cliente_id = c.id${filtroData ? ' AND 1=1' + filtroData : ''}
       GROUP BY c.id, c.nome, c.telefone
       ORDER BY total_os DESC LIMIT 10`,
      params
    );
    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar clientes recorrentes:', error);
    res.status(500).json({ error: 'Erro interno ao buscar clientes recorrentes' });
  }
});

// GET /api/relatorios/fechamento-financeiro — Fechamento financeiro completo (INTERNO)
// Custo, lucro, margem por produto e serviço — NUNCA expor ao cliente
router.get('/fechamento-financeiro', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query as Record<string, string>;
    let filtroData = '';
    const params: unknown[] = [];
    let idx = 1;
    if (data_inicio) { filtroData += ` AND data_criacao >= $${idx++}`; params.push(data_inicio); }
    if (data_fim) { filtroData += ` AND data_criacao < ($${idx++}::date + interval '1 day')`; params.push(data_fim); }

    // Totais gerais da OS
    const totais = await queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) FILTER (WHERE custo_total IS NOT NULL AND custo_total > 0) AS total_os_com_dados,
         COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_faturado,
         COALESCE(SUM(valor_recebido_liquido) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_recebido,
         COALESCE(SUM(custo_total) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_custo,
         COALESCE(SUM(taxa_maquininha_valor) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_taxa,
         COALESCE(SUM(custo_brinde) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_brinde,
         COALESCE(SUM(lucro_liquido) FILTER (WHERE status = 'ENTREGUE'), 0) AS lucro_liquido,
         CASE
           WHEN SUM(valor_recebido_liquido) FILTER (WHERE status = 'ENTREGUE') > 0
           THEN ROUND(
             AVG(margem_percentual) FILTER (WHERE status = 'ENTREGUE' AND margem_percentual IS NOT NULL),
             2
           )
           ELSE 0
         END AS margem_media
       FROM service_orders WHERE 1=1${filtroData}`,
      params
    );

    // Totais por itens — produtos/peças
    const itensTotais = await queryOne<Record<string, string>>(
      `SELECT
         COALESCE(SUM(io.preco_unitario * io.quantidade), 0) AS faturado_produtos,
         COALESCE(SUM(io.custo_unitario * io.quantidade), 0) AS custo_produtos
       FROM itens_os io
       JOIN service_orders so ON so.id = io.os_id
       WHERE so.status = 'ENTREGUE'${filtroData.replace(/data_criacao/g, 'so.data_criacao')}`,
      params
    );

    // Totais de serviço (mão de obra)
    const servicoTotais = await queryOne<Record<string, string>>(
      `SELECT
         COALESCE(SUM(valor_servico), 0) AS faturado_servicos,
         COALESCE(SUM(custo_servico), 0) AS custo_servicos
       FROM service_orders
       WHERE status = 'ENTREGUE'${filtroData}`,
      params
    );

    const faturadoProdutos = Number(itensTotais?.faturado_produtos || 0);
    const custoProdutos = Number(itensTotais?.custo_produtos || 0);
    const faturadoServicos = Number(servicoTotais?.faturado_servicos || 0);
    const custoServicos = Number(servicoTotais?.custo_servicos || 0);

    res.json({
      data: {
        total_os_com_dados: Number(totais?.total_os_com_dados || 0),
        total_faturado: Number(totais?.total_faturado || 0),
        total_recebido: Number(totais?.total_recebido || 0),
        total_custo: Number(totais?.total_custo || 0),
        total_taxa: Number(totais?.total_taxa || 0),
        total_brinde: Number(totais?.total_brinde || 0),
        lucro_bruto: Number(totais?.total_recebido || 0) - Number(totais?.total_custo || 0),
        lucro_liquido: Number(totais?.lucro_liquido || 0),
        margem_media: Number(totais?.margem_media || 0),
        // Por categoria
        faturado_produtos: faturadoProdutos,
        custo_produtos: custoProdutos,
        lucro_produtos: faturadoProdutos - custoProdutos,
        faturado_servicos: faturadoServicos,
        custo_servicos: custoServicos,
        lucro_servicos: faturadoServicos - custoServicos,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar fechamento financeiro:', error);
    res.status(500).json({ error: 'Erro interno ao buscar fechamento financeiro' });
  }
});

export default router;
