const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MEI API está operacional',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
