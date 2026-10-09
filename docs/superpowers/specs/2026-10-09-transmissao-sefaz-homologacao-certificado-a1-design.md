# Documento de Design: Transmissão Oficial à SEFAZ de Homologação com Certificado Digital A1

**Data:** 09/10/2026  
**Status:** Aprovado  
**Autor:** Antigravity / Aranduê  

---

## 1. Visão Geral e Objetivos

O objetivo deste projeto é permitir que Microempreendedores Individuais (MEI) que possuam um **Certificado Digital ICP-Brasil A1 (`.pfx` / `.p12`)** emitam e transmitam notas fiscais de mercadorias (NF-e Modelo 55) diretamente para o **Ambiente Oficial de Homologação da SEFAZ** para qualquer uma das 27 Unidades Federativas do Brasil (todos os 26 estados + Distrito Federal).

### 1.1 Premissas e Princípios
1. **Modo Híbrido Automático (Zero Bloqueio):**
   - Usuários sem certificado continuam operando normalmente via **Emulador Fiscal Local autônomo** sem nenhum custo e sem interrupções.
   - Usuários com certificado A1 cadastrado e ativado têm suas notas transmitidas, assinadas digitalmente e autorizadas ao vivo nos servidores oficiais de teste do governo.
2. **Segurança Corporativa em Repouso:**
   - O arquivo binário `.pfx` e a respectiva senha são cifrados com **AES-256-GCM** antes de serem persistidos no MySQL.
   - A chave privada e a senha bruta **nunca** são expostas em logs, respostas de API ou ferramentas de IA.
3. **Paridade Total API REST ↔ MCP (`GEMINI.md`):**
   - Todas as operações de consulta de status e alternância de transmissão disponíveis no backend Express possuem ferramentas espelho no MCP Server (`server.py`).
4. **Isolamento Multi-Tenant:**
   - Todo certificado e chave privada são estritamente isolados por `usuario_id`, extraído exclusivamente do token JWT.

---

## 2. Modelo de Dados e Armazenamento Seguro

### 2.1 Migração de Banco de Dados: `008_certificado_digital_mei.sql`
A migração adiciona campos dedicados à tabela `mei_configuracoes`:

```sql
ALTER TABLE mei_configuracoes
    ADD COLUMN certificado_pfx_encrypted LONGTEXT NULL AFTER serie_nfce,
    ADD COLUMN certificado_senha_encrypted VARCHAR(500) NULL AFTER certificado_pfx_encrypted,
    ADD COLUMN certificado_nome_arquivo VARCHAR(255) NULL AFTER certificado_senha_encrypted,
    ADD COLUMN certificado_cnpj VARCHAR(14) NULL AFTER certificado_nome_arquivo,
    ADD COLUMN certificado_razao_social VARCHAR(255) NULL AFTER certificado_cnpj,
    ADD COLUMN certificado_valido_ate DATETIME NULL AFTER certificado_razao_social,
    ADD COLUMN transmissao_sefaz_ativa TINYINT(1) NOT NULL DEFAULT 1 AFTER certificado_valido_ate;
```

### 2.2 Algoritmo Criptográfico (`AES-256-GCM`)
* **Chave Mestra:** Obtida de `process.env.FISCAL_CERT_SECRET` (com derivação via SHA-256 de `process.env.JWT_SECRET` como fallback).
* **Estrutura Cifrada:** Armazena JSON serializado contendo `iv` (12 bytes em hex), `authTag` (16 bytes em hex) e `content` (cifrado em base64).

---

## 3. Módulo Criptográfico e Assinador XML

### 3.1 Serviço de Certificado: `backend/src/services/fiscal/certificadoService.js`
* **`analisarCertificadoPfx(bufferPfx, senha)`:** Abre o contêiner PKCS#12, valida a senha, extrai a chave privada RSA (PEM), o certificado X.509 (PEM), data de validade (`notAfter`), Razão Social e CNPJ (extraído do Subject / OID ICP-Brasil `2.16.76.1.3.3` ou fallback de CNPJ no Subject).
* **`criptografarCertificado(bufferPfx, senha)`:** Criptografa o arquivo e a senha usando AES-256-GCM.
* **`decifrarCertificado(usuarioId)`:** Busca o registro do tenant em `mei_configuracoes`, decifra em memória e retorna `{ pfxBuffer, senha, dadosCertificado }`.

### 3.2 Assinador Digital: `backend/src/services/fiscal/assinadorXmlFiscal.js`
* Assinatura digital conforme **W3C XML Signature (Enveloped)** e **MOC SEFAZ Anexo I**:
  1. Identifica o elemento `<infNFe Id="NFe{chave_acesso}">`;
  2. Aplica canonicalização C14N (`http://www.w3.org/TR/2001/REC-xml-c14n-20010315`);
  3. Calcula Digest SHA-1 da tag canônica;
  4. Gera o elemento `<SignedInfo>` com `Transforms` (enveloped + c14n) e `DigestMethod` SHA-1;
  5. Assina o `<SignedInfo>` canônico com a chave privada RSA do MEI (`RSA-SHA1`);
  6. Gera e anexa o nó `<Signature>` canônico com `<SignatureValue>` e `<KeyInfo><X509Data><X509Certificate>` logo antes do fechamento `</NFe>`.

---

## 4. Mapeamento de WebServices SEFAZ Homologação e Transmissão SOAP mTLS

### 4.1 Mapeamento no `sefazRegistry.js`
Inclusão dos endpoints oficiais de Homologação para `NFeAutorizacao4` (versão 4.00) cobrindo todas as 27 UFs:
* **SVRS** *(SC, RS, AC, AL, AP, CE, DF, ES, PA, PB, PI, RJ, RN, RO, RR, SE, TO)*:  
  `https://nfe-homologacao.svrs.rs.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx`
