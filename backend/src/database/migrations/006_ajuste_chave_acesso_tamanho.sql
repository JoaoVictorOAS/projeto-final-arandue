-- Migração 006: Ampliação da coluna chave_acesso para suportar NFS-e Padrão Nacional (50 dígitos)
ALTER TABLE notas_fiscais MODIFY COLUMN chave_acesso VARCHAR(60) NULL;
