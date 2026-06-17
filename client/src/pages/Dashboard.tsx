import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface ResumoOS {
  total: number;
  abertas: number;
  em_andamento: number;
  prontas: number;
  entregues: number;
  sem_solucao: number;
  orcamento_negado: number;
  faturamento_total: number;
}

interface OSRecente {
  id: string;
  numero_os: number;
  cliente_nome: string;
  aparelho_marca: string;
  aparelho_modelo: string;
  status: string;
  data_criacao: string;
  valor_final: number;
}

const STATUS_CONFIG: Record<string, { label: string; classe: string }> = {
  ABERTA:           { label: 'Aberta',           classe: 'status-aberta' },
  EM_ANDAMENTO:     { label: 'Em Andamento',      classe: 'status-em-andamento' },
  AGUARDANDO_PECA:  { label: 'Aguard. Peça',      classe: 'status-aguardando-peca' },
  PRONTO:           { label: 'Pronto',            classe: 'status-pronto' },
  ENTREGUE:         { label: 'Entregue ✓',        classe: 'status-entregue' },
  SEM_SOLUCAO:      { label: 'Sem Solução',        classe: 'status-sem-solucao' },
  ORCAMENTO_NEGADO: { label: 'Orç. Negado',       classe: 'status-orcamento-negado' },
};

const ROW_CLASS: Record<string, string> = {
  PRONTO: 'row-pronto',
  ENTREGUE: 'row-entregue',
  SEM_SOLUCAO: 'row-sem-solucao',
  ORCAMENTO_NEGADO: 'row-orcamento-negado',
};

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatarData(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

function getHoje() {
  return new Date().toISOString().split('T')[0];
}

function getPrimeiroDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export default function Dashboard() {
  const [resumo, setResumo] = useState<ResumoOS | null>(null);
  const [osRecentes, setOsRecentes] = useState<OSRecente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getHoje());
  const [periodoAtivo, setPeriodoAtivo] = useState<'hoje' | 'mes' | 'custom'>('mes');

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resumoRes, osRes] = await Promise.all([
        api.get(`/relatorios/os-resumo?data_inicio=${dataInicio}&data_fim=${dataFim}`),
        api.get(`/os?data_inicio=${dataInicio}&data_fim=${dataFim}&limit=10`),
      ]);
      setResumo(resumoRes.data.data || resumoRes.data);
      setOsRecentes(osRes.data.data || osRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarDados(); }, [dataInicio, dataFim]);

  const selecionarPeriodo = (tipo: 'hoje' | 'mes') => {
    setPeriodoAtivo(tipo);
    if (tipo === 'hoje') {
      setDataInicio(getHoje());
      setDataFim(getHoje());
    } else {
      setDataInicio(getPrimeiroDiaMes());
      setDataFim(getHoje());
    }
  };

  const cards = [
    { label: 'Total de OS', valor: resumo?.total || 0, cor: '#6366f1', bg: '#eef2ff', icon: '📋' },
    { label: 'Abertas', valor: resumo?.abertas || 0, cor: '#2563eb', bg: '#dbeafe', icon: '🔵' },
    { label: 'Em Andamento', valor: resumo?.em_andamento || 0, cor: '#ea580c', bg: '#ffedd5', icon: '🔧' },
    { label: 'Prontas (não retiradas)', valor: resumo?.prontas || 0, cor: '#854d0e', bg: '#fef9c3', icon: '🟡' },
    { label: 'Entregues', valor: resumo?.entregues || 0, cor: '#166534', bg: '#dcfce7', icon: '✅' },
    { label: 'Sem Solução', valor: resumo?.sem_solucao || 0, cor: '#991b1b', bg: '#fee2e2', icon: '🔴' },
    { label: 'Orç. Negado', valor: resumo?.orcamento_negado || 0, cor: '#374151', bg: '#f3f4f6', icon: '⚫' },
    { label: 'Faturamento', valor: formatarMoeda(resumo?.faturamento_total || 0), cor: '#065f46', bg: '#d1fae5', icon: '💰', isMonetary: true },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão geral das Ordens de Serviço</p>
        </div>
        <Link
          to="/os/nova"
          className="btn-jt flex items-center gap-2 self-start sm:self-auto"
        >
          ➕ Nova OS
        </Link>
      </div>

      {/* Filtro de período */}
      <div className="jt-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">📅 Período:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => selecionarPeriodo('hoje')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodoAtivo === 'hoje'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={periodoAtivo === 'hoje' ? { background: 'linear-gradient(135deg, #e91e8c, #00b4ff)' } : {}}
            >
              Hoje
            </button>
            <button
              onClick={() => selecionarPeriodo('mes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                periodoAtivo === 'mes'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={periodoAtivo === 'mes' ? { background: 'linear-gradient(135deg, #e91e8c, #00b4ff)' } : {}}
            >
              Este mês
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">De:</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setPeriodoAtivo('custom'); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#e91e8c' } as React.CSSProperties}
            />
            <span className="text-sm text-gray-500">Até:</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setPeriodoAtivo('custom'); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
            />
            <button onClick={carregarDados} className="btn-jt py-1.5 px-3 text-sm">
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            style={{ borderLeft: `4px solid ${card.cor}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 font-medium leading-tight">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: card.cor }}
            >
              {carregando ? '...' : card.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <div className="jt-card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">⚡ Atalhos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/os/nova', icon: '📋', label: 'Nova OS', cor: '#e91e8c', bg: 'rgba(233,30,140,0.08)' },
            { to: '/clientes', icon: '👥', label: 'Clientes', cor: '#00b4ff', bg: 'rgba(0,180,255,0.08)' },
            { to: '/produtos', icon: '🔩', label: 'Produtos', cor: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
            { to: '/relatorios', icon: '📊', label: 'Relatórios', cor: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center p-4 rounded-xl transition-all hover:shadow-md text-center"
              style={{ background: item.bg, border: `1px solid ${item.cor}22` }}
            >
              <span className="text-2xl mb-2">{item.icon}</span>
              <span className="text-sm font-semibold" style={{ color: item.cor }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tabela de OS recentes */}
      <div className="jt-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">📋 OS do Período</h2>
          <Link to="/os" className="text-sm font-medium" style={{ color: '#e91e8c' }}>
            Ver todas →
          </Link>
        </div>

        {carregando ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : osRecentes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>Nenhuma OS encontrada neste período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">OS#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Aparelho</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Data</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Valor</th>
                </tr>
              </thead>
              <tbody>
                {osRecentes.map((os) => {
                  const statusCfg = STATUS_CONFIG[os.status] || { label: os.status, classe: '' };
                  const rowClass = ROW_CLASS[os.status] || '';
                  return (
                    <tr
                      key={os.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${rowClass}`}
                    >
                      <td className="py-2.5 px-3">
                        <Link
                          to={`/os/${os.id}`}
                          className="font-bold"
                          style={{ color: '#e91e8c' }}
                        >
                          #{String(os.numero_os).padStart(4, '0')}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{os.cliente_nome}</td>
                      <td className="py-2.5 px-3 text-gray-600 hidden sm:table-cell">
                        {os.aparelho_marca} {os.aparelho_modelo}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`status-badge ${statusCfg.classe}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 hidden md:table-cell">{formatarData(os.data_criacao)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-700 hidden md:table-cell">
                        {os.valor_final ? formatarMoeda(os.valor_final) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
