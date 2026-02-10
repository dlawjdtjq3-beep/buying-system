-- 시스템 구분 필드 추가 (엘라/vmce)

-- purchases 테이블에 system 필드 추가
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'ella';

-- charge_history 테이블에 system 필드 추가
ALTER TABLE charge_history ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'ella';

-- system 필드에 인덱스 추가 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_purchases_system ON purchases(system);
CREATE INDEX IF NOT EXISTS idx_charge_history_system ON charge_history(system);

-- 기존 데이터는 모두 'ella'로 설정됨 (DEFAULT 값)
