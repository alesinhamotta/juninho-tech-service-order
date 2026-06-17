import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface OS {
  id: string;
  numero_os: number;
  status: string;
  valor_final: number;
  data_criacao: string;
  aparelho_marca: string;
  aparelho_modelo: string;
  leva_traz: boolean;
  cliente_nome?: string;
  cliente_telefone?: string;
  clientes?: { nome: string; telefone: string };
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

export default function ListaOS() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getHoje());
  const [usarFiltroData, setUsarFiltroData] = useState(false);

  const carregarOS = useCallback(() => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set('search', busca);
    if (filtroStatus) params.set('status', filtroStatus);
    if (usarFiltroData) {
      params.set('data_inicio', dataInicio);
      params.set('data_fim', dataFim);
    }
    api.get(`/os?${params}`)
      .then((res) => setOrdens(res.data.data || res.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [busca, filtroStatus, dataInicio, dataFim, usarFiltroData]);

  useEffect(() => {
    const t = setTimeout(carregarOS, 300);
    return () => clearTimeout(t);
  }, [carregarOS]);

  const getNomeCliente = (os: OS) => os.cliente_nome || os.clientes?.nome || '-';
  const getTelCliente = (os: OS) => os.cliente_telefone || os.clientes?.telefone || '';

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Ordens de Serviço</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie todas as OS da assistência técnica</p>
        </div>
        <Link to="/os/nova" className="btn-jt self-start sm:self-auto">
          ➕ Nova OS
        </Link>
      </div>

      {/* Filtros */}
      <div className="jt-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="🔍  Buscar por cliente, OS# ou aparelho..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-field flex-1"
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field sm:w-52"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Filtro de data */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usarFiltroData}
              onChange={(e) => setUsarFiltroData(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#e91e8c' }}
            />
            <span className="text-sm text-gray-600 font-medium">Filtrar por período</span>
          </label>
          {usarFiltroData && (
            <>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input-field"
                style={{ width: 'auto' }}
              />
              <span className="text-sm text-gray-500">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input-field"
                style={{ width: 'auto' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Legenda de status */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
          <button
            key={val}
            onClick={() => setFiltroStatus(filtroStatus === val ? '' : val)}
            className={`status-badge ${cfg.classe} cursor-pointer transition-all ${
              filtroStatus === val ? 'ring-2 ring-offset-1 ring-gray-400' : ''
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="jt-card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-gray-400">Carregando ordens de serviço...</div>
        ) : ordens.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>Nenhuma OS encontrada com os filtros selecionados.</p>
            <Link to="/os/nova" className="btn-jt mt-4 inline-block">Criar primeira OS</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8f9fa' }}>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">OS#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Aparelho</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Valor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordens.map((os) => {
                  const statusCfg = STATUS_CONFIG[os.status] || { label: os.status, classe: '' };
                  return (
                    <tr key={os.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: '#e91e8c' }}>
                          #{String(os.numero_os).padStart(4, '0')}
                        </span>
                        {os.leva_traz && (
                          <span className="ml-1 text-xs" title="Leva e Traz">🚗</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{getNomeCliente(os)}</p>
                        <p className="text-xs text-gray-400">{getTelCliente(os)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {os.aparelho_marca} {os.aparelho_modelo}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${statusCfg.classe}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 hidden md:table-cell">
                        {os.valor_final ? formatarMoeda(os.valor_final) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {formatarData(os.data_criacao)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/os/${os.id}`}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contador */}
      {!carregando && ordens.length > 0 && (
        <p className="text-sm text-gray-400 text-right">
          {ordens.length} ordem(ns) encontrada(s)
        </p>
      )}
    </div>
  );
}
