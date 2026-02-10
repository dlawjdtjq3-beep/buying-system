# 구매 관리 시스템 🛒

한국과 중국에서 사용할 수 있는 웹 기반 구매 관리 시스템입니다.

## ✨ 주요 기능

- ✅ **실시간 동기화** - 여러 명이 동시에 사용하면 실시간으로 데이터 반영
- ✅ **다중 사용자 지원** - 여러 명이 함께 사용 가능
- ✅ 구매 내역 등록 및 관리
- ✅ **자동 신청번호** - 1부터 자동 증가
- ✅ **카테고리 분류 & 필터링** - 가방, 악세사리, 의류, 신발, 시계, 기타 (클릭 필터링)
- ✅ 신청일, 신청인 정보 관리
- ✅ 제품 사진 업로드 (드래그 앤 드롭, 파일 첨부, 붙여넣기)
- ✅ **위안화 표시 및 한화 환산** - ¥ 기호로 명확한 금액 표시 + 한화 자동 표시
- ✅ **금액 포매팅** - 천 단위 콤마 자동 입력
- ✅ 구매 상태 추적 (구매완료/미구매)
- ✅ 배송 단계 추적 (출고예정/출고/출고완료)
- ✅ **엑셀 다운로드** - .xlsx 형식 지원
- ✅ **목록만 보기** - 폼 숨김/표시 토글
- ✅ **통계 대시보드** - 총금액, 카테고리별 현황 한눈에
- ✅ 데이터 내보내기 (JSON 백업)
- ✅ 반응형 디자인 (모바일/태블릿/PC 지원)

## 🔥 Firebase 실시간 동기화 설정

**여러 명이 동시에 사용하려면 Firebase 설정이 필요합니다.**

자세한 설정 방법은 [FIREBASE_SETUP.md](FIREBASE_SETUP.md)를 참고하세요.

**간단 요약:**
1. Firebase 콘솔에서 프로젝트 생성
2. `.env.local` 파일에 Firebase 설정 추가
3. Firestore Database 생성
4. 개발 서버 재시작

> 💡 Firebase 설정 없이도 로컬스토리지로 사용 가능하지만, 실시간 동기화는 되지 않습니다.

## 🚀 빠른 시작

### 개발 환경 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 📋 필드 설명

| 필드 | 설명 | 필수 |
|------|------|:----:|
| 신청일 | 구매 신청한 날짜 | ✅ |
| 신청번호 | 자동 생성 (1부터 시작) | 자동 |
| 신청인 | 신청한 사람 이름 | ✅ |
| 카테고리 | 가방/악세사리/의류/신발/시계/기타 | ✅ |
| 사진 첨부 | 제품 이미지 파일 (핸드폰/PC) | ❌ |
| 구매 URL | 제품 구매 페이지 링크 | ✅ |
| 대표 제품명 | 제품 이름 | ✅ |
| 금액 | 위안화(¥) 가격 | ✅ |
| 구매여부 | 구매완료 또는 미구매 | ✅ |
| 배송 단계 | 출고예정, 출고, 출고완료 | ✅ |
| 대표 제품명 | 제품 이름 | ✅ |
| 금액(위안) | 위안화 가격 | ✅ |
| 구매여부 | 구매완료 또는 미구매 | ✅ |
| 배송 단계 | 출고예정, 출고, 출고완료 | ✅ |

## 🌐 배포하기

**Vercel (권장)** - 가장 쉽고 빠른 배포 방법

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 Import
3. 자동 배포 완료!

자세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.

##같은 브라우저에서 접속하면 모두 같은 데이터 공유
- 정기적으로 데이터 백업 권장 (내보내기 기능 사용)

### 📡 진정한 다중 사용자 환경을 위해

여러 명이 **다른 기기에서** 동시에 데이터를 공유하려면:
- **Firebase Firestore** (무료 시작 가능)
- **Supabase** (PostgreSQL 기반)
- **MongoDB Atlas** (NoSQL)

위 서비스 중 하나를 연동하면 실시간 동기화가 가능합니다.
현재 **브라우저 로컬스토리지**를 사용합니다:
- 서버 없이 작동
- 빠르고 간단
- 브라우저별 독립 데이터
- 정기적으로 데이터 백업 권장 (내보내기 기능 사용)

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: LocalStorage
- **Deployment**: Vercel / Netlify

## 📱 스크린샷 미리보기

구매 등록 폼과 목록 관리를 한 화면에서 모두 처리할 수 있습니다.

## � 이미지 업로드 방법

### 방법 1: 파일 선택
- "파일 선택" 버튼 클릭 → 이미지 선택

### 방법 2: 드래그 앤 드롭
- 이미지 파일을 드래그해서 점선 영역에 드롭

### 방법 3: 붙여넣기
1. 이미지를 복사 (스크린샷 또는 다른 곳에서)
2. 점선 영역을 클릭
3. `Ctrl+V` (Windows) 또는 `Cmd+V` (Mac) 누르기

### 핸드폰에서
- "파일 선택" → "카메라" 선택하여 즉시 촬영
- 또는 갤러리에서 선택

## �🔒 보안

- XSS 방지 헤더 설정
- HTTPS 강제 (프로덕션)
- 안전한 외부 이미지 로딩

## 📞 문제 해결

**Q: 이미지가 표시되지 않아요**
- 이미지 파일이 5MB 이하인지 확인하세요
- JPG, PNG 등 일반 이미지 형식을 사용하세요
- 핸드폰에서는 카메라로 직접 촬영 가능합니다

**Q: 데이터가 사라졌어요**
- 브라우저 캐시를 삭제하면 데이터가 사라집니다
- 정기적으로 "데이터 내보내기" 기능으로 백업하세요

**Q: 다른 사람과 데이터를 공유하고 싶어요**
- 현재 버전은 로컬 전용입니다
- 공유 기능이 필요하면 데이터베이스 연동이 필요합니다 (Firebase, Supabase 등)

## 📄 라이선스

MIT

## 🤝 기여

이슈와 PR을 환영합니다!

---

Made with ❤️ for Korea & China markets


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
