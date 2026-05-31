// ============================================================================
// PÁGINA DE RELATÓRIOS
// ============================================================================

import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatarMoeda, formatarData } from '../lib/utils';

interface FaturamentoMes {
  mes: string;
  total_os: number;
  total_faturado: number;
  os_pagas: number;
}

interface ClienteRecorrente {
  cliente_id: string;
  nome: string;
  telefone: string;
  total_os: number;
  valor_total: number;
}

export default function Relatorios() {
  const [faturamento, setFaturamento] = useState<FaturamentoMes[]>([]);
  const [clientesRecorrentes, setClientesRecorrentes] = useState<ClienteRecorrente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/faturamento'),
      api.get('/relatorios/clientes-recorrentes'),
    ])
      .then(([fat, cli]) => {
        setFaturamento(fat.data.data || []);
        setClientesRecorrentes(cli.data.data || []);
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

      {carregando ? (
        <div className="card text-center text-gray-400 py-12">Carregando relatórios...</div>
      ) : (
        <>
          {/* Faturamento por Mês */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Faturamento por Mês</h2>
            {faturamento.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum dado disponível.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Mês</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Total OS</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">OS Pagas</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {faturamento.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{formatarData(f.mes)}</td>
                      <td className="px-4 py-2">{f.total_os}</td>
                      <td className="px-4 py-2">{f.os_pagas}</td>
                      <td className="px-4 py-2 font-medium text-green-700">{formatarMoeda(f.total_faturado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Clientes Recorrentes */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Clientes</h2>
            {clientesRecorrentes.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum dado disponível.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Telefone</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Total OS</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientesRecorrentes.map((c) => (
                    <tr key={c.cliente_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{c.nome}</td>
                      <td className="px-4 py-2 text-gray-500">{c.telefone}</td>
                      <td className="px-4 py-2">{c.total_os}</td>
                      <td className="px-4 py-2 font-medium text-green-700">{formatarMoeda(c.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
