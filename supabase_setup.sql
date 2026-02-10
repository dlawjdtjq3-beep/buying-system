-- Supabase 데이터베이스 테이블 생성 스크립트

-- 1. purchases 테이블 생성
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_date DATE NOT NULL,
  application_number INTEGER NOT NULL,
  applicant TEXT NOT NULL,
  category TEXT NOT NULL,
  image_data TEXT,
  product_url TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission DECIMAL(10, 2) DEFAULT 0,
  appraisal_fee DECIMAL(10, 2) DEFAULT 0,
  shipping_fee DECIMAL(10, 2) DEFAULT 0,
  purchase_status TEXT NOT NULL DEFAULT '미구매',
  payment_method TEXT,
  delivery_status TEXT NOT NULL DEFAULT '출고예정',
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. charge_history 테이블 생성
CREATE TABLE charge_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. purchases 테이블에 인덱스 추가 (성능 향상)
CREATE INDEX idx_purchases_application_number ON purchases(application_number);
CREATE INDEX idx_purchases_purchase_status ON purchases(purchase_status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);

-- 4. charge_history 테이블에 인덱스 추가
CREATE INDEX idx_charge_history_created_at ON charge_history(created_at DESC);

-- 5. Real-time 활성화 (실시간 동기화)
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE charge_history;

-- 6. Row Level Security (RLS) 비활성화 (모든 사용자가 읽기/쓰기 가능)
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE charge_history DISABLE ROW LEVEL SECURITY;
