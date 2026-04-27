# DreamArchive

꿈을 기록하고, 태그를 붙이고, 장면을 남기고, 한 권의 책으로 엮는 꿈일기 서비스입니다.  
이 서비스의 중심은 꿈일기 콘텐츠 아카이브이며, 책 만들기와 주문은 그 콘텐츠를 확장하는 부가 기능입니다.

## 서비스 소개

DreamArchive는 꿈일기를 기록하고 다시 탐색하는 경험을 중심에 둔 콘텐츠 서비스입니다.

- 꿈일기 CRUD
- 로컬 sLLM 기반 태그 자동 생성
- 검색, 태그 필터, 날짜 정렬
- 업로드 이미지와 대표 이미지 표시
- Book Draft 생성, 순서 편집, Finalize
- Order 생성, 상태 관리, JSON export

## 실행 방식

이 프로젝트는 로컬 GGUF 모델 파일을 API 이미지에 **포함한 상태**로 동작하도록 구성했습니다.  
즉, 모델을 별도로 내려받거나 경로를 마운트하지 않아도 됩니다.

Git 저장소로 배포할 때는 모델 파일이 GitHub 일반 파일 한도를 넘기므로 **Git LFS**로 추적합니다.  
따라서 GitHub에서 clone하는 경우에는 `git lfs`가 설치된 환경을 권장합니다.

실행 목표는 다음과 같습니다.

- `git clone`
- `docker compose up --build`
- 브라우저 접속

`.env`는 필수가 아닙니다. 기본값만으로 바로 실행됩니다.

## 실행 방법

### Linux

전제:

- Docker Engine 실행 중
- Docker Compose plugin 설치 또는 `docker-compose` 바이너리 설치
- GitHub에서 clone하는 경우 `git lfs` 설치 권장

```bash
git clone <repo-url>
cd SweetBook_TEST
docker compose up --build
```

`docker-compose` 환경이라면 아래 명령도 가능합니다.

```bash
docker-compose up --build
```

접속 주소:

- Frontend: `http://localhost:3000`
- Backend Docs: `http://localhost:8000/docs`

### Windows

전제:

- Docker Desktop 또는 Docker Engine이 정상 실행 중
- 현재 터미널의 `docker` CLI가 실행 중인 Docker daemon에 연결되어 있어야 함
- GitHub에서 clone하는 경우 Git for Windows + Git LFS 설치 권장

PowerShell:

```powershell
git clone <repo-url>
cd SweetBook_TEST
docker compose up --build
```

레거시 Compose 바이너리를 쓰는 환경이라면:

```powershell
docker-compose up --build
```

접속 주소:

- Frontend: `http://localhost:3000`
- Backend Docs: `http://localhost:8000/docs`

### Windows + WSL2 Docker Engine

Docker Desktop 없이 WSL2 내부 Docker Engine을 쓰는 경우에는 WSL 터미널에서 실행하면 됩니다.

```bash
git clone <repo-url>
cd SweetBook_TEST
docker compose up --build
```

Windows에 이미 clone한 레포를 그대로 쓰고 싶다면:

```bash
cd /mnt/c/Users/<사용자명>/Desktop/ws/SweetBook_TEST
docker compose up --build
```

중요:

- `/mnt/c/...` 경로는 **WSL 리눅스 셸 전용 경로**입니다.
- PowerShell에서 바로 `cd /mnt/c/...`를 입력하면 동작하지 않습니다.
- PowerShell에서 시작할 때는 먼저 WSL로 들어간 뒤 위 경로를 사용해야 합니다.

예시:

```powershell
wsl -d Ubuntu-24.04
```

그 다음 WSL 셸에서:

```bash
cd /mnt/c/Users/<사용자명>/Desktop/ws/SweetBook_TEST
docker compose up --build
```

PowerShell 한 줄 실행 예시:

```powershell
wsl -d Ubuntu-24.04 -- sh -lc "cd /mnt/c/Users/<사용자명>/Desktop/ws/SweetBook_TEST && docker compose up --build"
```

## 기본 동작

실행 직후 아래 흐름을 로그인 없이 바로 확인할 수 있습니다.

- 홈 화면
- 꿈일기 목록, 상세, 검색, 태그 필터
- 꿈일기 작성/수정
- Book Draft 생성과 Finalize
- Order 목록, 상세, 상태 변경
- Order JSON export

시드 데이터는 자동으로 주입됩니다.

- 한국어 꿈일기 10개 이상
- Tag 데이터
- Book Draft 1~2개
- Order 1~2개

더미 데이터의 제목과 본문은 [SEED_DATA.md](./SEED_DATA.md)에 정리되어 있습니다.

## 모델 포함 방식

이번 구성에서는 로컬 sLLM 모델을 **저장소의 `models/` 디렉터리와 API 이미지 안에 포함**하도록 설계했습니다.

- 번들 모델 파일: `models/qwen2.5-0.5b-instruct-q4_k_m.gguf`
- 컨테이너 내부 경로: `/app/models/qwen2.5-0.5b-instruct-q4_k_m.gguf`

GitHub 업로드를 위해 이 모델 파일은 Git LFS로 추적합니다.

그래서 런타임에 외부에서 모델을 내려받지 않습니다.

### 왜 로컬 sLLM으로 태그 생성을 구현했는가

- 과제 요구사항이 외부 API 금지, Mock AI 금지이기 때문입니다.
- 태그 생성은 실제 추론을 사용하되, 인터넷 없이 재현 가능해야 했습니다.

### 왜 자유 생성이 아니라 허용 태그셋 선택 방식인가

