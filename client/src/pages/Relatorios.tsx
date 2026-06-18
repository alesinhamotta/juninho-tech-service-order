import { useState, useEffect } from 'react';
import api from '../lib/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface FaturamentoMes {
  mes: string;
  total_os: number;
  total_faturado: number;
  os_entregues: number;
  total_custo?: number;
  total_lucro?: number;
  margem_media?: number;
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

interface FechamentoFinanceiro {
  total_faturado: number;
  total_recebido: number;
  total_custo: number;
  total_taxa: number;
  total_brinde: number;
  lucro_bruto: number;
  lucro_liquido: number;
  margem_media: number;
  total_os_com_dados: number;
  // Por categoria
  faturado_produtos: number;
  custo_produtos: number;
  lucro_produtos: number;
  faturado_servicos: number;
  custo_servicos: number;
  lucro_servicos: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

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

// ─── Componente ─────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [faturamento, setFaturamento] = useState<FaturamentoMes[]>([]);
  const [clientesRecorrentes, setClientesRecorrentes] = useState<ClienteRecorrente[]>([]);
  const [resumoStatus, setResumoStatus] = useState<ResumoStatus[]>([]);
  const [fechamento, setFechamento] = useState<FechamentoFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaAno());
  const [dataFim, setDataFim] = useState(getHoje());
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'financeiro' | 'clientes'>('resumo');

  const carregarRelatorios = () => {
    setCarregando(true);
    const params = `data_inicio=${dataInicio}&data_fim=${dataFim}`;
    Promise.all([
      api.get(`/relatorios/faturamento?${params}`),
      api.get(`/relatorios/clientes-recorrentes?${params}`),
      api.get(`/relatorios/por-status?${params}`),
      api.get(`/relatorios/fechamento-financeiro?${params}`).catch(() => ({ data: null })),
    ])
      .then(([fat, cli, status, fech]) => {
        setFaturamento(fat.data.data || fat.data || []);
        setClientesRecorrentes(cli.data.data || cli.data || []);
        setResumoStatus(status.data.data || status.data || []);
        setFechamento(fech.data?.data || fech.data || null);
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarRelatorios(); }, []);

  const totalFaturado = faturamento.reduce((acc, f) => acc + (f.total_faturado || 0), 0);
  const totalOS = faturamento.reduce((acc, f) => acc + (f.total_os || 0), 0);
  const totalLucro = faturamento.reduce((acc, f) => acc + (f.total_lucro || 0), 0);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="text-gray-500 text-sm mt-0.5">Analise de desempenho da assistencia tecnica</p>
      </div>

      {/* Filtro de período */}
      <div className="jt-card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="label">Data inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Data final</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setDataInicio(getPrimeiroDiaMes()); setDataFim(getHoje()); }}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
              Este mes
            </button>
            <button onClick={() => { setDataInicio(getPrimeiroDiaAno()); setDataFim(getHoje()); }}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
              Este ano
            </button>
            <button onClick={carregarRelatorios} className="btn-jt py-2 px-4 text-sm">
              Gerar Relatorio
            </button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="jt-card text-center py-16 text-gray-400">
          <p>Carregando relatorios...</p>
        </div>
      ) : (
        <>
          {/* Cards KPI principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #e91e8c' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Total de OS</p>
              <p className="text-3xl font-bold" style={{ color: '#e91e8c' }}>{totalOS}</p>
              <p className="text-xs text-gray-400 mt-1">no periodo</p>
            </div>
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #00b4ff' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Faturamento</p>
              <p className="text-xl font-bold" style={{ color: '#00b4ff' }}>{fmt(totalFaturado)}</p>
              <p className="text-xs text-gray-400 mt-1">OS entregues</p>
            </div>
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #166534' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Lucro Liquido</p>
              <p className="text-xl font-bold" style={{ color: totalLucro >= 0 ? '#166534' : '#dc2626' }}>
                {fechamento ? fmt(fechamento.lucro_liquido) : fmt(totalLucro)}
              </p>
              <p className="text-xs text-gray-400 mt-1">estimado</p>
            </div>
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #7c3aed' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Margem Media</p>
              <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>
                {fechamento ? fmtPct(fechamento.margem_media) : '-'}
              </p>
              <p className="text-xs text-gray-400 mt-1">das OS com custo</p>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
            {([['resumo', 'Resumo Geral'], ['financeiro', 'Fechamento Financeiro'], ['clientes', 'Clientes']] as const).map(([aba, label]) => (
              <button key={aba} onClick={() => setAbaAtiva(aba)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                style={abaAtiva === aba
                  ? { background: 'white', color: '#e91e8c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: '#6b7280' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── ABA: Resumo Geral ── */}
          {abaAtiva === 'resumo' && (
            <div className="space-y-5">
              {/* OS por Status */}
              {resumoStatus.length > 0 && (
                <div className="jt-card">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">OS por Status</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {resumoStatus.map((s) => (
                      <div key={s.status} className="rounded-xl p-3 text-center"
                        style={{ background: `${STATUS_CORES[s.status] || '#666'}15`, border: `1px solid ${STATUS_CORES[s.status] || '#666'}30` }}>
                        <p className="text-2xl font-bold" style={{ color: STATUS_CORES[s.status] || '#666' }}>{s.total}</p>
                        <p className="text-xs font-medium text-gray-600 mt-0.5">{STATUS_LABELS[s.status] || s.status}</p>
                        {s.valor_total > 0 && <p className="text-xs text-gray-400 mt-0.5">{fmt(s.valor_total)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Faturamento por Mês */}
              <div className="jt-card">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Faturamento por Mes</h2>
                {faturamento.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Nenhum dado disponivel para o periodo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Mes</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">OS</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Entregues</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Faturamento</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {faturamento.map((f, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{formatarMes(f.mes)}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{f.total_os}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{f.os_entregues || 0}</td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: '#166534' }}>{fmt(f.total_faturado)}</td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              {f.total_lucro != null
                                ? <span style={{ color: (f.total_lucro || 0) >= 0 ? '#166534' : '#dc2626' }}>{fmt(f.total_lucro || 0)}</span>
                                : <span className="text-gray-300 text-xs">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'rgba(233,30,140,0.05)', borderTop: '2px solid rgba(233,30,140,0.15)' }}>
                          <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                          <td className="px-4 py-3 text-center font-bold text-gray-900">{totalOS}</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: '#e91e8c' }}>{fmt(totalFaturado)}</td>
                          <td className="px-4 py-3 text-right font-bold hidden sm:table-cell" style={{ color: '#166534' }}>{fmt(totalLucro)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ABA: Fechamento Financeiro ── */}
          {abaAtiva === 'financeiro' && (
            <div className="space-y-5">
              {!fechamento ? (
                <div className="jt-card text-center py-10 text-gray-400">
                  <p className="text-lg mb-2">Sem dados financeiros</p>
                  <p className="text-sm">Preencha os campos de custo nas OS para ver o fechamento financeiro.</p>
                </div>
              ) : (
                <>
                  {/* Cards financeiros principais */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="jt-card" style={{ borderLeft: '4px solid #00b4ff' }}>
                      <p className="text-xs text-gray-500 mb-1">Faturamento Bruto</p>
                      <p className="text-xl font-bold" style={{ color: '#00b4ff' }}>{fmt(fechamento.total_faturado)}</p>
                      <p className="text-xs text-gray-400">valor cobrado dos clientes</p>
                    </div>
                    <div className="jt-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                      <p className="text-xs text-gray-500 mb-1">Voce Recebe (liquido)</p>
                      <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>{fmt(fechamento.total_recebido)}</p>
                      <p className="text-xs text-gray-400">apos taxa maquininha</p>
                    </div>
                    <div className="jt-card col-span-2 sm:col-span-1" style={{ borderLeft: '4px solid #dc2626' }}>
                      <p className="text-xs text-gray-500 mb-1">Custo Total</p>
                      <p className="text-xl font-bold text-red-600">{fmt(fechamento.total_custo)}</p>
                      <p className="text-xs text-gray-400">pecas + servico + brinde</p>
                    </div>
                  </div>

                  {/* Resultado final */}
                  <div className="jt-card" style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.05), rgba(0,180,255,0.05))', border: '2px solid rgba(233,30,140,0.2)' }}>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Resultado do Periodo</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Faturamento bruto:</span><span className="font-medium">{fmt(fechamento.total_faturado)}</span>
                      </div>
                      {fechamento.total_taxa > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span>(-) Taxa maquininha:</span><span className="font-medium">- {fmt(fechamento.total_taxa)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Voce recebe:</span><span className="font-medium">{fmt(fechamento.total_recebido)}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>(-) Custo das pecas:</span>
                        <span className="font-medium">- {fmt(fechamento.custo_produtos)}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>(-) Custo dos servicos:</span>
                        <span className="font-medium">- {fmt(fechamento.custo_servicos)}</span>
                      </div>
                      {fechamento.total_brinde > 0 && (
                        <div className="flex justify-between text-pink-400">
                          <span>(-) Custo de brindes:</span>
                          <span className="font-medium">- {fmt(fechamento.total_brinde)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold pt-3" style={{ borderTop: '2px solid rgba(233,30,140,0.2)', color: fechamento.lucro_liquido >= 0 ? '#166534' : '#dc2626' }}>
                        <span>Lucro Liquido:</span>
                        <span>{fmt(fechamento.lucro_liquido)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold" style={{ color: '#7c3aed' }}>
                        <span>Margem media:</span>
                        <span>{fmtPct(fechamento.margem_media)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo Produtos vs Serviços */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Produtos */}
                    <div className="jt-card" style={{ border: '1px solid rgba(0,180,255,0.2)' }}>
                      <h3 className="font-semibold text-gray-800 mb-3" style={{ color: '#00b4ff' }}>Produtos / Pecas</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Faturado:</span><span className="font-medium">{fmt(fechamento.faturado_produtos)}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                          <span>Custo:</span><span className="font-medium">- {fmt(fechamento.custo_produtos)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid rgba(0,180,255,0.15)', color: fechamento.lucro_produtos >= 0 ? '#166534' : '#dc2626' }}>
                          <span>Lucro:</span><span>{fmt(fechamento.lucro_produtos)}</span>
                        </div>
                        {fechamento.faturado_produtos > 0 && (
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Margem:</span>
                            <span>{fmtPct((fechamento.lucro_produtos / fechamento.faturado_produtos) * 100)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Serviços */}
                    <div className="jt-card" style={{ border: '1px solid rgba(233,30,140,0.2)' }}>
                      <h3 className="font-semibold text-gray-800 mb-3" style={{ color: '#e91e8c' }}>Servicos / Mao de Obra</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Faturado:</span><span className="font-medium">{fmt(fechamento.faturado_servicos)}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                          <span>Custo:</span><span className="font-medium">- {fmt(fechamento.custo_servicos)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid rgba(233,30,140,0.15)', color: fechamento.lucro_servicos >= 0 ? '#166534' : '#dc2626' }}>
                          <span>Lucro:</span><span>{fmt(fechamento.lucro_servicos)}</span>
                        </div>
                        {fechamento.faturado_servicos > 0 && (
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Margem:</span>
                            <span>{fmtPct((fechamento.lucro_servicos / fechamento.faturado_servicos) * 100)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Baseado em {fechamento.total_os_com_dados} OS com dados financeiros preenchidos no periodo.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── ABA: Clientes ── */}
          {abaAtiva === 'clientes' && (
            <div className="jt-card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Top 10 Clientes</h2>
              {clientesRecorrentes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhum dado disponivel.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ background: '#f8f9fa' }}>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">WhatsApp</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">OS</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Gasto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {clientesRecorrentes.map((c, i) => (
                        <tr key={c.cliente_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#e5e7eb', color: i < 3 ? 'white' : '#6b7280', display: 'inline-flex' }}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <a href={`https://wa.me/55${c.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs" style={{ color: '#25d366' }}>
                              {c.telefone}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}>
                              {c.total_os}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: '#166534' }}>
                            {fmt(c.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
