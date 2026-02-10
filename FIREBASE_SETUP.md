# Firebase 설정 가이드

## 🔥 Firebase 프로젝트 생성

1. **Firebase 콘솔 접속**
   - https://console.firebase.google.com 접속
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름 입력 (예: buying-system)
   - Google 애널리틱스는 선택 사항
   - "프로젝트 만들기" 클릭

3. **웹 앱 추가**
   - 프로젝트 개요 페이지에서 "웹" 아이콘(</>) 클릭
   - 앱 닉네임 입력
   - "앱 등록" 클릭

4. **Firebase 설정 정보 복사**
   - firebaseConfig 객체의 값들을 복사

## 📝 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**예시:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbc123def456ghi789jkl012mno345pqr
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=buying-system.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=buying-system
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=buying-system.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456ghi789
```

## 🗄️ Firestore 데이터베이스 설정

1. **Firestore Database 생성**
   - Firebase 콘솔 왼쪽 메뉴에서 "Firestore Database" 클릭
   - "데이터베이스 만들기" 클릭
   - **프로덕션 모드**로 시작 선택
   - 위치는 `asia-northeast3` (서울) 선택
   - "사용 설정" 클릭

2. **보안 규칙 설정**
   - Firestore Database 페이지에서 "규칙" 탭 클릭
   - 아래 규칙을 복사해서 붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // purchases 컬렉션: 모두 읽기/쓰기 가능 (팀 내부용)
    match /purchases/{purchaseId} {
      allow read, write: if true;
    }
  }
}
```

   - "게시" 클릭

⚠️ **보안 참고사항:**
- 현재 규칙은 모든 사용자가 읽기/쓰기 가능합니다
- 팀 내부에서만 사용하는 경우 URL을 공유하지 마세요
- 더 강력한 보안이 필요한 경우 Firebase Authentication을 추가하세요

## 🚀 개발 서버 재시작

환경 변수를 설정한 후 개발 서버를 재시작하세요:

```bash
npm run dev
```

## ✅ 동작 확인

1. 브라우저에서 http://localhost:3000 접속
2. 새 구매 항목 등록
3. 다른 브라우저나 다른 기기에서 같은 URL 접속
4. 실시간으로 데이터가 동기화되는지 확인

## 🔄 실시간 동기화

- 한 사람이 데이터를 수정하면 **모든 사용자 화면에 즉시 반영**됩니다
- 인터넷 연결이 필요합니다
- Firebase 무료 플랜 제한:
  - 데이터베이스 저장: 1GB
  - 문서 읽기: 하루 50,000회
  - 문서 쓰기: 하루 20,000회
  - 소규모 팀에는 충분합니다!

## 🛠️ 문제 해결

### Firebase 연결 실패시
- 자동으로 로컬스토리지로 전환됩니다
- 브라우저 콘솔에서 오류 메시지 확인
- `.env.local` 파일의 환경 변수가 올바른지 확인
- 개발 서버를 재시작했는지 확인

### Firestore 권한 오류
- Firebase 콘솔에서 보안 규칙 확인
- 규칙이 위의 예시와 동일한지 확인

## 📱 배포시 주의사항

Vercel 배포시:
1. Vercel 대시보드에서 프로젝트 설정
2. "Environment Variables" 섹션
3. `.env.local`의 모든 변수를 추가
4. 재배포

## 💾 로컬 백업

- Firebase와 함께 로컬스토리지에도 자동 백업됩니다
- Firebase 연결 실패시 로컬 데이터를 사용합니다
- 정기적으로 "엑셀 다운로드" 또는 "JSON 다운로드"로 백업하세요
