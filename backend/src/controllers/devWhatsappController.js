const whatsappService = require('../services/whatsappService');

const devWhatsappController = {
  /**
   * Retorna o status administrativo completo do WhatsApp (inclui qrCode se pendente).
   */
  async obterStatus(req, res) {
    try {
      let statusAdmin = whatsappService.obterStatus(true);
      if (!statusAdmin.conectado && !statusAdmin.qrCode && process.env.NODE_ENV !== 'test') {
        statusAdmin = await whatsappService.gerarNovoQrCode();
      }
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status administrativo do WhatsApp obtido com sucesso',
        dados: {
          ...statusAdmin,
          qrCodeUrl: statusAdmin.qrCode
            ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(statusAdmin.qrCode)}`
            : null
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter status administrativo do WhatsApp'
      });
    }
  },

  /**
   * Força a reinicialização da sessão do Gateway Baileys e gera um novo QR Code.
   */
  async resetarSessao(req, res) {
    try {
      const novoStatus = await whatsappService.gerarNovoQrCode();
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Sessão do WhatsApp reiniciada com sucesso. Um novo QR Code foi gerado.',
        dados: {
          ...novoStatus,
          qrCodeUrl: novoStatus.qrCode
            ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(novoStatus.qrCode)}`
            : null
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao reiniciar sessão do WhatsApp'
      });
    }
  },

  /**
   * Visualização amigável em HTML ou JSON do QR Code para desenvolvedores.
   * Permite que o desenvolvedor abra diretamente no navegador para escanear com o celular.
   */
  async visualizarQrCode(req, res) {
    try {
      let statusAdmin = whatsappService.obterStatus(true);
      if (!statusAdmin.conectado && !statusAdmin.qrCode && process.env.NODE_ENV !== 'test') {
        statusAdmin = await whatsappService.gerarNovoQrCode();
      }
      const querHtml =
        req.query.format === 'html' ||
        (req.headers.accept && req.headers.accept.includes('text/html') && req.query.format !== 'json');

      const qrCodeUrl = statusAdmin.qrCode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(statusAdmin.qrCode)}`
        : null;

      if (!querHtml) {
        return res.status(200).json({
          sucesso: true,
          dados: {
            ...statusAdmin,
            qrCodeUrl
          }
        });
      }

      // Renderização da interface web segura para desenvolvedores
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aranduê — Gateway WhatsApp (Dev)</title>
  ${!statusAdmin.conectado ? '<meta http-equiv="refresh" content="12">' : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1.25rem;
      max-width: 480px;
      width: 100%;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .badge-success { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .badge-waiting { background: #78350f; color: #fde68a; border: 1px solid #d97706; }
    .badge-disconnected { background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p.desc { font-size: 0.9rem; color: #94a3b8; margin-bottom: 1.5rem; }
    .qr-container {
      background: #ffffff;
      padding: 1rem;
      border-radius: 1rem;
      display: inline-block;
      margin: 1rem 0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .qr-container img {
      display: block;
      width: 280px;
      height: 280px;
    }
    .instructions {
      text-align: left;
      background: #0f172a;
      border-radius: 0.75rem;
      padding: 1rem;
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-top: 1.25rem;
      line-height: 1.5;
    }
    .instructions ol { margin-left: 1.25rem; }
    .instructions li { margin-bottom: 0.25rem; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease-in-out;
      margin-top: 1rem;
      text-decoration: none;
    }
    .btn-primary { background: #059669; color: #ffffff; }
    .btn-primary:hover { background: #047857; }
    .btn-danger { background: #ef4444; color: #ffffff; margin-top: 0.5rem; }
    .btn-danger:hover { background: #dc2626; }
  </style>
</head>
<body>
  <div class="card">
    ${
      statusAdmin.conectado
        ? `<div class="badge badge-success">● Gateway Conectado</div>
           <h1>WhatsApp Conectado!</h1>
           <p class="desc">O número corporativo da plataforma <strong>(${statusAdmin.numero || 'Ativo'})</strong> está online e atendendo os MEIs.</p>
           <div class="instructions">
             <p>✅ O assistente IA está ativo e apto a processar mensagens de clientes e microempreendedores via Baileys Multi-Device.</p>
           </div>
           <form method="POST" action="/api/dev/whatsapp/resetar?token=${encodeURIComponent(req.query.dev_token || req.query.token || '')}">
             <button type="submit" class="btn btn-danger" onclick="return confirm('Deseja realmente desconectar e gerar um novo QR Code?');">Desconectar e Gerar Novo QR Code</button>
           </form>`
        : statusAdmin.qrCode
        ? `<div class="badge badge-waiting">⏳ Aguardando Leitura do QR Code</div>
           <h1>Conectar WhatsApp do Aranduê</h1>
           <p class="desc">Escaneie o código abaixo com o aplicativo oficial do WhatsApp no aparelho que será o robô do sistema.</p>
           <div class="qr-container">
             <img src="${qrCodeUrl}" alt="QR Code WhatsApp" />
           </div>
           <div class="instructions">
             <ol>
               <li>Abra o WhatsApp no aparelho que será o assistente</li>
               <li>Toque em <strong>Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone)</li>
               <li>Selecione <strong>Aparelhos conectados</strong></li>
               <li>Toque em <strong>Conectar um aparelho</strong> e aponte para esta tela</li>
             </ol>
           </div>
           <button class="btn btn-primary" onclick="window.location.reload();">🔄 Atualizar QR Code</button>`
        : `<div class="badge badge-disconnected">● Gateway Desconectado</div>
           <h1>Inicializando Conexão...</h1>
           <p class="desc">Aguarde alguns segundos enquanto o socket Baileys gera um novo par de chaves.</p>
           <button class="btn btn-primary" onclick="window.location.reload();">🔄 Verificar Novamente</button>`
    }
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return res.status(500).send(`Erro ao renderizar QR Code: ${error.message}`);
    }
  }
};

module.exports = devWhatsappController;
