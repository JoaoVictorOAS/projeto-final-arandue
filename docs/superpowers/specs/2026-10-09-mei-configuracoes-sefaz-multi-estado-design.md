# Documento de Design: Configurações do MEI & Integração SEFAZ Multi-Estado (27 UFs)

**Data:** 09/10/2026  
**Status:** Aprovado  
**Autor:** Antigravity / Aranduê  

---

## 1. Visão Geral e Objetivos

O objetivo deste projeto é permitir que qualquer Microempreendedor Individual (MEI) sediado em qualquer uma das **27 Unidades Federativas do Brasil (todos os 26 estados + Distrito Federal)** configure seus dados cadastrais e fiscais da empresa, e que todas as emissões de notas fiscais (NFS-e Nacional, NF-e mod 55 e NFC-e mod 65) utilizem automaticamente o seu domicílio fiscal, o respectivo código `cUF` IBGE e o autorizador fiscal correspondente (SEFAZ estadual própria ou SEFAZ Virtual SVRS/SVAN).

O projeto compreende duas grandes features interdependentes:
1. **Página de Configurações / Perfil da Empresa (MEI)** no Frontend e Backend com busca automática de dados por CNPJ (Receita Federal / BrasilAPI).
2. **Motor Fiscal SEFAZ Multi-Estado (27 UFs)** no Backend com paridade total no MCP Server para IA.

---

## 2. Arquitetura e Modelo de Dados

### 2.1 Banco de Dados MySQL: Tabela `mei_configuracoes`
Criada pela migração `backend/src/database/migrations/007_mei_configuracoes.sql`:

```sql
CREATE TABLE IF NOT EXISTS mei_configuracoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    razao_social VARCHAR(180) NOT NULL,
    nome_fantasia VARCHAR(180) NULL,
    cnpj VARCHAR(20) NOT NULL,
    inscricao_estadual VARCHAR(30) NULL DEFAULT 'ISENTO',
    inscricao_municipal VARCHAR(30) NULL,
    
    -- Endereço e Domicílio Fiscal
    cep VARCHAR(10) NOT NULL,
    logradouro VARCHAR(180) NOT NULL,
    numero VARCHAR(20) NOT NULL DEFAULT 'S/N',
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NOT NULL,
    municipio VARCHAR(120) NOT NULL,
    uf CHAR(2) NOT NULL,
    codigo_municipio_ibge VARCHAR(10) NOT NULL,
    
    -- Contato Comercial
    email_comercial VARCHAR(180) NULL,
    telefone_comercial VARCHAR(20) NULL,
    
    -- Parâmetros Fiscais
    ambiente_fiscal ENUM('HOMOLOGACAO', 'PRODUCAO') NOT NULL DEFAULT 'HOMOLOGACAO',
    serie_nfse INT NOT NULL DEFAULT 1,
    serie_nfe INT NOT NULL DEFAULT 1,
    serie_nfce INT NOT NULL DEFAULT 1,
    
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_mei_configuracoes_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_mei_configuracoes_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_mei_config_uf (uf)
) ENGINE=InnoDB;
```

### 2.2 Registro Canônico SEFAZ (`sefazRegistry.js`)
Mapeamento centralizado de todas as **27 UFs do Brasil**:

| UF | Nome | cUF IBGE | Autorizador SEFAZ | Portal de Consulta Pública |
|---|---|---|---|---|
| AC | Acre | 12 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| AL | Alagoas | 27 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| AP | Amapá | 16 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| AM | Amazonas | 13 | AM (Próprio) | https://sistemas.sefaz.am.gov.br |
| BA | Bahia | 29 | BA (Próprio) | http://nfe.sefaz.ba.gov.br |
| CE | Ceará | 23 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| DF | Distrito Federal | 53 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| ES | Espírito Santo | 32 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| GO | Goiás | 52 | GO (Próprio) | https://nfe.sefaz.go.gov.br |
| MA | Maranhão | 21 | SVAN | https://www.sefaz.ma.gov.br |
| MT | Mato Grosso | 51 | MT (Próprio) | https://www.sefaz.mt.gov.br |
| MS | Mato Grosso do Sul | 50 | MS (Próprio) | https://www.dfe.ms.gov.br |
| MG | Minas Gerais | 31 | MG (Próprio) | https://nfe.fazenda.mg.gov.br |
| PA | Pará | 15 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| PB | Paraíba | 25 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| PR | Paraná | 41 | PR (Próprio) | https://receita.pr.gov.br |
| PE | Pernambuco | 26 | PE (Próprio) | https://nfe.sefaz.pe.gov.br |
| PI | Piauí | 22 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| RJ | Rio de Janeiro | 33 | RJ (Próprio) | https://www.fazenda.rj.gov.br |
| RN | Rio Grande do Norte | 24 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| RS | Rio Grande do Sul | 43 | RS (Próprio) | https://dfe-portal.svrs.rs.gov.br |
| RO | Rondônia | 11 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| RR | Roraima | 14 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| SC | Santa Catarina | 42 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| SP | São Paulo | 35 | SP (Próprio) | https://www.nfe.fazenda.sp.gov.br |
| SE | Sergipe | 28 | SVRS | https://dfe-portal.svrs.rs.gov.br |
| TO | Tocantins | 17 | SVRS | https://dfe-portal.svrs.rs.gov.br |

---

## 3. Endpoints REST da API

### `GET /api/configuracoes`
Retorna as configurações do MEI do usuário autenticado. Se ainda não existirem, retorna valores pré-preenchidos padrão (com dados do usuário) para edição.

### `PUT /api/configuracoes`
Cria ou atualiza as configurações do MEI, realizando validação dos campos obrigatórios (CNPJ, Razão Social, UF válida nas 27 UFs, Município, CEP).

### `GET /api/configuracoes/cnpj/:cnpj`
Consulta pública de dados do CNPJ na BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) para preenchimento com 1 clique.

### `GET /api/configuracoes/estados`
Retorna a lista completa das 27 UFs brasileiras com sigla, nome, código `cUF` e autorizador SEFAZ.

---

## 4. Integração no Motor Fiscal (`fiscalEngine.js`)

1. A função `obterDadosEmitente(usuarioId)` consulta prioritariamente `mei_configuracoes`.
2. Emissões de NF-e e NFC-e utilizam o `cUF` e a UF cadastrada do MEI.
3. Chaves de acesso de 44 dígitos (NF-e/NFC-e) e 50 dígitos (NFS-e Nacional) são geradas contendo a UF e código IBGE do MEI.
4. O DANFE gerado exibe o link da SEFAZ estadual correta e a informação da localidade real do MEI.

---

## 5. Paridade MCP para IA (`ai-service/mcp_server/server.py`)

Em conformidade estrita com o `GEMINI.md`:
- `obter_configuracoes_mei()`: Leitura do perfil e parâmetros fiscais do MEI.
- `atualizar_configuracoes_mei(dados)`: Alteração dos dados cadastrais/fiscais do MEI via chat.
- `consultar_dados_cnpj(cnpj)`: Consulta de dados públicos de empresas por CNPJ.

---

## 6. Frontend: Interface de Configurações (`Configuracoes.jsx`)

1. Acessível via rota `/configuracoes` e item "Configurações" no menu lateral com ícone de engrenagem.
2. Card de busca de CNPJ com preenchimento automático em 1 clique.
3. Seletor de UF com indicação em tempo real do autorizador SEFAZ vinculado (ex: `SEFAZ SP`, `SEFAZ MG`, `SVRS`, etc.).
4. Formulário responsivo com validação, máscara e feedback visual amigável.
