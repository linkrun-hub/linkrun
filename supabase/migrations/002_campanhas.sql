-- ============================================================
-- MIGRATION 002 — Campanhas e Sequências
-- Rodar após 001_leads_tags.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS campanhas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  status                TEXT DEFAULT 'rascunho',  -- rascunho|ativa|pausada|finalizada
  janela_inicio         TIME DEFAULT '08:00',
  janela_fim            TIME DEFAULT '19:00',
  dias_semana           INT[] DEFAULT '{1,2,3,4,5}',  -- 0=dom ... 6=sáb
  cooldown_horas        INT DEFAULT 48,
  delay_min_segundos    INT DEFAULT 120,
  delay_max_segundos    INT DEFAULT 480,
  pause_se_bloqueio_pct NUMERIC DEFAULT 5.0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campanha_etapas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id  UUID REFERENCES campanhas(id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  nome         TEXT,
  delay_dias   INT DEFAULT 0,  -- dias após etapa anterior (ou matrícula p/ etapa 1)
  UNIQUE(campanha_id, numero)
);

CREATE TABLE IF NOT EXISTS templates_mensagem (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id  UUID REFERENCES campanha_etapas(id) ON DELETE CASCADE,
  variacao  INT DEFAULT 1,    -- 1,2,3... para A/B
  conteudo  TEXT NOT NULL,
  tipo      TEXT DEFAULT 'texto',  -- texto|imagem|audio
  midia_url TEXT,
  ativo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quais tags (produtos) uma campanha segmenta
CREATE TABLE IF NOT EXISTS campanha_tags (
  campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
  tag_id      UUID REFERENCES tags(id)      ON DELETE CASCADE,
  PRIMARY KEY (campanha_id, tag_id)
);

-- Matrícula de lead em campanha
CREATE TABLE IF NOT EXISTS lead_campanhas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID REFERENCES leads(id)     ON DELETE CASCADE,
  campanha_id         UUID REFERENCES campanhas(id) ON DELETE CASCADE,
  etapa_atual         INT DEFAULT 1,
  status              TEXT DEFAULT 'ativo',  -- ativo|pausado|concluido|optout
  matriculado_em      TIMESTAMPTZ DEFAULT NOW(),
  proxima_mensagem_em TIMESTAMPTZ,
  ultima_mensagem_em  TIMESTAMPTZ,
  UNIQUE(lead_id, campanha_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_campanhas_status  ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_lc_lead          ON lead_campanhas(lead_id);
CREATE INDEX IF NOT EXISTS idx_lc_campanha      ON lead_campanhas(campanha_id);
CREATE INDEX IF NOT EXISTS idx_lc_proxima       ON lead_campanhas(proxima_mensagem_em);
CREATE INDEX IF NOT EXISTS idx_lc_status        ON lead_campanhas(status);

-- RLS
ALTER TABLE campanhas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_etapas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_mensagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campanhas     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON campanhas          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON campanha_etapas    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON templates_mensagem FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON campanha_tags      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON lead_campanhas     FOR ALL USING (true) WITH CHECK (true);
