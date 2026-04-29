# DreamArchive

DreamArchive는 꿈을 기록하고, 다시 찾아보고, 여러 기록을 모아 책 초안과 주문으로 확장할 수 있는 서비스입니다.

- 프론트엔드: Next.js
- 백엔드: FastAPI
- 데이터베이스: SQLite
- 로컬 LLM: GGUF 모델 포함

## 실행 주소

- 프론트엔드: `http://localhost:3000`
- 백엔드 문서: `http://localhost:8000/docs`
- 백엔드 헬스 체크: `http://localhost:8000/health`

## 1. 먼저 설치할 것

모든 운영체제에서 아래 도구가 필요합니다.

- Git
- Git LFS
- Docker
- Docker Compose

### Windows

1. Docker Desktop 설치  
   https://docs.docker.com/desktop/setup/install/windows-install/
2. Git for Windows 설치  
   https://git-scm.com/download/win
3. Git LFS 설치  
   https://git-lfs.com/

설치 확인:

```powershell
git --version
git lfs version
docker version
docker compose version
```

### macOS

1. Docker Desktop 설치  
   https://docs.docker.com/desktop/setup/install/mac-install/
2. Git 설치  
   https://git-scm.com/download/mac
3. Git LFS 설치  
   https://git-lfs.com/

설치 확인:

```bash
git --version
git lfs version
docker version
docker compose version
```

### Linux

Ubuntu 기준 권장 문서:

- Docker Engine: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin: https://docs.docker.com/compose/install/linux/
- Git LFS: https://git-lfs.com/

설치 확인:

```bash
git --version
git lfs version
docker version
docker compose version
```

## 2. 저장소 받기

```bash
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
```

권장:

- Windows에서는 `OneDrive\Desktop` 같은 동기화 폴더보다 `C:\dev\SweetBook_TEST` 같은 일반 경로를 권장합니다.
- 동기화 폴더에서는 checkout과 LFS 파일 처리 속도가 크게 느려질 수 있습니다.

### Git LFS 초기화와 모델 받기

최초 1회:

```bash
git lfs install
```

모델 파일 받기:

```bash
git lfs pull
```

모델 파일 확인:

```bash
ls models
```

Windows PowerShell에서는:

```powershell
Get-Item .\models\qwen2.5-0.5b-instruct-q4_k_m.gguf
```

## 3. 환경 변수 파일 만들기

기본 설정으로 바로 실행할 수 있습니다.

### Windows

```powershell
Copy-Item .env.example .env
```

### Linux / macOS

```bash
cp .env.example .env
```

## 4. 바로 실행하기

현재 배포용 `docker-compose.yml`은 사전 빌드 이미지를 내려받아 실행하는 구조입니다.  
즉, 일반 사용자는 로컬에서 직접 빌드하지 않아도 됩니다.

### Windows

PowerShell 실행 정책 오류를 피하기 위해 아래 명령을 그대로 사용합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

동작 방식:

1. Windows Docker daemon 연결 시도
2. 실패하면 WSL Docker로 자동 전환
3. 최신 배포 이미지를 pull
4. 컨테이너 실행 후 서비스 응답까지 대기

정상 종료 메시지:

```text
API and WEB are reachable.
Frontend: http://localhost:3000
Backend:  http://localhost:8000/docs
```

### Linux

```bash
docker compose up -d
```

### macOS

```bash
docker compose up -d
```

## 5. 실행 확인

브라우저에서 아래 주소를 엽니다.

- `http://localhost:3000`
- `http://localhost:8000/docs`

또는 터미널에서 확인합니다.

```bash
docker compose ps
curl http://localhost:8000/health
curl -I http://localhost:3000
```

정상 응답 예시:

- API: `{"status":"ok"}`
- WEB: `HTTP/1.1 200 OK`

## 6. 포트 변경 방법

포트를 바꾸려면 `.env` 파일의 값을 수정합니다.

```env
WEB_PORT=3000
API_PORT=8000
FRONTEND_ORIGIN=http://localhost:3000
INTERNAL_API_BASE_URL=http://api:8000
IMAGE_TAG=latest
```

설명:

- `WEB_PORT`: 브라우저에서 접속할 프론트엔드 포트
- `API_PORT`: 브라우저 또는 외부 도구에서 접속할 백엔드 포트
- `FRONTEND_ORIGIN`: 백엔드 CORS 허용 주소
- `INTERNAL_API_BASE_URL`: Docker 내부에서 웹이 API를 호출할 주소  
  일반적으로 수정할 필요가 없습니다.
- `IMAGE_TAG`: 배포 이미지 태그

예시: 프론트 `3100`, 백엔드 `8100`

```env
WEB_PORT=3100
API_PORT=8100
FRONTEND_ORIGIN=http://localhost:3100
INTERNAL_API_BASE_URL=http://api:8000
IMAGE_TAG=latest
```

포트 변경 후 재실행:

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1 -ComposeArgs @('down')
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

### Linux / macOS

```bash
docker compose down
docker compose up -d
```

## 7. 종료 / 재시작 / 초기화

### 종료

```bash
docker compose down
```

### 다시 시작

```bash
docker compose up -d
```

### 볼륨까지 모두 초기화

```bash
docker compose down -v
```

초기화 후 다시 실행하면 시드 데이터가 새로 만들어집니다.

## 8. 개발용 실행

개발용은 소스 바인드 마운트 + 로컬 빌드 + 핫 리로드 구조입니다.

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up-debug.ps1
```

### Linux / macOS

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up --build
```

## 9. 관리자 페이지

사용자 페이지 실행 후 `My Books` 화면에서 `관리자 페이지로 이동` 버튼을 누르면 `/admin`으로 들어갈 수 있습니다.

## 10. 문제 해결

### 1) PowerShell에서 PSSecurityException 발생

반드시 아래처럼 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

### 2) `Local Docker daemon was not reachable. Falling back to WSL Docker...`

오류가 아니라 자동 전환 안내입니다.  
이후 컨테이너가 계속 올라오면 정상입니다.

### 3) 이미지 pull 실패

예시:

- `failed to resolve source metadata`
- `i/o timeout`
- `no route to host`
- `unauthorized`

의미:

- GHCR 또는 외부 레지스트리 네트워크 문제
- 또는 Docker 로그인/접속 문제

확인:

```bash
docker compose ps
docker compose logs -f
```

Windows 진단:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-doctor.ps1
```

### 4) 모델 파일이 없다고 나옴

다시 실행:

```bash
git lfs pull
```

## 11. 빠른 시작 요약

### Windows

```powershell
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
git lfs install
git lfs pull
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

### Linux / macOS

```bash
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
git lfs install
git lfs pull
cp .env.example .env
docker compose up -d
```
