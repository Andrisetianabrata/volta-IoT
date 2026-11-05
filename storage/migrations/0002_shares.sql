CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shares_dashboard ON shares(dashboard_id);
