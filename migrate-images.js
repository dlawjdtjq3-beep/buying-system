/**
 * Base64 이미지를 Supabase Storage로 마이그레이션
 * 
 * 실행 방법:
 * node migrate-images.js [system_name]
 * 예: node migrate-images.js ella
 *     node migrate-images.js vmce
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();
      envVars[key] = value;
    }
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 환경 변수 확인:');
console.log('  URL:', supabaseUrl ? '✅' : '❌');
console.log('  KEY:', supabaseKey ? '✅' : '❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 시스템명을 커맨드라인 인자로 받기
const systemName = process.argv[2] || 'ella';
console.log(`\n🚀 ${systemName} 시스템의 이미지 마이그레이션을 시작합니다...\n`);

/**
 * base64를 Supabase Storage에 업로드
 */
async function uploadImageToStorage(base64Data, purchaseId) {
  try {
    // base64를 Blob으로 변환
    const parts = base64Data.split(',');
    if (parts.length < 2) {
      console.error('유효하지 않은 base64 데이터');
      return null;
    }

    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = Buffer.from(parts[1], 'base64').toString('binary');
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    const blob = new Blob([u8arr], { type: mimeType });

    // Storage에 업로드
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = mimeType.split('/')[1] || 'png';
    const path = `${systemName}/${timestamp}-${randomStr}-${purchaseId}.${extension}`;
    
    const { data, error: uploadError } = await supabase.storage
      .from('purchase-images')
      .upload(path, blob);

    if (uploadError) {
      console.error(`  ❌ 업로드 오류:`, uploadError.message);
      return null;
    }

    // 공개 URL 얻기
    const { data: publicUrl } = supabase.storage
      .from('purchase-images')
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  } catch (err) {
    console.error(`  ❌ 예외 발생:`, err.message);
    return null;
  }
}

/**
 * 마이그레이션 실행
 */
async function migrateImages() {
  try {
    // 1. image_data는 있지만 image_url이 없는 레코드 조회 (배치 처리)
    console.log('📊 마이그레이션 대상 데이터 조회 중...');
    
    const batchSize = 100;
    let offset = 0;
    let allTargetPurchases = [];
    
    while (true) {
      const { data: batch, error: fetchError } = await supabase
        .from('purchases')
        .select('id, application_number, product_name, image_data, image_url')
        .eq('system', systemName)
        .not('image_data', 'is', null)
        .is('image_url', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        throw fetchError;
      }

      if (!batch || batch.length === 0) {
        break;
      }

      allTargetPurchases = allTargetPurchases.concat(batch);
      offset += batchSize;
      
      console.log(`  조회됨: ${allTargetPurchases.length}개...`);
      
      if (batch.length < batchSize) {
        break;
      }
    }
    
    console.log(`\n🎯 마이그레이션 대상: ${allTargetPurchases.length}개\n`);

    if (allTargetPurchases.length === 0) {
      console.log('✅ 마이그레이션할 데이터가 없습니다.');
      return;
    }

    // 2. 각 레코드 처리
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < allTargetPurchases.length; i++) {
      const purchase = allTargetPurchases[i];
      const progress = `[${i + 1}/${allTargetPurchases.length}]`;
      
      console.log(`${progress} 처리 중: #${purchase.application_number} - ${purchase.product_name}`);

      // Storage에 업로드
      const imageUrl = await uploadImageToStorage(purchase.image_data, purchase.id);

      if (imageUrl) {
        // DB 업데이트 (image_url 설정, image_data는 null로)
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            image_url: imageUrl,
            image_data: null  // DB 용량 절약을 위해 base64 제거
          })
          .eq('id', purchase.id);

        if (updateError) {
          console.log(`  ❌ DB 업데이트 실패: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`  ✅ 완료`);
          successCount++;
        }
      } else {
        failCount++;
      }

      // API 제한 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 결과 출력
    console.log('\n' + '='.repeat(50));
    console.log('📊 마이그레이션 결과');
    console.log('='.repeat(50));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log(`📦 전체: ${allTargetPurchases.length}개`);
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('❌ 마이그레이션 중 오류 발생:', err);
    process.exit(1);
  }
}

// 실행
migrateImages()
  .then(() => {
    console.log('🎉 마이그레이션이 완료되었습니다!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 치명적 오류:', err);
    process.exit(1);
  });
