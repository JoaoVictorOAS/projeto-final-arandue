-- Migração 007: Configurações do MEI (Perfil Cadastral e Parâmetros Fiscais Multi-Estado)

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
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_mei_config_uf (uf)
) ENGINE=InnoDB;
