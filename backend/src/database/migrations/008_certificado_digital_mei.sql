-- Migração 008: Adiciona colunas para Certificado Digital ICP-Brasil A1 e transmissão SEFAZ
ALTER TABLE mei_configuracoes
    ADD COLUMN certificado_pfx_encrypted LONGTEXT NULL AFTER serie_nfce,
    ADD COLUMN certificado_senha_encrypted VARCHAR(500) NULL AFTER certificado_pfx_encrypted,
    ADD COLUMN certificado_nome_arquivo VARCHAR(255) NULL AFTER certificado_senha_encrypted,
    ADD COLUMN certificado_cnpj VARCHAR(14) NULL AFTER certificado_nome_arquivo,
    ADD COLUMN certificado_razao_social VARCHAR(255) NULL AFTER certificado_cnpj,
    ADD COLUMN certificado_valido_ate DATETIME NULL AFTER certificado_razao_social,
    ADD COLUMN transmissao_sefaz_ativa TINYINT(1) NOT NULL DEFAULT 1 AFTER certificado_valido_ate;
