-- Migração 002: Vinculação estrita do fluxo Orçamento -> Agendamento -> Cobrança -> Caixa

-- 1. Alterações na tabela agendamentos
ALTER TABLE agendamentos 
    ADD COLUMN orcamento_id INT NULL AFTER cliente_id;

-- 2. Alterações na tabela cobrancas
ALTER TABLE cobrancas 
    ADD COLUMN agendamento_id INT NULL AFTER cliente_id;

-- 3. Adição de chaves estrangeiras e índices
ALTER TABLE agendamentos
    ADD CONSTRAINT fk_agendamentos_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD INDEX idx_agendamentos_orcamento (usuario_id, orcamento_id);

ALTER TABLE cobrancas
    ADD CONSTRAINT fk_cobrancas_agendamento FOREIGN KEY (agendamento_id) 
        REFERENCES agendamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD INDEX idx_cobrancas_agendamento (usuario_id, agendamento_id);