- 꿈일기 서비스의 핵심은 기록 후 탐색과 큐레이션입니다.
- 자유 생성 태그는 품질과 일관성이 흔들리기 쉬워서 검색/필터/정렬 경험을 해칩니다.
- 그래서 허용 태그셋 안에서 최대 5개를 고르게 하고, 서버가 최종 검증 후 저장합니다.

## 기술 스택과 선택 이유

### Frontend

- Next.js 14
- TypeScript
- Tailwind CSS
- TanStack Query

선택 이유:

- 페이지 흐름이 명확하고 과제 제출용 UI를 빠르게 구성하기 좋습니다.
- DreamEntry, BookDraft, Order 스키마를 타입으로 명확히 맞추기 쉽습니다.
- CRUD 이후 invalidate와 재조회 흐름을 안정적으로 처리할 수 있습니다.

### Backend

- FastAPI
- Python 3.11
- SQLAlchemy 2.x
- Alembic

선택 이유:

- API 문서화와 스키마 검증이 빠르고 명확합니다.
- 로컬 sLLM 연동과 파일 업로드, SQLite 기반 구현에 적합합니다.

### DB

- SQLite

왜 SQLite를 사용했는가:

- 채용 과제 제출용으로 실행 안정성과 단순성이 중요했습니다.
- 별도 DB 컨테이너 없이 `docker compose up` 한 번으로 재현하기 쉽습니다.

## 설계 의도

### 왜 꿈일기 주제인가

꿈일기는 감정, 상징, 사건, 관계가 함께 섞이는 비정형 콘텐츠입니다.  
그래서 태그 생성, 탐색, 큐레이션, 책 초안 만들기까지 자연스럽게 연결할 수 있습니다.

### 왜 콘텐츠 서비스가 중심이고 책은 부가 기능인가

이 과제의 핵심 가치는 꿈일기를 기록하고 다시 보는 경험입니다.  
책 만들기와 주문은 이미 쌓인 콘텐츠를 재구성하는 흐름으로 배치해야 서비스의 중심이 흔들리지 않습니다.

### 왜 BookDraft -> Order 흐름인가

꿈일기 선택, 순서 편집, 표지 문구 정리 같은 큐레이션 단계가 먼저 있어야 합니다.  
그래서 바로 주문으로 가지 않고, Draft를 거쳐 Finalize 후 Order로 전환하도록 설계했습니다.

## 구현 범위

### Lv1

- DreamEntry CRUD
- 로컬 sLLM 태그 생성
- 업로드 이미지 저장
- 대표 이미지 표시
- 검색, 태그 필터, 날짜 정렬
- 상세 페이지

### Lv2

- 여러 꿈일기를 선택해 Book Draft 생성
- 제목, 부제, 표지 문구 입력
- 순서 변경
- Draft -> Finalized
- Order 생성
- 주문 목록/상세
- 주문 상태 변경

### Lv3

- 주문 단위 JSON export
- 책 정보, 순서, 본문, 태그, 이미지 메타데이터 포함

## 이미지 처리 방식

### 사용자 업로드 이미지

- 꿈일기 작성/수정 시 업로드 가능
- `apps/api/storage/uploads/runtime`에 저장
- 카드와 상세 페이지에서 표시

### 대표 이미지

- 업로드 이미지가 있으면 우선 사용
- 없으면 태그/분위기 기반 placeholder 자산 사용

이미지 생성은 외부 API를 사용하지 않았고, 태그 기반 placeholder 연결 방식으로 구현했습니다.

## 주요 API

### Dream Entries

- `GET /api/dream-entries`
- `GET /api/dream-entries/{id}`
- `POST /api/dream-entries`
- `PATCH /api/dream-entries/{id}`
- `DELETE /api/dream-entries/{id}`

### Tags

- `GET /api/tags`
- `GET /api/tags/popular`

### Book Drafts

- `POST /api/book-drafts`
- `GET /api/book-drafts`
- `GET /api/book-drafts/{id}`
- `PATCH /api/book-drafts/{id}`
- `PATCH /api/book-drafts/{id}/items/reorder`
- `POST /api/book-drafts/{id}/finalize`

### Orders

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{id}`
- `PATCH /api/orders/{id}/status`
- `GET /api/orders/{id}/export`

## 폴더 구조

```text
root/
  apps/
    api/
    web/
  models/
  scripts/
  docker-compose.yml
  .env.example
  README.md
```

## .env 사용

기본값으로 바로 실행되므로 `.env`는 필수는 아닙니다.  
포트 등을 바꾸고 싶을 때만 `.env.example`을 복사해 사용하면 됩니다.

```env
WEB_PORT=3000
API_PORT=8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=sqlite:////app/data/dreamarchive.db
LLM_CHAT_FORMAT=chatml
LLM_N_CTX=2048
```

`LLM_MODEL_PATH`는 Compose에서 번들 모델 경로로 고정합니다.  
즉, `.env`가 있어도 모델 경로를 따로 맞출 필요가 없습니다.

## AI 도구 사용 내역

- OpenAI Codex 계열 코딩 에이전트
- 사용 범위:
  - 모노레포 구조 정리
  - FastAPI / Next.js 구현 보조
  - UI 수정
  - README 정리

서비스 런타임에서는 OpenAI API, Claude API, Gemini API 등 외부 AI API를 사용하지 않습니다.

## 제출 메모

현재 구성은 “모델 포함 방식”을 우선으로 맞춘 상태입니다.  
따라서 로컬 모델 준비 없이 `docker compose up --build`만으로 서비스가 동작합니다.

다만 GitHub에서는 100MB 초과 파일을 일반 Git으로 push할 수 없기 때문에, 모델 파일은 Git LFS로 추적합니다.
