CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchases_system_created_at
  ON purchases (system, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_charge_history_system_created_at
  ON charge_history (system, created_at DESC);
