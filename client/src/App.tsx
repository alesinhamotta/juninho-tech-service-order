// ============================================================================
// APP PRINCIPAL - Roteamento e Provedores
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListaOS from './pages/ListaOS';
import NovaOS from './pages/NovaOS';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import DetalhesOS from './pages/DetalhesOS';

// Layout
import Layout from './components/Layout';

// Rota protegida: redireciona para login se não autenticado
function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas com layout */}
      <Route
        path="/"
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="os" element={<ListaOS />} />
        <Route path="os/nova" element={<NovaOS />} />
        <Route path="os/:id" element={<DetalhesOS />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="relatorios" element={<Relatorios />} />
      </Route>

      {/* Rota não encontrada */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
