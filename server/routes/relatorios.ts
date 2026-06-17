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
         COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_faturado
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

export default router;
