#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Tenta carregar variáveis de ambiente dos arquivos .env se não estiverem no ambiente
function carregarEnvLocal() {
  const envPaths = [
    path.resolve(__dirname, '../backend/.env'),
    path.resolve(__dirname, '../.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...vParts] = trimmed.split('=');
        const v = vParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (k && v && !process.env[k.trim()]) {
          process.env[k.trim()] = v;
        }
      }
    }
  }
}

carregarEnvLocal();

const isLocal = process.argv.includes('--local');
const isReset = process.argv.includes('--reset');

const baseUrl = process.env.API_URL || 
  (isLocal ? 'http://localhost:3001' : 'https://backend-production-59f2.up.railway.app');

const secretToken = process.env.WHATSAPP_DEV_SECRET || 
                    process.env.INTERNAL_SERVICE_SECRET || 
                    'super_secreto_interno_arandue_2026';

let qrcodeTerminal = null;
try {
  qrcodeTerminal = require(path.resolve(__dirname, '../backend/node_modules/qrcode-terminal'));
} catch (e) {
  try {
    qrcodeTerminal = require('qrcode-terminal');
  } catch (err) {
    // Continua sem terminal qr se não instalado
  }
}

function request(method, urlStr) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(parsed, {
      method,
      headers: {
        'X-Dev-Token': secretToken,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log(`\n🚀 Conectando ao gateway do WhatsApp em: ${baseUrl}`);

  if (isReset) {
    console.log('🔄 Solicitando reset da sessão e geração de novo QR Code...');
    const resetRes = await request('POST', `${baseUrl}/api/dev/whatsapp/resetar`);
    if (resetRes.status !== 200 || !resetRes.data?.sucesso) {
      console.error('❌ Falha ao resetar sessão:', resetRes.data?.mensagem || resetRes.status);
      process.exit(1);
    }
    console.log('✅ Sessão resetada com sucesso.');
  }

  console.log('⏳ Obtendo QR Code atualizado...');
  const res = await request('GET', `${baseUrl}/api/dev/whatsapp/qrcode`);

  if (res.status !== 200 || !res.data?.sucesso) {
    console.error('❌ Erro ao obter QR Code:', res.data?.mensagem || `HTTP ${res.status}`);
    process.exit(1);
  }

  const { status, conectado, numero, qrCode, qrCodeUrl } = res.data.dados;

  if (conectado || status === 'conectado') {
    console.log(`\n✅ O WhatsApp já está CONECTADO!`);
    console.log(`📱 Número do bot: ${numero || 'N/A'}`);
    console.log(`Se deseja desconectar e gerar um novo QR, execute com a flag --reset:\n  npm run whatsapp:reset\n`);
    return;
  }

  if (qrCode) {
    console.log('\n===============================================================');
    console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP OFICIAL DO ARANDUÊ:');
    console.log('===============================================================\n');

    if (qrcodeTerminal) {
      qrcodeTerminal.generate(qrCode, { small: true });
    } else {
      console.log('String do QR Code:', qrCode);
    }

    console.log('\n---------------------------------------------------------------');
    console.log(`🌐 Link para abrir a imagem no navegador:`);
    console.log(`👉 ${qrCodeUrl}`);
    console.log('---------------------------------------------------------------\n');
  } else {
    console.log(`Status atual: ${status}. Nenhum QR Code disponível no momento.`);
  }
}

main().catch(err => {
  console.error('❌ Erro na execução:', err.message);
  process.exit(1);
});
