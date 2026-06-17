import { useEffect, useState } from 'react';
import api from '../lib/api';

interface FaturamentoMes {
  mes: string;
  total_os: number;
  total_faturado: number;
  os_entregues: number;
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

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatarMes(mes: string) {
  if (!mes) return '-';
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[parseInt(m) - 1]}/${ano}`;
}

function getHoje() {
  return new Date().toISOString().split('T')[0];
}

function getPrimeiroDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

function getPrimeiroDiaAno() {
  return `${new Date().getFullYear()}-01-01`;
}

const STATUS_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_PECA: 'Aguard. Peça',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  SEM_SOLUCAO: 'Sem Solução',
  ORCAMENTO_NEGADO: 'Orç. Negado',
};

const STATUS_CORES: Record<string, string> = {
  ABERTA: '#2563eb',
  EM_ANDAMENTO: '#ea580c',
  AGUARDANDO_PECA: '#7c3aed',
  PRONTO: '#854d0e',
  ENTREGUE: '#166534',
  SEM_SOLUCAO: '#991b1b',
  ORCAMENTO_NEGADO: '#374151',
};

export default function Relatorios() {
  const [faturamento, setFaturamento] = useState<FaturamentoMes[]>([]);
  const [clientesRecorrentes, setClientesRecorrentes] = useState<ClienteRecorrente[]>([]);
  const [resumoStatus, setResumoStatus] = useState<ResumoStatus[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaAno());
  const [dataFim, setDataFim] = useState(getHoje());

  const carregarRelatorios = () => {
    setCarregando(true);
    const params = `data_inicio=${dataInicio}&data_fim=${dataFim}`;
    Promise.all([
      api.get(`/relatorios/faturamento?${params}`),
      api.get(`/relatorios/clientes-recorrentes?${params}`),
      api.get(`/relatorios/por-status?${params}`),
    ])
      .then(([fat, cli, status]) => {
        setFaturamento(fat.data.data || fat.data || []);
        setClientesRecorrentes(cli.data.data || cli.data || []);
        setResumoStatus(status.data.data || status.data || []);
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
        <h1 className="text-2xl font-bold text-gray-900">📊 Relatórios</h1>
        <p className="text-gray-500 text-sm mt-0.5">Análise de desempenho da assistência técnica</p>
      </div>

      {/* Filtro de período */}
      <div className="jt-card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="label">Data inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Data final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setDataInicio(getPrimeiroDiaMes()); setDataFim(getHoje()); }}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Este mês
            </button>
            <button
              onClick={() => { setDataInicio(getPrimeiroDiaAno()); setDataFim(getHoje()); }}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Este ano
            </button>
            <button onClick={carregarRelatorios} className="btn-jt py-2 px-4 text-sm">
              📊 Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="jt-card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>Carregando relatórios...</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #e91e8c' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Total de OS</p>
              <p className="text-3xl font-bold" style={{ color: '#e91e8c' }}>{totalOS}</p>
              <p className="text-xs text-gray-400 mt-1">no período</p>
            </div>
            <div className="jt-card text-center" style={{ borderLeft: '4px solid #00b4ff' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold" style={{ color: '#00b4ff' }}>{formatarMoeda(totalFaturado)}</p>
              <p className="text-xs text-gray-400 mt-1">OS entregues</p>
            </div>
            <div className="jt-card text-center col-span-2 sm:col-span-1" style={{ borderLeft: '4px solid #166534' }}>
              <p className="text-xs text-gray-500 font-medium mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold" style={{ color: '#166534' }}>
                {totalOS > 0 ? formatarMoeda(totalFaturado / totalOS) : 'R$ 0,00'}
              </p>
              <p className="text-xs text-gray-400 mt-1">por OS</p>
            </div>
          </div>

          {/* OS por Status */}
          {resumoStatus.length > 0 && (
            <div className="jt-card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">📋 OS por Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {resumoStatus.map((s) => (
                  <div
                    key={s.status}
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: `${STATUS_CORES[s.status] || '#666'}15`,
                      border: `1px solid ${STATUS_CORES[s.status] || '#666'}30`,
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: STATUS_CORES[s.status] || '#666' }}>
                      {s.total}
                    </p>
                    <p className="text-xs font-medium text-gray-600 mt-0.5">
                      {STATUS_LABELS[s.status] || s.status}
                    </p>
                    {s.valor_total > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatarMoeda(s.valor_total)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faturamento por Mês */}
          <div className="jt-card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">💰 Faturamento por Mês</h2>
            {faturamento.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nenhum dado disponível para o período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Mês</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Total OS</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Entregues</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {faturamento.map((f, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{formatarMes(f.mes)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{f.total_os}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{f.os_entregues || 0}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: '#166534' }}>
                          {formatarMoeda(f.total_faturado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(233,30,140,0.05)', borderTop: '2px solid rgba(233,30,140,0.15)' }}>
                      <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{totalOS}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: '#e91e8c' }}>
                        {formatarMoeda(totalFaturado)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Top Clientes */}
          <div className="jt-card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">🏆 Top 10 Clientes</h2>
            {clientesRecorrentes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nenhum dado disponível.</p>
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
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{
                              background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#e5e7eb',
                              color: i < 3 ? 'white' : '#6b7280',
                              display: 'inline-flex',
                            }}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <a
                            href={`https://wa.me/55${c.telefone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs"
                            style={{ color: '#25d366' }}
                          >
                            📱 {c.telefone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}
                          >
                            {c.total_os}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: '#166534' }}>
                          {formatarMoeda(c.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
