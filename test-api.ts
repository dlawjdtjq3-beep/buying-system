import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rslfchdbjodgyqeepckt.supabase.co',
  'sb_publishable_CJu3_Nt8l3WdZRJsxG6PNw_gvGiXD-j'
);

async function test() {
  console.log('=== Test 1: select(*) ===');
  
  // 첫 번째: select('*') 테스트
  const { data: d1 } = await supabase
    .from('purchases')
    .select('*')
    .eq('system', 'ella')
    .order('created_at', { ascending: false })
    .range(0, 999);
  
  console.log(`Batch 1 (select *): ${d1?.length || 0} rows`);
  
  // 두 번째: select('*') 배치 2
  const { data: d2 } = await supabase
    .from('purchases')
    .select('*')
    .eq('system', 'ella')
    .order('created_at', { ascending: false })
    .range(1000, 1999);
  
  console.log(`Batch 2 (select *): ${d2?.length || 0} rows`);
  console.log(`Total: ${(d1?.length || 0) + (d2?.length || 0)} rows`);
}

test().catch(err => console.error('Error:', err));

