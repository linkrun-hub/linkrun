-- ============================================================
-- MIGRATION 001 — Leads e Tags
-- Rodar no Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  cor        TEXT DEFAULT '#3B82F6',
  tipo       TEXT DEFAULT 'produto',  -- 'produto' | 'custom'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT NOT NULL,
  telefone       TEXT,
  whatsapp       TEXT,
  email          TEXT,
  instagram      TEXT,
  cnpj           TEXT,
  razao_social   TEXT,
  atividade      TEXT,
  decisor        TEXT,
  cidade         TEXT,
  estado         TEXT,
  origem         TEXT DEFAULT 'manual',   -- manual|planilha|botconversa|dataprospect|meta_ads|ocr
  etapa_funil    TEXT DEFAULT 'frio',     -- frio|morno|quente|assinante|churn
  whatsapp_valido BOOLEAN,
  optout         BOOLEAN DEFAULT FALSE,
  optout_em      TIMESTAMPTZ,
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_etapa       ON leads(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_leads_origem      ON leads(origem);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp    ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_optout      ON leads(optout);
CREATE INDEX IF NOT EXISTS idx_leads_created     ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead    ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag     ON lead_tags(tag_id);

-- RLS (público por enquanto — adicionar auth depois)
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_tags"      ON tags      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_leads"     ON leads     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_lead_tags" ON lead_tags FOR ALL USING (true) WITH CHECK (true);

-- Seed: tags dos 4 produtos
INSERT INTO tags (nome, cor, tipo) VALUES
  ('Revenda Profit', '#10b981', 'produto'),
  ('LogProfit',      '#3b82f6', 'produto'),
  ('Delicite',       '#f59e0b', 'produto'),
  ('UAIROX',         '#8b5cf6', 'produto')
ON CONFLICT (nome) DO NOTHING;
