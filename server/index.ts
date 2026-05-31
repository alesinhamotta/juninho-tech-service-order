// ============================================================================
// SERVIDOR PRINCIPAL - JUNINHO.TECH Service Order System
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Rotas
import authRoutes from './routes/auth';
import clientesRoutes from './routes/clientes';
import produtosRoutes from './routes/produtos';
import osRoutes from './routes/os';
import relatoriosRoutes from './routes/relatorios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARES GLOBAIS
// ============================================================================

// Configuração de CORS
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROTAS DE SAÚDE E INFORMAÇÃO
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    sistema: '🔧 JUNINHO.TECH - Service Order System',
    versao: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      clientes: '/api/clientes',
      produtos: '/api/produtos',
      os: '/api/os',
      relatorios: '/api/relatorios',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// ROTAS DA API
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/os', osRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// ============================================================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ============================================================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro não tratado:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('🔧 ============================================');
  console.log('   JUNINHO.TECH - Service Order System');
  console.log('🔧 ============================================');
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
  console.log('🔧 ============================================');
  console.log('');
});

export default app;
