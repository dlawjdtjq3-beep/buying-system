# Firebase Firestore 보안 규칙 설정

## 문제
충전 내역이 저장되지 않는 문제는 Firestore 보안 규칙 때문입니다.

## 해결 방법

### 1단계: Firebase 콘솔 접속
https://console.firebase.google.com

### 2단계: 프로젝트 선택
- `buying-bf9e3` 프로젝트 클릭

### 3단계: Firestore Database 규칙 수정
1. 왼쪽 메뉴에서 **Firestore Database** 클릭
2. 상단 탭에서 **규칙(Rules)** 클릭
3. 아래 규칙으로 **전체 교체**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 구매 목록
    match /purchases/{document=**} {
      allow read, write: if true;
    }
    
    // 충전 내역 (추가!)
    match /chargeHistory/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 4단계: 게시
- **게시(Publish)** 버튼 클릭

### 5단계: 확인
- 웹사이트 새로고침 후 충전 테스트
- F12 → Console 탭에서 에러 확인

## 완료!
이제 충전 내역이 모든 컴퓨터에서 실시간으로 동기화됩니다.

## 참고
현재 설정은 개발/테스트용입니다. 실제 운영 시에는 인증(Authentication)을 추가하는 것이 좋습니다.
