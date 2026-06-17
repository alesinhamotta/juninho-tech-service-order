// ============================================================================
// ROTAS DE RELATORIOS - /api/relatorios
// ============================================================================

import { Router, type Request, type Response } from 'express';
import { queryOne, queryMany } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/relatorios/os-resumo - Resumo geral das OS
router.get('/os-resumo', async (_req: Request, res: Response) => {
  try {
    const resultado = await queryOne<{
      total: string; pendentes: string; concluidas: string; pagas: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'PENDENTE') AS pendentes,
         COUNT(*) FILTER (WHERE status = 'CONCLUIDO') AS concluidas,
         COUNT(*) FILTER (WHERE status = 'PAGO') AS pagas
       FROM service_orders`,
      []
    );

    res.json({
      data: {
        total: Number(resultado?.total || 0),
        pendentes: Number(resultado?.pendentes || 0),
        concluidas: Number(resultado?.concluidas || 0),
        pagas: Number(resultado?.pagas || 0),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de OS:', error);
    res.status(500).json({ error: 'Erro interno ao buscar resumo de OS' });
  }
});

// GET /api/relatorios/faturamento - Faturamento por mes
router.get('/faturamento', async (_req: Request, res: Response) => {
  try {
    const data = await queryMany(
      `SELECT
         DATE_TRUNC('month', data_criacao) AS mes,
         COUNT(*) AS total_os,
         COUNT(*) FILTER (WHERE status = 'PAGO') AS os_pagas,
         COALESCE(SUM(valor_final) FILTER (WHERE status = 'PAGO'), 0) AS total_faturado
       FROM service_orders
       GROUP BY DATE_TRUNC('month', data_criacao)
       ORDER BY mes DESC
       LIMIT 12`,
      []
    );

    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ error: 'Erro interno ao buscar faturamento' });
  }
});

// GET /api/relatorios/clientes-recorrentes - Top 10 clientes
router.get('/clientes-recorrentes', async (_req: Request, res: Response) => {
  try {
    const data = await queryMany(
      `SELECT
         c.id AS cliente_id,
         c.nome,
         c.telefone,
         COUNT(os.id) AS total_os,
         COALESCE(SUM(os.valor_final), 0) AS valor_total
       FROM clientes c
       LEFT JOIN service_orders os ON os.cliente_id = c.id AND os.status != 'CANCELADO'
       GROUP BY c.id, c.nome, c.telefone
       ORDER BY total_os DESC
       LIMIT 10`,
      []
    );

    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar clientes recorrentes:', error);
    res.status(500).json({ error: 'Erro interno ao buscar clientes recorrentes' });
  }
});

export default router;
