# 모집관리 시스템

React + Vite (프론트) / Node.js + Express (백엔드) / PostgreSQL (DB)로 만든 모집 현황 관리 시스템입니다.
여러 사람이 인터넷으로 접속해서 같은 데이터를 함께 보고 입력할 수 있습니다.

## 폴더 구조

```
recruit-system/
  backend/     Express API 서버
  frontend/    React (Vite) 화면
  render.yaml  Render 배포 설정
```

## 1. 로컬에서 실행하기

### PostgreSQL 준비
로컬에 PostgreSQL을 설치하고 데이터베이스를 하나 만듭니다.

```bash
createdb recruit_system
```

### 백엔드

```bash
cd backend
cp .env.example .env      # DATABASE_URL을 본인 환경에 맞게 수정
npm install
npm run migrate           # schema.sql 실행 (테이블 생성 + 담당자 샘플 데이터)
npm run dev                # http://localhost:4000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

프론트엔드는 `/api` 요청을 `vite.config.js`의 프록시를 통해 `http://localhost:4000`으로 전달합니다.

## 2. Render로 무료 배포하기

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Render 대시보드에서 "New" → "Blueprint"를 선택하고 이 저장소를 연결하면 `render.yaml`을 읽어 아래 3개를 자동 생성합니다.
   - PostgreSQL 데이터베이스 (`recruit-system-db`)
   - 백엔드 웹 서비스 (`recruit-system-backend`)
   - 프론트엔드 정적 사이트 (`recruit-system-frontend`)
3. 배포가 끝나면 백엔드 서비스의 Shell 탭에서 한 번만 실행해 테이블을 만듭니다.
   ```bash
   npm run migrate
   ```
4. `recruit-system-frontend` 주소로 접속하면 팀원 누구나 같은 데이터를 보고 입력할 수 있습니다.

Railway를 사용할 경우도 동일한 구조입니다: PostgreSQL 플러그인 추가 → `backend`를 Node 서비스로 배포(`DATABASE_URL` 자동 연결) → `frontend`를 정적 사이트 또는 Node 서비스로 배포하고 `VITE_API_URL`에 백엔드 주소를 넣어주세요.

## 3. 다음 단계로 추가하면 좋은 것

- 로그인/권한 (담당자별로 본인 업체만 입력하게)
- 월요일 자동 리포트 (Render의 Cron Job으로 매주 월요일 이메일/슬랙 발송)
- 업체별 목표 마감일 및 알림
