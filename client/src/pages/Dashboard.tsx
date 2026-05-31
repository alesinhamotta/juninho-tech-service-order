// ============================================================================
// PÁGINA DE DASHBOARD
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatarMoeda } from '../lib/utils';

interface ResumoOS {
  total: number;
  pendentes: number;
  concluidas: number;
  pagas: number;
}

export default function Dashboard() {
  const [resumo, setResumo] = useState<ResumoOS | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/relatorios/os-resumo')
      .then((res) => setResumo(res.data.data))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
        </div>
        <Link to="/os/nova" className="btn-primary flex items-center gap-2">
          <span>+</span> Nova OS
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total de OS</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {carregando ? '...' : resumo?.total || 0}
          </p>
        </div>
        <div className="card border-l-4 border-l-yellow-400">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {carregando ? '...' : resumo?.pendentes || 0}
          </p>
        </div>
        <div className="card border-l-4 border-l-green-400">
          <p className="text-sm text-gray-500">Pagas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {carregando ? '...' : resumo?.pagas || 0}
          </p>
        </div>
        <div className="card border-l-4 border-l-purple-400">
          <p className="text-sm text-gray-500">Concluídas</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {carregando ? '...' : resumo?.concluidas || 0}
          </p>
        </div>
      </div>

      {/* Atalhos Rápidos */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Atalhos Rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/os/nova"
            className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl mb-2">📋</span>
            <span className="text-sm font-medium text-blue-700">Nova OS</span>
          </Link>
          <Link
            to="/clientes"
            className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl mb-2">👥</span>
            <span className="text-sm font-medium text-green-700">Clientes</span>
          </Link>
          <Link
            to="/produtos"
            className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl mb-2">🔩</span>
            <span className="text-sm font-medium text-orange-700">Produtos</span>
          </Link>
          <Link
            to="/relatorios"
            className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-purple-700">Relatórios</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
