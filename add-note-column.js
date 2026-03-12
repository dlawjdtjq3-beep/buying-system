const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rslfchdbjodgyqeepckt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGZjaGRiam9kZ3lxZWVwY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NDQwMDgsImV4cCI6MjA1NDIyMDAwOH0.fEOQ7BUa4fikHS9OIvh3OtkIDLQcYh5wZDbG_W3YZLo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndAddNoteColumn() {
  console.log('데이터베이스 스키마 확인 중...');
  
  try {
    // 먼저 purchases 테이블 구조 확인
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('오류:', error.message);
    } else {
      console.log('현재 테이블 컬럼:', Object.keys(purchases[0] || {}));
      
      if (purchases[0] && 'note' in purchases[0]) {
        console.log('✓ note 컬럼이 이미 존재합니다!');
      } else {
        console.log('⚠️  note 컬럼이 없습니다.');
        console.log('\nSupabase Dashboard에서 수동으로 실행해주세요:');
        console.log('https://supabase.com/dashboard/project/rslfchdbjodgyqeepckt/editor');
        console.log('\nSQL Editor에서 실행:');
        console.log('ALTER TABLE purchases ADD COLUMN IF NOT EXISTS note TEXT;');
      }
    }
  } catch (err) {
    console.error('확인 오류:', err.message);
  }
}

checkAndAddNoteColumn();
