const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const servicoRoutes = require('./routes/servicoRoutes');
const orcamentoRoutes = require('./routes/orcamentoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const cobrancaRoutes = require('./routes/cobrancaRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const assistenteRoutes = require('./routes/assistenteRoutes');
const notaFiscalRoutes = require('./routes/notaFiscalRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');
const configuracoesRoutes = require('./routes/configuracoesRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Tratamento amigável de payload grande demais (ex.: foto de nota fiscal)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ sucesso: false, mensagem: 'A imagem é grande demais. Envie uma foto menor (até 10MB).' });
  }
  return next(err);
});

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MEI API está operacional',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', authMiddleware, clienteRoutes);
app.use('/api/servicos', authMiddleware, servicoRoutes);
app.use('/api/orcamentos', authMiddleware, orcamentoRoutes);
app.use('/api/agendamentos', authMiddleware, agendamentoRoutes);
app.use('/api/cobrancas', authMiddleware, cobrancaRoutes);
app.use('/api/movimentacoes', authMiddleware, movimentacaoRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/assistente', authMiddleware, assistenteRoutes);
app.use('/api/notas-fiscais', authMiddleware, notaFiscalRoutes);
app.use('/api/estoque', authMiddleware, estoqueRoutes);
app.use('/api/configuracoes', authMiddleware, configuracoesRoutes);

module.exports = app;