* **BA (Próprio)**: `https://hnfe.sefaz.ba.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx`
* **SP (Próprio)**: `https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx`
* **MG (Próprio)**: `https://hnfe.fazenda.mg.gov.br/1.00/NFeAutorizacao4`
* **PR (Próprio)**: `https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeAutorizacao4`
* **GO (Próprio)**: `https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4`
* **MT (Próprio)**: `https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4`
* **MS (Próprio)**: `https://hom.nfe.fazenda.ms.gov.br/ws/NFeAutorizacao4`
* **AM (Próprio)**: `https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4`
* **SVAN** *(MA)*: `https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx`

### 4.2 Cliente Transmissor: `backend/src/services/fiscal/sefazTransmissor.js`
* Monta envelope SOAP 1.2 com lote síncrono (`indSinc=1`):
  ```xml
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
        <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <idLote>1</idLote>
          <indSinc>1</indSinc>
          <NFe>...</NFe>
        </enviNFe>
      </nfeDadosMsg>
    </soap12:Body>
  </soap12:Envelope>
  ```
* Estabelece canal HTTPS com `https.Agent({ pfx: certBuffer, passphrase: certPass, rejectUnauthorized: false })`.
* Faz parse da resposta SOAP e do nó `<retEnviNFe>`:
  * Se `cStat == '104'` e `<protNFe><cStat> == '100'`: Autorizado! Extrai `nProt` (Protocolo SEFAZ oficial) e anexa `<nfeProc>` ao XML.
  * Se `cStat != '100'`: Captura `cStat` e `xMotivo` e formata erro amigável de rejeição tributária.
* Regra obrigatória em Homologação: Substitui o nome do destinatário por `"NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"`, evitando a Rejeição 222.

---

## 5. Fluxo Híbrido no Motor Fiscal (`fiscalEngine.js`)

Ao chamar `fiscalEngine.emitirNfe(usuarioId, payload)`:
1. Verifica se o tenant possui certificado ativo em `mei_configuracoes` (`certificado_pfx_encrypted != null` e `transmissao_sefaz_ativa == 1`);
2. **Se certificado ativo:**
   - Gera o XML NF-e 4.0;
   - Assina digitalmente via `assinadorXmlFiscal`;
   - Transmite via `sefazTransmissor` ao WebService de homologação da UF do emitente;
   - Em caso de sucesso (`cStat 100`), grava o protocolo oficial retornado pela SEFAZ;
   - Salva a nota no banco com `status = 'EMITIDA'`, `ambiente = 'HOMOLOGACAO'`, XML assinado e protocolado;
   - Gera DANFE apontando para a consulta oficial de Homologação da SEFAZ ([hom.nfe.fazenda.gov.br](https://hom.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx));
   - Movimenta Livro Caixa e Estoque atômicos.
3. **Se sem certificado ou modo simulação:**
   - Mantém o comportamento autônomo local (Emulador Fiscal) sem quebrar fluxos nem exigir certificados pagos.

---

## 6. Endpoints REST e Paridade MCP

### 6.1 Rotas Express (`backend/src/routes/configuracoesRoutes.js`)
* `POST /api/configuracoes/certificado`: Upload do arquivo `.pfx` com campo `senha`.
* `GET /api/configuracoes/certificado`: Consulta status seguro (CNPJ, Razão Social, validade, transmissão ativa).
* `DELETE /api/configuracoes/certificado`: Remove o certificado e reverte para o emulador local.
* `PATCH /api/configuracoes/certificado/toggle`: Liga ou desliga `transmissao_sefaz_ativa`.

### 6.2 Ferramentas MCP (`ai-service/mcp_server/server.py`)
* `obter_status_certificado_digital()`
* `alternar_transmissao_sefaz(ativo: bool)`

---

## 7. Interface do Usuário (Frontend)

1. **[Configuracoes.jsx](file:///home/JoaoVictor/projetos/projeto-final-arandue/frontend/src/pages/Configuracoes.jsx):**
   - Card *"Certificado Digital ICP-Brasil (A1)"*;
   - Upload de arquivo `.pfx`/`.p12` e input de senha segura;
   - Card com crachá verde de validade quando ativo e interruptor de transmissão ao vivo;
   - Ação de exclusão ou troca de certificado.
2. **[NotasFiscais.jsx](file:///home/JoaoVictor/projetos/projeto-final-arandue/frontend/src/pages/NotasFiscais.jsx):**
   - Indicação no modal de emissão e no espelho DANFE quando a nota é transmitida com protocolo real SEFAZ;
   - Link de consulta apontando para o Portal de Homologação da SEFAZ.

---

## 8. Estratégia de Testes (TDD)

1. **Testes Unitários:**
   - `tests/unit/certificadoService.test.js`: Criptografia AES-GCM, decifragem e extração X.509 de chaves de teste;
   - `tests/unit/assinadorXmlFiscal.test.js`: Assinatura digital XML conforme especificação W3C;
   - `tests/unit/sefazTransmissor.test.js`: Montagem de envelope SOAP e parsing de respostas SEFAZ mockadas.
2. **Testes de Integração:**
   - `tests/integration/certificadoApi.test.js`: Upload, status, toggle e deleção de certificados via API Express;
   - `tests/integration/fiscalEngineHomologacao.test.js`: Fluxo completo de emissão com certificado e fallback local.
3. **Testes de IA:**
   - `ai-service/tests/test_mcp_certificado.py`: Validação das novas ferramentas MCP.
4. **Testes Frontend:**
   - `frontend/src/pages/Configuracoes.test.jsx`: Renderização e formulário de upload de certificado.
