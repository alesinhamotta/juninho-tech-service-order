// ============================================================================
// COMPONENTE DE LAYOUT PRINCIPAL - Sidebar + Conteúdo
// ============================================================================

import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/os', label: 'Ordens de Serviço', icon: '📋' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/produtos', label: 'Produtos / Peças', icon: '🔩' },
  { path: '/relatorios', label: 'Relatórios', icon: '📊' },
];

export default function Layout() {
  const location = useLocation();
  const { usuario, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <h1 className="font-bold text-white text-sm">JUNINHO.TECH</h1>
              <p className="text-slate-400 text-xs">Sistema de OS</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const ativo = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  ativo
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuário */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {usuario?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nome}</p>
              <p className="text-xs text-slate-400 truncate">{usuario?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-xs text-slate-400 hover:text-white transition-colors px-1 py-1"
          >
            Sair do sistema →
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
