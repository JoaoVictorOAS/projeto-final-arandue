-- backend/src/database/migrations/010_dashboards_customizados.sql
CREATE TABLE IF NOT EXISTS dashboards_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    eh_padrao TINYINT(1) NOT NULL DEFAULT 0,
    ordem INT NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dashboards_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_dashboards_usuario (usuario_id),
    INDEX idx_dashboards_ordem (usuario_id, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dashboard_id INT NOT NULL,
    usuario_id INT NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    tipo_grafico VARCHAR(30) NOT NULL,
    metrica VARCHAR(60) NOT NULL,
    periodo VARCHAR(30) NOT NULL DEFAULT 'ultimos_6_meses',
    largura INT NOT NULL DEFAULT 1,
    ordem INT NOT NULL DEFAULT 0,
    configuracoes JSON NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_widgets_dashboard FOREIGN KEY (dashboard_id) 
        REFERENCES dashboards_usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_widgets_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_widget_largura CHECK (largura IN (1, 2)),
    CONSTRAINT chk_widget_tipo CHECK (tipo_grafico IN ('bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi')),
    INDEX idx_widgets_dashboard (dashboard_id),
    INDEX idx_widgets_usuario (usuario_id),
    INDEX idx_widgets_ordem (dashboard_id, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
