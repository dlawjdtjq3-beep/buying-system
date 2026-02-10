# 구매 관리 시스템 배포 가이드

이 문서는 구매 관리 시스템을 한국과 중국에서 접근 가능하도록 배포하는 방법을 설명합니다.

## 🚀 빠른 배포 (Vercel - 권장)

### 실시간 동기화를 위한 배포 가이드

**⚠️ 중요: 배포 전에 Firebase 설정을 먼저 완료하세요!**
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) 파일을 참고하여 Firebase 프로젝트 생성
- Firebase 설정값을 미리 준비하세요

---

### 1. Vercel 배포 (무료, 가장 간단)

#### Step 1: GitHub에 코드 업로드

```bash
# Git 초기화 (아직 안했다면)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit: 구매 관리 시스템"

# GitHub 저장소 생성 후 연결 (GitHub에서 저장소 만들기)
git remote add origin https://github.com/your-username/buying-system.git

# 푸시
git branch -M main
git push -u origin main
```

#### Step 2: Vercel에서 배포

1. **Vercel 접속**
   - [Vercel](https://vercel.com)에 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - "New Project" 클릭
   - GitHub 저장소 선택 (buying-system)
   - "Import" 클릭

3. **🔥 Firebase 환경 변수 설정 (중요!)**
   - "Environment Variables" 섹션 펼치기
   - 아래 변수들을 하나씩 추가:

   ```
   Name: NEXT_PUBLIC_FIREBASE_API_KEY
   Value: your-api-key-here

   Name: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   Value: your-project-id.firebaseapp.com

   Name: NEXT_PUBLIC_FIREBASE_PROJECT_ID
   Value: your-project-id

   Name: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   Value: your-project-id.appspot.com

   Name: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   Value: your-messaging-sender-id

   Name: NEXT_PUBLIC_FIREBASE_APP_ID
   Value: your-app-id
   ```

4. **배포 시작**
   - "Deploy" 클릭
   - 2-3분 후 배포 완료!
   - `https://your-project.vercel.app` 형식의 URL 생성

#### Step 3: 배포된 URL 확인 및 공유

- Vercel 대시보드에서 URL 확인
- 이 URL을 팀원들에게 공유
- **모든 사용자가 같은 URL에 접속하면 실시간 동기화됩니다!**

---

### 2. 실시간 동기화 작동 확인

1. 배포된 URL 접속 (예: `https://buying-system.vercel.app`)
2. 다른 기기나 브라우저에서 같은 URL 접속
3. 한쪽에서 데이터 추가/수정
4. **다른 쪽 화면에 즉시 반영되는지 확인** ✨

---

### 3. 배포 후 업데이트

코드를 수정한 후:

```bash
git add .
git commit -m "Update: 기능 개선"
git push
```

→ Vercel이 자동으로 재배포합니다! (1-2분 소요)

### 2. Netlify 배포 (무료 대안)

1. **GitHub에 코드 업로드** (위와 동일)

2. **Netlify에서 배포**
   - [Netlify](https://netlify.com)에 접속하여 GitHub 계정으로 로그인
   - "Add new site" → "Import an existing project"
   - GitHub 저장소 선택
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   
3. **🔥 Firebase 환경 변수 설정**
   - "Site settings" → "Environment variables"
   - 위의 Vercel과 동일한 6개 환경 변수 추가
   - "Deploy site" 클릭

---

## 🌐 중국에서 접속하기

**중요:** 
- Vercel과 Netlify는 중국에서 접속이 느리거나 차단될 수 있습니다
- Firebase는 중국에서 사용 가능하지만 VPN이 필요할 수 있습니다

**중국 사용자를 위한 대안:**
1. **Alibaba Cloud** 또는 **Tencent Cloud**에 배포
2. **Cloudflare Pages** 사용 (중국 접속 양호)
3. VPN 사용하여 Vercel 접속

---

## 🔒 보안 설정

현재 Firestore 규칙은 모든 사용자가 읽기/쓰기 가능합니다.

**팀 내부용으로 사용하는 경우:**
- ✅ 배포된 URL을 외부에 공유하지 마세요
- ✅ 정기적으로 Firebase 콘솔에서 데이터 확인

**더 강력한 보안이 필요한 경우:**
- Firebase Authentication 추가 (이메일/비밀번호 로그인)
- Firestore 규칙에 인증 확인 추가
- 필요시 팀에게 계정 생성 기능 안내

---

## 📊 Firebase 사용량 모니터링

Firebase 콘솔에서 확인:
- Storage: 사진 저장 용량
- Firestore: 문서 읽기/쓰기 횟수
- 무료 한도 초과시 자동 알림

**무료 플랜 한도:**
- 저장소: 1GB
- 일일 읽기: 50,000회
- 일일 쓰기: 20,000회
- 소규모 팀(10-20명)에는 충분합니다!

## 🛠️ 로컬에서 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 열기
# http://localhost:3000
```

## 📱 사용 방법

### 1. 새 구매 등록
- 상단 폼에 정보 입력
- **사진 업로드 방법:**
  - 📎 파일 선택 버튼 클릭
  - 🖱️ 이미지를 드래그해서 영역에 드롭
  - 📋 이미지를 복사 후 영역 클릭하고 Ctrl+V (또는 Cmd+V)
  - 📱 핸드폰: 카메라 직접 촬영 또는 갤러리 선택
- **금액 입력:** 숫자만 입력하면 자동으로 포매팅 (콤마 추가, 한화 환산 표시)
- 모든 필수 항목(*) 입력 후 "등록하기" 클릭

### 2. 목록만 보기
- "📋 목록만 보기" 버튼 클릭
- 폼이 숨겨지고 테이블만 표시됨

### 3. 카테고리 필터링
- 통계 대시보드에서 카테고리 배지 클릭
- 해당 카테고리만 필터링되어 표시
- "✕ 필터 해제" 버튼으로 전체 보기

### 4. 구매 수정
- 테이블에서 "✏️ 수정" 버튼 클릭
- 폼이 해당 데이터로 채워짐
- 수정 후 "수정하기" 클릭

### 5. 구매 삭제
- 테이블에서 "🗑️ 삭제" 버튼 클릭
- 확인 다이얼로그에서 확인

### 6. 데이터 백업
- **엑셀 다운로드:** "📊 엑셀 다운로드" 버튼 - 엑셀 파일(.xlsx)로 다운로드
- **JSON 다운로드:** "💾 JSON 다운로드" 버튼 - JSON 파일 다운로드

## 📊 데이터 저장

- 현재 브라우저의 로컬스토리지에 저장됨
- 브라우저 데이터를 삭제하면 모든 데이터가 사라짐
- 정기적으로 "엑셀 다운로드" 또는 "JSON 다운로드" 기능으로 백업 권장
- 엑셀 파일은 통계 분석 및 공유용으로, JSON은 데이터 복원용으로 권장

## 🔒 보안 고려사항

현재 버전은 로컬스토리지를 사용하므로:
- ✅ 빠르고 간단함
- ✅ 서버 비용 없음
- ⚠️ 브라우저별로 독립적인 데이터
- ⚠️ 여러 사용자가 데이터를 공유할 수 없음

### 여러 사용자가 공유하려면?

데이터베이스 연동이 필요합니다:
- **Firebase Firestore** (무료 티어 제공, 실시간 동기화)
- **Supabase** (PostgreSQL, 무료 티어 제공)
- **MongoDB Atlas** (NoSQL, 무료 티어 제공)

현재는 같은 브라우저에서 접속하면 같은 데이터를 볼 수 있지만, 
다른 기기나 다른 브라우저에서는 별도의 데이터가 저장됩니다.

진정한 다중 사용자 환경이 필요하면 위 데이터베이스 중 하나를 선택하여 연동하세요.

## 🌐 중국 접속 관련

중국에서 접속 시 고려사항:
- Vercel은 중국에서 접속 가능하지만 느릴 수 있음
- 더 빠른 중국 접속을 위해서는:
  - Alibaba Cloud
  - Tencent Cloud
  - 중국 내 CDN 사용

## 📞 문제 해결

### 이미지가 표시되지 않는 경우
- 이미지 파일이 너무 크면(5MB 이상) 업로드가 안됩니다
- JPG, PNG 등 일반 이미지 형식을 사용하세요
- 핸드폰에서는 카메라로 직접 촬영도 가능합니다

### 데이터가 사라진 경우
- 브라우저 캐시를 삭제했는지 확인
- 다른 브라우저를 사용했는지 확인
- 백업 JSON 파일이 있다면 수동으로 복구 가능

## 🔄 업데이트

코드 변경 후:
```bash
git add .
git commit -m "Update message"
git push
```

Vercel/Netlify가 자동으로 재배포합니다.

---

## 📝 필드 설명

| 필드 | 설명 | 필수 |
|------|------|------|
| 신청일 | 구매 신청한 날짜 | ✅ |
| 신청번호 | 자동 생성 (1부터 카운트) | 자동 |
| 신청인 | 신청한 사람 이름 | ✅ |
| 카테고리 | 가방/악세사리/의류/신발/시계/기타 | ✅ |
| 사진 첨부 | 제품 이미지 파일 (핸드폰/PC 촬영) | ❌ |
| 구매 URL | 제품 구매 링크 | ✅ |
| 대표 제품명 | 제품 이름 | ✅ |
| 금액 | 위안화(¥) 가격 | ✅ |
| 구매여부 | 구매완료/미구매 | ✅ |
| 배송 단계 | 출고예정/출고/출고완료 | ✅ |
