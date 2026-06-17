// ============================================================================
// CONTEXTO DE AUTENTICAÇÃO
// ============================================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface Usuario {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo no localStorage
    const tokenSalvo = localStorage.getItem('@juninho-tech:token');
    const usuarioSalvo = localStorage.getItem('@juninho-tech:usuario');

    if (tokenSalvo && usuarioSalvo) {
      setToken(tokenSalvo);
      setUsuario(JSON.parse(usuarioSalvo));
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenSalvo}`;
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha });
    const { token: novoToken, usuario: novoUsuario } = response.data;

    setToken(novoToken);
    setUsuario(novoUsuario);

    localStorage.setItem('@juninho-tech:token', novoToken);
    localStorage.setItem('@juninho-tech:usuario', JSON.stringify(novoUsuario));
    api.defaults.headers.common['Authorization'] = `Bearer ${novoToken}`;
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('@juninho-tech:token');
    localStorage.removeItem('@juninho-tech:usuario');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        isLoading,
        isAuthenticated: !!token && !!usuario,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
