import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoJT from '../assets/logo-juninho-tech.jpg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/dashboard');
    } catch (error: any) {
      setErro(error.response?.data?.error || 'E-mail ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #0d0d1a 100%)' }}
    >
      {/* Efeitos de brilho de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(233,30,140,0.15), transparent)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,180,255,0.15), transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #e91e8c, #00b4ff, transparent)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Logo e título */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <img
                src={logoJT}
                alt="Juninho Tech"
                className="w-28 h-28 rounded-full object-cover"
                style={{
                  boxShadow: '0 0 30px rgba(233,30,140,0.5), 0 0 60px rgba(0,180,255,0.3)',
                  border: '2px solid rgba(233,30,140,0.4)',
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              JUNINHO<span style={{ color: '#00b4ff' }}>.TECH</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Sistema de Ordem de Serviço</p>
            <div
              className="mt-3 h-px w-24"
              style={{ background: 'linear-gradient(90deg, transparent, #e91e8c, #00b4ff, transparent)' }}
            />
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#a0aec0' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#e91e8c';
                  e.target.style.boxShadow = '0 0 0 2px rgba(233,30,140,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#a0aec0' }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#e91e8c';
                  e.target.style.boxShadow = '0 0 0 2px rgba(233,30,140,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {erro && (
              <div
                className="text-sm px-4 py-3 rounded-lg"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5',
                }}
              >
                ⚠️ {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: carregando
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #e91e8c, #00b4ff)',
                boxShadow: carregando ? 'none' : '0 4px 20px rgba(233,30,140,0.4)',
              }}
            >
              {carregando ? '⏳ Entrando...' : '🔐 Entrar no Sistema'}
            </button>
          </form>

          {/* Rodapé */}
          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-gray-600 text-xs">Técnico Especializado • Since 2012</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a
                href="https://wa.me/5521973468654"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-green-400 text-xs transition-colors"
              >
                📱 WhatsApp
              </a>
              <span className="text-gray-700">•</span>
              <a
                href="https://instagram.com/juninho.tech"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 hover:text-pink-400 text-xs transition-colors"
              >
                📸 @juninho.tech
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
