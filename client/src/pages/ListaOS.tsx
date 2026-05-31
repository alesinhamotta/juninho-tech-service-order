// ============================================================================
// PÁGINA DE LISTA DE ORDENS DE SERVIÇO
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatarData, formatarMoeda, labelStatus, labelTipo } from '../lib/utils';

interface OS {
  id: string;
  numero_os: string;
  tipo: string;
  status: string;
  valor_final: number;
  data_criacao: string;
  clientes: { nome: string; telefone: string };
}

export default function ListaOS() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (busca) params.append('search', busca);
    if (filtroStatus) params.append('status', filtroStatus);

    api.get(`/os?${params.toString()}`)
      .then((res) => setOrdens(res.data.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [busca, filtroStatus]);

  const badgeStatus: Record<string, string> = {
    PENDENTE: 'badge-pendente',
    APROVADO: 'badge-aprovado',
    PAGO: 'badge-pago',
    CONCLUIDO: 'badge-concluido',
    CANCELADO: 'badge-cancelado',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
        <Link to="/os/nova" className="btn-primary">+ Nova OS</Link>
      </div>

      {/* Filtros */}
      <div className="card flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por número ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-field max-w-xs"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="input-field max-w-xs"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="PAGO">Pago</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : ordens.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma ordem de serviço encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nº OS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600">{os.numero_os}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{os.clientes?.nome}</div>
                    <div className="text-gray-400 text-xs">{os.clientes?.telefone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{labelTipo(os.tipo)}</td>
                  <td className="px-4 py-3">
                    <span className={badgeStatus[os.status] || 'badge-pendente'}>
                      {labelStatus(os.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatarMoeda(os.valor_final)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatarData(os.data_criacao)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/os/${os.id}`} className="text-blue-600 hover:underline text-xs">
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
