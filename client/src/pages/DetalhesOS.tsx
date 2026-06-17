import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { gerarPDFOS } from '../lib/pdfOS';

interface OS {
  id: string;
  numero_os: number;
  status: string;
  aparelho_marca: string;
  aparelho_modelo: string;
  aparelho_cor?: string;
  aparelho_imei?: string;
  acessorios?: string;
  problema_descrito?: string;
  diagnostico?: string;
  servico_realizado?: string;
  garantia_dias: number;
  leva_traz: boolean;
  endereco_coleta?: string;
  valor_pecas: number;
  valor_servico: number;
  valor_final: number;
  data_criacao: string;
  data_conclusao?: string;
  data_entrega?: string;
  observacoes?: string;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  itens?: Array<{
    id: string;
    descricao_manual: string;
    quantidade: number;
    preco_unitario: number;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; classe: string; cor: string }> = {
  ABERTA:           { label: 'Aberta',           classe: 'status-aberta',           cor: '#2563eb' },
  EM_ANDAMENTO:     { label: 'Em Andamento',      classe: 'status-em-andamento',     cor: '#ea580c' },
  AGUARDANDO_PECA:  { label: 'Aguard. Peça',      classe: 'status-aguardando-peca',  cor: '#7c3aed' },
  PRONTO:           { label: 'Pronto',            classe: 'status-pronto',           cor: '#854d0e' },
  ENTREGUE:         { label: 'Entregue ✓',        classe: 'status-entregue',         cor: '#166534' },
  SEM_SOLUCAO:      { label: 'Sem Solução',        classe: 'status-sem-solucao',      cor: '#991b1b' },
  ORCAMENTO_NEGADO: { label: 'Orç. Negado',       classe: 'status-orcamento-negado', cor: '#374151' },
};

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatarData(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function DetalhesOS() {
  const { id } = useParams<{ id: string }>();
  const [os, setOs] = useState<OS | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoStatus, setNovoStatus] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [camposEdicao, setCamposEdicao] = useState({
    diagnostico: '',
    servico_realizado: '',
    valor_servico: '',
    observacoes: '',
  });

  const carregarOS = () => {
    setCarregando(true);
    api.get(`/os/${id}`)
      .then((res) => {
        const data = res.data.data || res.data;
        setOs(data);
        setNovoStatus(data.status);
        setCamposEdicao({
          diagnostico: data.diagnostico || '',
          servico_realizado: data.servico_realizado || '',
          valor_servico: String(data.valor_servico || ''),
          observacoes: data.observacoes || '',
        });
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarOS(); }, [id]);

  const handleAtualizarStatus = async () => {
    if (!novoStatus || novoStatus === os?.status) return;
    setAtualizando(true);
    try {
      await api.patch(`/os/${id}/status`, { status: novoStatus });
      carregarOS();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar status.');
    } finally {
      setAtualizando(false);
    }
  };

  const handleSalvarEdicao = async () => {
    setAtualizando(true);
    try {
      await api.put(`/os/${id}`, {
        ...camposEdicao,
        valor_servico: parseFloat(camposEdicao.valor_servico) || 0,
      });
      setEditando(false);
      carregarOS();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar alterações.');
    } finally {
      setAtualizando(false);
    }
  };

  const handleGerarPDF = () => {
    if (!os) return;
    gerarPDFOS(os);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Carregando OS...</p>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-gray-500">OS não encontrada.</p>
        <Link to="/os" className="btn-jt mt-4 inline-block">Voltar à lista</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[os.status] || { label: os.status, classe: '', cor: '#666' };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/os" className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</Link>
            <h1 className="text-2xl font-bold text-gray-900">
              OS <span style={{ color: '#e91e8c' }}>#{String(os.numero_os).padStart(4, '0')}</span>
            </h1>
            <span className={`status-badge ${statusCfg.classe}`}>{statusCfg.label}</span>
            {os.leva_traz && <span className="text-sm">🚗 Leva e Traz</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">Aberta em {formatarData(os.data_criacao)}</p>
        </div>
        <button onClick={handleGerarPDF} className="btn-jt self-start sm:self-auto">
          📄 Gerar PDF
        </button>
      </div>

      {/* Alterar Status */}
      <div
        className="jt-card"
        style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.04), rgba(0,180,255,0.04))', border: '1px solid rgba(233,30,140,0.12)' }}
      >
        <h2 className="section-title">🔄 Alterar Status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <button
              key={val}
              onClick={() => setNovoStatus(val)}
              className={`status-badge ${cfg.classe} cursor-pointer transition-all ${
                novoStatus === val ? 'ring-2 ring-offset-1 ring-gray-400 scale-105' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        {novoStatus !== os.status && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-sm text-gray-600">
              Alterar para: <strong>{STATUS_CONFIG[novoStatus]?.label}</strong>
            </p>
            <button
              onClick={handleAtualizarStatus}
              disabled={atualizando}
              className="btn-jt py-1.5 px-4 text-sm"
            >
              {atualizando ? 'Salvando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setNovoStatus(os.status)}
              className="btn-secondary py-1.5 px-4 text-sm"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Dados do cliente */}
      <div className="jt-card">
        <h2 className="section-title">👤 Cliente</h2>
        {os.cliente ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Nome</p>
              <p className="font-semibold text-gray-900">{os.cliente.nome}</p>
            </div>
            <div>
              <p className="text-gray-500">WhatsApp</p>
              <a
                href={`https://wa.me/55${os.cliente.telefone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold"
                style={{ color: '#25d366' }}
              >
                📱 {os.cliente.telefone}
              </a>
            </div>
            {os.cliente.email && (
              <div>
                <p className="text-gray-500">Email</p>
                <p className="text-gray-800">{os.cliente.email}</p>
              </div>
            )}
            {os.leva_traz && os.endereco_coleta && (
              <div className="sm:col-span-2">
                <p className="text-gray-500">Endereço de coleta</p>
                <p className="text-gray-800">🚗 {os.endereco_coleta}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Dados do cliente não disponíveis.</p>
        )}
      </div>

      {/* Dados do aparelho */}
      <div className="jt-card">
        <h2 className="section-title">📱 Aparelho</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Marca</p>
            <p className="font-semibold text-gray-900">{os.aparelho_marca}</p>
          </div>
          <div>
            <p className="text-gray-500">Modelo</p>
            <p className="font-semibold text-gray-900">{os.aparelho_modelo}</p>
          </div>
          {os.aparelho_cor && (
            <div>
              <p className="text-gray-500">Cor</p>
              <p className="text-gray-800">{os.aparelho_cor}</p>
            </div>
          )}
          {os.aparelho_imei && (
            <div>
              <p className="text-gray-500">IMEI / Série</p>
              <p className="text-gray-800 font-mono text-xs">{os.aparelho_imei}</p>
            </div>
          )}
          {os.acessorios && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-gray-500">Acessórios entregues</p>
              <p className="text-gray-800">{os.acessorios}</p>
            </div>
          )}
        </div>
      </div>

      {/* Serviço */}
      <div className="jt-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">🔧 Serviço</h2>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(0,180,255,0.1)', color: '#00b4ff' }}
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {!editando ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Problema relatado</p>
              <p className="text-gray-900 mt-0.5">{os.problema_descrito || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Diagnóstico técnico</p>
              <p className="text-gray-900 mt-0.5">{os.diagnostico || <span className="text-gray-400 italic">Não preenchido</span>}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Serviço realizado</p>
              <p className="text-gray-900 mt-0.5">{os.servico_realizado || <span className="text-gray-400 italic">Não preenchido</span>}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-gray-500 font-medium">Garantia</p>
                <p className="text-gray-900">{os.garantia_dias > 0 ? `${os.garantia_dias} dias` : 'Sem garantia'}</p>
              </div>
              {os.observacoes && (
                <div>
                  <p className="text-gray-500 font-medium">Observações</p>
                  <p className="text-gray-900">{os.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Diagnóstico técnico</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={camposEdicao.diagnostico}
                onChange={(e) => setCamposEdicao({ ...camposEdicao, diagnostico: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Serviço realizado</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={camposEdicao.servico_realizado}
                onChange={(e) => setCamposEdicao({ ...camposEdicao, servico_realizado: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Valor do serviço / mão de obra (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field max-w-xs"
                value={camposEdicao.valor_servico}
                onChange={(e) => setCamposEdicao({ ...camposEdicao, valor_servico: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Observações internas</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={camposEdicao.observacoes}
                onChange={(e) => setCamposEdicao({ ...camposEdicao, observacoes: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSalvarEdicao} disabled={atualizando} className="btn-jt">
                {atualizando ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditando(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Peças / Itens */}
      {os.itens && os.itens.length > 0 && (
        <div className="jt-card">
          <h2 className="section-title">🔩 Peças e Materiais</h2>
          <div className="space-y-2">
            {os.itens.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.descricao_manual}</p>
                  <p className="text-xs text-gray-400">Qtd: {item.quantidade} × {formatarMoeda(item.preco_unitario)}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: '#166534' }}>
                  {formatarMoeda(item.quantidade * item.preco_unitario)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valores */}
      <div
        className="jt-card"
        style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.05), rgba(0,180,255,0.05))', border: '1px solid rgba(233,30,140,0.15)' }}
      >
        <h2 className="section-title">💰 Valores</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Peças e materiais:</span>
            <span className="font-medium">{formatarMoeda(os.valor_pecas)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Mão de obra / serviço:</span>
            <span className="font-medium">{formatarMoeda(os.valor_servico)}</span>
          </div>
          <div
            className="flex justify-between text-lg font-bold pt-2"
            style={{ borderTop: '2px solid rgba(233,30,140,0.2)', color: '#e91e8c' }}
          >
            <span>Total:</span>
            <span>{formatarMoeda(os.valor_final)}</span>
          </div>
        </div>
      </div>

      {/* Botão PDF */}
      <div className="flex gap-3 justify-end pb-6">
        <Link to="/os" className="btn-secondary">← Voltar à lista</Link>
        <button onClick={handleGerarPDF} className="btn-jt">
          📄 Gerar PDF da OS
        </button>
      </div>
    </div>
  );
}
