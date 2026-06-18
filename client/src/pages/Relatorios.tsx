import { useState, useEffect } from 'react';
import api from '../lib/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface FaturamentoMes {
  mes: string;
  total_os: number;
  total_faturado: number;
  total_pago: number;
  total_a_receber: number;
  os_entregues: number;
  total_custo?: number;
  total_lucro?: number;
}

interface ClienteRecorrente {
  cliente_id: string;
  nome: string;
  telefone: string;
  total_os: number;
  valor_total: number;
}

interface ResumoStatus {
  status: string;
  total: number;
  valor_total: number;
}

interface OSPendente {
  id: string;
  numero_os: string;
  status: string;
  valor_final: number;
  forma_pagamento?: string;
  parcelas?: number;
  data_criacao: string;
  status_pagamento: string;
  cliente_nome: string;
  cliente_telefone: string;
}

interface FechamentoFinanceiro {
  // Totais
  total_os: number;
  total_os_ativas: number;
  faturamento_bruto: number;
  total_descontos: number;
  // A Receber vs Pago
  total_a_receber: number;
  qtd_a_receber: number;
  total_pago: number;
  qtd_pago: number;
  total_recebido_liquido: number;
  // Custos (sobre OS pagas)
  total_custo: number;
  total_taxa_maquininha: number;
  total_custo_brinde: number;
  total_custo_servico: number;
  // Lucro
  lucro_bruto: number;
  lucro_liquido: number;
  margem_media: number;
  // Por forma de pagamento
  total_pix: number;
  total_dinheiro: number;
  total_cartao: number;
  // Por categoria
  faturado_produtos: number;
  custo_produtos: number;
  lucro_produtos: number;
  faturado_servicos: number;
  custo_servicos: number;
  lucro_servicos: number;
  valor_brindes: number;
  custo_brindes: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

function formatarMes(mes: string) {
  if (!mes) return '-';
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[parseInt(m) - 1]}/${ano}`;
}

function getHoje() { return new Date().toISOString().split('T')[0]; }
function getPrimeiroDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function getPrimeiroDiaAno() { return `${new Date().getFullYear()}-01-01`; }

const STATUS_LABELS: Record<string, string> = {
  ABERTA: 'Aberta', EM_ANDAMENTO: 'Em Andamento', AGUARDANDO_PECA: 'Aguard. Peca',
  PRONTO: 'Pronto', ENTREGUE: 'Entregue', SEM_SOLUCAO: 'Sem Solucao', ORCAMENTO_NEGADO: 'Orc. Negado',
};
const STATUS_CORES: Record<string, string> = {
  ABERTA: '#2563eb', EM_ANDAMENTO: '#ea580c', AGUARDANDO_PECA: '#7c3aed',
  PRONTO: '#854d0e', ENTREGUE: '#166534', SEM_SOLUCAO: '#991b1b', ORCAMENTO_NEGADO: '#374151',
};

const FORMA_LABELS: Record<string, string> = {
  PIX: 'Pix', DINHEIRO: 'Dinheiro', CREDITO: 'Credito', DEBITO: 'Debito', PARCELADO: 'Parcelado', PENDENTE: 'Pendente',
};

// ─── Componente ─────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [faturamento, setFaturamento] = useState<FaturamentoMes[]>([]);
  const [clientesRecorrentes, setClientesRecorrentes] = useState<ClienteRecorrente[]>([]);
  const [resumoStatus, setResumoStatus] = useState<ResumoStatus[]>([]);
  const [fechamento, setFechamento] = useState<FechamentoFinanceiro | null>(null);
  const [pendentes, setPendentes] = useState<OSPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaAno());
  const [dataFim, setDataFim] = useState(getHoje());
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'financeiro' | 'pendentes' | 'clientes'>('resumo');

  const carregarRelatorios = () => {
    setCarregando(true);
    const params = `data_inicio=${dataInicio}&data_fim=${dataFim}`;
    Promise.all([
      api.get(`/relatorios/faturamento?${params}`),
      api.get(`/relatorios/clientes-recorrentes?${params}`),
      api.get(`/relatorios/por-status?${params}`),
      api.get(`/relatorios/fechamento-financeiro?${params}`).catch(() => ({ data: null })),
      api.get(`/relatorios/pendentes?${params}`).catch(() => ({ data: { data: [] } })),
    ])
      .then(([fat, cli, status, fech, pend]) => {
        setFaturamento(fat.data.data || fat.data || []);
        setClientesRecorrentes(cli.data.data || cli.data || []);
        setResumoStatus(status.data.data || status.data || []);
        setFechamento(fech.data?.data || fech.data || null);
        setPendentes(pend.data?.data || []);
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarRelatorios(); }, []);

  const totalFaturado = faturamento.reduce((acc, f) => acc + (f.total_faturado || 0), 0);
  const totalOS = faturamento.reduce((acc, f) => acc + (f.total_os || 0), 0);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="text-gray-500 text-sm mt-0.5">Analise de desempenho da assistencia tecnica</p>
      </div>

      {/* Filtro de período */}
      <div className="jt-card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label text-xs">Data inicio</label>
            <input type="date" className="input-field" value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Data fim</label>
            <input type="date" className="input-field" value={dataFim}
              onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={carregarRelatorios} className="btn-jt py-2 px-4 text-sm">Filtrar</button>
            <button onClick={() => { setDataInicio(getPrimeiroDiaMes()); setDataFim(getHoje()); }} className="btn-secondary py-2 px-3 text-xs">Mes atual</button>
            <button onClick={() => { setDataInicio(getPrimeiroDiaAno()); setDataFim(getHoje()); }} className="btn-secondary py-2 px-3 text-xs">Ano atual</button>
          </div>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {pendentes.length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer"
          style={{ background: '#fff7ed', border: '2px solid #fdba74' }}
          onClick={() => setAbaAtiva('pendentes')}>
          <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" style={{ boxShadow: '0 0 6px #fb923c' }} />
          <p className="text-sm font-semibold text-orange-700">
            {pendentes.length} OS com pagamento pendente — Total a receber: <span className="text-orange-600">{fmt(pendentes.reduce((s, p) => s + (p.valor_final || 0), 0))}</span>
          </p>
          <span className="ml-auto text-xs text-orange-500 underline">Ver detalhes</span>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'resumo', label: 'Resumo Geral' },
          { key: 'financeiro', label: 'Fechamento Financeiro' },
          { key: 'pendentes', label: `A Receber (${pendentes.length})` },
          { key: 'clientes', label: 'Clientes' },
        ] as const).map((aba) => (
          <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              abaAtiva === aba.key
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } ${aba.key === 'pendentes' && pendentes.length > 0 ? 'text-orange-600' : ''}`}>
            {aba.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando relatorios...</div>
      ) : (
        <>
          {/* ── ABA RESUMO ── */}
          {abaAtiva === 'resumo' && (
            <div className="space-y-5">
              {/* KPIs rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="jt-card text-center py-4">
                  <p className="text-xs text-gray-500 mb-1">Total de OS</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOS}</p>
                </div>
                <div className="jt-card text-center py-4">
                  <p className="text-xs text-gray-500 mb-1">Faturamento</p>
                  <p className="text-xl font-bold" style={{ color: '#166534' }}>{fmt(totalFaturado)}</p>
                </div>
                <div className="jt-card text-center py-4" style={{ border: '1px solid #fdba74', background: '#fff7ed' }}>
                  <p className="text-xs text-orange-600 mb-1">A Receber</p>
                  <p className="text-xl font-bold text-orange-600">{fmt(fechamento?.total_a_receber || 0)}</p>
                  <p className="text-xs text-gray-400">{fechamento?.qtd_a_receber || 0} OS</p>
                </div>
                <div className="jt-card text-center py-4" style={{ border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                  <p className="text-xs text-green-600 mb-1">Ja Recebido</p>
                  <p className="text-xl font-bold text-green-700">{fmt(fechamento?.total_pago || 0)}</p>
                  <p className="text-xs text-gray-400">{fechamento?.qtd_pago || 0} OS</p>
                </div>
              </div>

              {/* Por status */}
              {resumoStatus.length > 0 && (
                <div className="jt-card">
                  <h2 className="section-title">OS por Status</h2>
                  <div className="space-y-2">
                    {resumoStatus.map((s) => (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-28 flex-shrink-0"
                          style={{ color: STATUS_CORES[s.status] || '#374151' }}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{
                            width: `${Math.min(100, (s.total / (resumoStatus.reduce((a, x) => a + x.total, 0) || 1)) * 100)}%`,
                            background: STATUS_CORES[s.status] || '#374151'
                          }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-6 text-right">{s.total}</span>
                        <span className="text-xs text-gray-500 w-24 text-right">{fmt(s.valor_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Faturamento por mês */}
              {faturamento.length > 0 && (
                <div className="jt-card">
                  <h2 className="section-title">Faturamento por Mes</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-gray-500 font-medium">Mes</th>
                          <th className="text-right py-2 text-gray-500 font-medium">OS</th>
                          <th className="text-right py-2 text-gray-500 font-medium">Faturado</th>
                          <th className="text-right py-2 text-orange-500 font-medium">A Receber</th>
                          <th className="text-right py-2 text-green-600 font-medium">Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturamento.map((f) => (
                          <tr key={f.mes} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 font-medium text-gray-900">{formatarMes(f.mes)}</td>
                            <td className="py-2 text-right text-gray-600">{f.total_os}</td>
                            <td className="py-2 text-right font-semibold text-gray-900">{fmt(f.total_faturado)}</td>
                            <td className="py-2 text-right font-semibold text-orange-600">{fmt(f.total_a_receber || 0)}</td>
                            <td className="py-2 text-right font-semibold text-green-700">{fmt(f.total_pago || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ABA FECHAMENTO FINANCEIRO ── */}
          {abaAtiva === 'financeiro' && (
            <div className="space-y-5">
              {!fechamento ? (
                <div className="jt-card text-center py-8 text-gray-400">
                  <p>Sem dados financeiros para o periodo selecionado.</p>
                  <p className="text-xs mt-1">Confirme pagamentos de OS para ver o fechamento.</p>
                </div>
              ) : (
                <>
                  {/* Aviso */}
                  <div className="rounded-xl px-4 py-2.5 text-xs font-medium"
                    style={{ background: 'rgba(233,30,140,0.06)', border: '1px solid rgba(233,30,140,0.2)', color: '#be185d' }}>
                    Dados internos — nunca compartilhar com clientes
                  </div>

                  {/* Bloco 1: Visao Geral de Caixa */}
                  <div className="jt-card" style={{ border: '2px solid rgba(233,30,140,0.2)' }}>
                    <h2 className="section-title" style={{ color: '#e91e8c' }}>Visao Geral de Caixa</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl text-center" style={{ background: '#f8f9fa', border: '1px solid #e5e7eb' }}>
                        <p className="text-xs text-gray-500 mb-1">Faturamento Bruto</p>
                        <p className="text-xl font-bold text-gray-900">{fmt(fechamento.faturamento_bruto)}</p>
                        <p className="text-xs text-gray-400 mt-1">{fechamento.total_os_ativas} OS ativas</p>
                      </div>
                      <div className="p-4 rounded-xl text-center" style={{ background: '#fff7ed', border: '2px solid #fdba74' }}>
                        <p className="text-xs text-orange-600 mb-1">A Receber</p>
                        <p className="text-xl font-bold text-orange-600">{fmt(fechamento.total_a_receber)}</p>
                        <p className="text-xs text-gray-400 mt-1">{fechamento.qtd_a_receber} OS pendentes</p>
                      </div>
                      <div className="p-4 rounded-xl text-center" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
                        <p className="text-xs text-green-600 mb-1">Ja Recebido</p>
                        <p className="text-xl font-bold text-green-700">{fmt(fechamento.total_pago)}</p>
                        <p className="text-xs text-gray-400 mt-1">{fechamento.qtd_pago} OS pagas</p>
                      </div>
                    </div>

                    {/* Detalhe de descontos */}
                    {fechamento.total_descontos > 0 && (
                      <div className="mt-3 flex justify-between text-sm text-gray-500 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <span>Total de descontos concedidos:</span>
                        <span className="font-semibold text-orange-500">- {fmt(fechamento.total_descontos)}</span>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Analise de Lucro (sobre OS pagas) */}
                  <div className="jt-card" style={{ border: '2px solid rgba(22,163,74,0.3)' }}>
                    <h2 className="section-title" style={{ color: '#166534' }}>Analise de Lucro (OS Pagas)</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <p className="text-xs text-gray-500 mb-1">Recebido Liquido</p>
                        <p className="text-base font-bold text-green-700">{fmt(fechamento.total_recebido_liquido)}</p>
                        <p className="text-xs text-gray-400">apos taxa maquininha</p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <p className="text-xs text-gray-500 mb-1">Custo Total</p>
                        <p className="text-base font-bold text-red-600">{fmt(fechamento.total_custo)}</p>
                        <p className="text-xs text-gray-400">pecas + servico + brinde</p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <p className="text-xs text-gray-500 mb-1">Lucro Liquido</p>
                        <p className="text-base font-bold" style={{ color: fechamento.lucro_liquido >= 0 ? '#166534' : '#dc2626' }}>
                          {fmt(fechamento.lucro_liquido)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl text-center" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <p className="text-xs text-gray-500 mb-1">Margem Media</p>
                        <p className="text-base font-bold text-blue-700">{fmtPct(fechamento.margem_media)}</p>
                      </div>
                    </div>

                    {/* Detalhamento de custos */}
                    <div className="space-y-2 text-sm pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalhamento de Custos</p>
                      <div className="flex justify-between text-gray-600">
                        <span>Custo das pecas / produtos:</span>
                        <span className="font-medium text-red-500">- {fmt(fechamento.custo_produtos)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Custo dos servicos (mao de obra):</span>
                        <span className="font-medium text-red-500">- {fmt(fechamento.total_custo_servico)}</span>
                      </div>
                      {fechamento.total_custo_brinde > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Custo dos brindes:</span>
                          <span className="font-medium text-pink-500">- {fmt(fechamento.total_custo_brinde)}</span>
                        </div>
                      )}
                      {fechamento.total_taxa_maquininha > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Taxa maquininha (cartao):</span>
                          <span className="font-medium text-orange-500">- {fmt(fechamento.total_taxa_maquininha)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloco 3: Por Categoria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Produtos */}
                    <div className="jt-card" style={{ border: '1px solid rgba(0,180,255,0.3)' }}>
                      <h3 className="font-bold text-sm mb-3" style={{ color: '#00b4ff' }}>Produtos / Pecas</h3>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Faturado:</span>
                          <span className="font-semibold">{fmt(fechamento.faturado_produtos)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Custo:</span>
                          <span className="font-semibold text-red-500">- {fmt(fechamento.custo_produtos)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1.5" style={{ borderTop: '1px solid #e5e7eb' }}>
                          <span>Lucro:</span>
                          <span style={{ color: fechamento.lucro_produtos >= 0 ? '#166534' : '#dc2626' }}>{fmt(fechamento.lucro_produtos)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Servicos */}
                    <div className="jt-card" style={{ border: '1px solid rgba(233,30,140,0.3)' }}>
                      <h3 className="font-bold text-sm mb-3" style={{ color: '#e91e8c' }}>Servicos / Mao de Obra</h3>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Faturado:</span>
                          <span className="font-semibold">{fmt(fechamento.faturado_servicos)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Custo:</span>
                          <span className="font-semibold text-red-500">- {fmt(fechamento.custo_servicos)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1.5" style={{ borderTop: '1px solid #e5e7eb' }}>
                          <span>Lucro:</span>
                          <span style={{ color: fechamento.lucro_servicos >= 0 ? '#166534' : '#dc2626' }}>{fmt(fechamento.lucro_servicos)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 4: Por Forma de Pagamento */}
                  {(fechamento.total_pix > 0 || fechamento.total_dinheiro > 0 || fechamento.total_cartao > 0) && (
                    <div className="jt-card">
                      <h2 className="section-title">Por Forma de Pagamento (OS Pagas)</h2>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <p className="text-xs text-gray-500 mb-1">Pix</p>
                          <p className="text-base font-bold text-green-700">{fmt(fechamento.total_pix)}</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <p className="text-xs text-gray-500 mb-1">Dinheiro</p>
                          <p className="text-base font-bold text-green-700">{fmt(fechamento.total_dinheiro)}</p>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <p className="text-xs text-gray-500 mb-1">Cartao</p>
                          <p className="text-base font-bold text-blue-700">{fmt(fechamento.total_cartao)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ABA A RECEBER ── */}
          {abaAtiva === 'pendentes' && (
            <div className="space-y-4">
              <div className="jt-card" style={{ border: '2px solid #fdba74', background: '#fff7ed' }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="section-title mb-0 text-orange-700">OS com Pagamento Pendente</h2>
                  <span className="text-sm font-bold text-orange-600">
                    Total: {fmt(pendentes.reduce((s, p) => s + (p.valor_final || 0), 0))}
                  </span>
                </div>
                <p className="text-xs text-orange-600 mb-4">
                  {pendentes.length} OS aguardando confirmacao de pagamento no periodo selecionado
                </p>

                {pendentes.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <p className="font-semibold">Nenhuma OS pendente!</p>
                    <p className="text-xs text-gray-400 mt-1">Todos os pagamentos estao confirmados.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendentes.map((os) => (
                      <a key={os.id} href={`/os/${os.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-50 transition-colors"
                        style={{ background: '#fff', border: '1px solid #fed7aa' }}>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{os.numero_os}</p>
                          <p className="text-xs text-gray-600">{os.cliente_nome}</p>
                          <p className="text-xs text-gray-400">{fmtData(os.data_criacao)} — {FORMA_LABELS[os.forma_pagamento || ''] || os.forma_pagamento || 'Forma nao definida'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-orange-600">{fmt(os.valor_final)}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: '#fed7aa', color: '#c2410c' }}>
                            A RECEBER
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ABA CLIENTES ── */}
          {abaAtiva === 'clientes' && (
            <div className="jt-card">
              <h2 className="section-title">Top 10 Clientes</h2>
              {clientesRecorrentes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum dado disponivel.</p>
              ) : (
                <div className="space-y-2">
                  {clientesRecorrentes.map((c, idx) => (
                    <div key={c.cliente_id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: idx === 0 ? 'rgba(233,30,140,0.04)' : '#f8f9fa', border: `1px solid ${idx === 0 ? 'rgba(233,30,140,0.2)' : '#e5e7eb'}` }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: idx < 3 ? '#e91e8c' : '#e5e7eb', color: idx < 3 ? '#fff' : '#374151' }}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                        <p className="text-xs text-gray-400">{c.telefone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: '#166534' }}>{fmt(c.valor_total)}</p>
                        <p className="text-xs text-gray-400">{c.total_os} OS</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
