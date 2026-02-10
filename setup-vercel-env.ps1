# Vercel 환경 변수 설정 스크립트
Write-Host "🔥 Firebase 환경 변수를 Vercel에 추가합니다..." -ForegroundColor Green

$envVars = @{
    "NEXT_PUBLIC_FIREBASE_API_KEY" = "AIzaSyCcdDeymKdf6rbmJFUG9Nxw_Lzd2PjbVrk"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" = "buying-bf9e3.firebaseapp.com"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID" = "buying-bf9e3"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" = "buying-bf9e3.firebasestorage.app"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" = "203470363676"
    "NEXT_PUBLIC_FIREBASE_APP_ID" = "1:203470363676:web:bd8c8bfe7b6864355053d9"
}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "`n설정 중: $key" -ForegroundColor Yellow
    echo $value | vercel env add $key production
}

Write-Host "`n✅ 완료! 이제 재배포하세요: vercel --prod" -ForegroundColor Green
