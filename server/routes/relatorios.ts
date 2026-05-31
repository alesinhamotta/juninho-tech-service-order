// ============================================================================
// ROTAS DE RELATÓRIOS - /api/relatorios
// ============================================================================

import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Todas as rotas de relatórios exigem autenticação
router.use(authMiddleware);

// ============================================================================
// GET /api/relatorios/faturamento - Faturamento por mês
// ============================================================================
router.get('/faturamento', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('v_faturamento_mes')
      .select('*')
      .order('mes', { ascending: false })
      .limit(12);

    if (error) throw error;

    return res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar faturamento' });
  }
});

// ============================================================================
// GET /api/relatorios/os-resumo - Resumo das ordens de serviço
// ============================================================================
router.get('/os-resumo', async (req: AuthRequest, res: Response) => {
  try {
    const { data: total, error: e1 } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });

    const { count: pendentes } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDENTE');

    const { count: concluidas } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'CONCLUIDO');

    const { count: pagas } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PAGO');

    if (e1) throw e1;

    return res.json({
      data: {
        total: total || 0,
        pendentes: pendentes || 0,
        concluidas: concluidas || 0,
        pagas: pagas || 0,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar resumo de OS:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar resumo de OS' });
  }
});

// ============================================================================
// GET /api/relatorios/clientes-recorrentes - Clientes com mais OS
// ============================================================================
router.get('/clientes-recorrentes', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        cliente_id,
        clientes (id, nome, telefone),
        valor_final
      `)
      .neq('status', 'CANCELADO');

    if (error) throw error;

    // Agrupar por cliente
    const clientesMap: Record<string, { cliente_id: string; nome: string; telefone: string; total_os: number; valor_total: number }> = {};

    data?.forEach((os: any) => {
      const cid = os.cliente_id;
      if (!clientesMap[cid]) {
        clientesMap[cid] = {
          cliente_id: cid,
          nome: os.clientes?.nome || '',
          telefone: os.clientes?.telefone || '',
          total_os: 0,
          valor_total: 0,
        };
      }
      clientesMap[cid].total_os += 1;
      clientesMap[cid].valor_total += Number(os.valor_final || 0);
    });

    const resultado = Object.values(clientesMap)
      .sort((a, b) => b.total_os - a.total_os)
      .slice(0, 10);

    return res.json({ data: resultado });
  } catch (error) {
    console.error('Erro ao buscar clientes recorrentes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar clientes recorrentes' });
  }
});

export default router;
