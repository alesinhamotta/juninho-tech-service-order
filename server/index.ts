// ============================================================================
// SERVIDOR PRINCIPAL - JUNINHO.TECH Service Order System
// ============================================================================

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Rotas
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import produtosRoutes from './routes/produtos.js';
import osRoutes from './routes/os.js';
import relatoriosRoutes from './routes/relatorios.js';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// ============================================================================
// MIDDLEWARES GLOBAIS
// ============================================================================

const corsOrigin = process.env['CORS_ORIGIN'];
const corsOrigins = corsOrigin
  ? corsOrigin.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROTAS DE SAÚDE
// ============================================================================

app.get('/', (_req: Request, res: Response) => {
  res.json({
    sistema: 'JUNINHO.TECH - Service Order System',
    versao: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
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
// TRATAMENTO DE ERROS
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro nao tratado:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} nao encontrada` });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log('JUNINHO.TECH - Service Order System iniciado');
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;
