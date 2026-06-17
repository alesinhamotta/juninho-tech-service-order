import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoJT from '../assets/logo-juninho-tech.jpg';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/os', label: 'Ordens de Serviço', icon: '📋' },
  { path: '/os/nova', label: 'Nova OS', icon: '➕' },
  { path: '/clientes', label: 'Clientes', icon: '👥' },
  { path: '/produtos', label: 'Produtos / Peças', icon: '🔩' },
  { path: '/relatorios', label: 'Relatórios', icon: '📊' },
];

export default function Layout() {
  const location = useLocation();
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col shrink-0 transition-transform duration-300 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #111118 60%, #0d0d1a 100%)' }}
      >
        {/* Logo */}
        <div
          className="p-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <img
            src={logoJT}
            alt="Juninho Tech"
            className="w-10 h-10 rounded-full object-cover shrink-0"
            style={{ border: '1px solid rgba(233,30,140,0.4)', boxShadow: '0 0 10px rgba(233,30,140,0.3)' }}
          />
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">
              JUNINHO<span style={{ color: '#00b4ff' }}>.TECH</span>
            </h1>
            <p className="text-xs" style={{ color: '#666' }}>Sistema de OS</p>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const ativo = item.path === '/os/nova'
              ? location.pathname === '/os/nova'
              : item.path === '/os'
              ? location.pathname.startsWith('/os') && location.pathname !== '/os/nova'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuAberto(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={
                  ativo
                    ? {
                        background: 'linear-gradient(135deg, rgba(233,30,140,0.25), rgba(0,180,255,0.15))',
                        color: '#ffffff',
                        fontWeight: 600,
                        borderLeft: '3px solid #e91e8c',
                      }
                    : {
                        color: '#9ca3af',
                        borderLeft: '3px solid transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!ativo) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!ativo) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#9ca3af';
                  }
                }}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divisor */}
        <div className="mx-4" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Usuário */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #00b4ff)' }}
            >
              {usuario?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nome}</p>
              <p className="text-xs truncate" style={{ color: '#666' }}>{usuario?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-xs transition-colors px-1 py-1"
            style={{ color: '#666' }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#e91e8c')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#666')}
          >
            ← Sair do sistema
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 shadow-sm"
          style={{ background: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setMenuAberto(true)}
            className="text-white p-1"
          >
            ☰
          </button>
          <span className="font-bold text-white text-sm">
            JUNINHO<span style={{ color: '#00b4ff' }}>.TECH</span>
          </span>
          <div className="w-7" />
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
