-- 모집관리 시스템 데이터베이스 스키마

CREATE TABLE IF NOT EXISTS managers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
  target INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active / completed / closed
  memo TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruit_records (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recruit_date DATE NOT NULL,
  count INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_company ON recruit_records(company_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON recruit_records(recruit_date);

-- 샘플 데이터 (선택사항 - 필요 없으면 지워도 됩니다)
INSERT INTO managers (name) VALUES ('김대리'), ('이과장') ON CONFLICT DO NOTHING;
