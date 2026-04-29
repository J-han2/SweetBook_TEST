# DreamArchive

DreamArchive는 꿈을 기록하고, 다시 찾아보고, 여러 기록을 모아 책 초안과 주문으로 확장할 수 있는 서비스입니다.

이 프로젝트는 다음 구성으로 실행됩니다.

- FastAPI 백엔드
- Next.js 프론트엔드
- SQLite 데이터베이스
- 로컬 LLM GGUF 모델

중요:

- 모델 파일은 Git LFS로 관리됩니다.
- 반드시 `git clone` 후 `git lfs pull`까지 실행해야 합니다.
- GitHub 웹에서 ZIP만 다운로드하면 모델 파일이 빠져 실행에 실패할 수 있습니다.
- 첫 빌드 시에는 Docker Hub에서 베이스 이미지를 받아와야 하므로 인터넷 연결이 필요합니다.

저장소 주소:

```text
https://github.com/J-han2/SweetBook_TEST.git
```

실행 후 접속 주소:

- 프론트엔드: `http://localhost:3000`
- 백엔드 Swagger: `http://localhost:8000/docs`
- 백엔드 Health Check: `http://localhost:8000/health`

## 공통 준비 사항

모든 운영체제에서 아래 도구가 필요합니다.

- `git`
- `git lfs`
- `docker`
- `docker compose`

권장 환경:

- Windows: Docker Desktop + PowerShell
- Linux: Docker Engine + Docker Compose plugin
- macOS: Docker Desktop

## 1. Windows 실행 방법

권장 방식은 PowerShell에서 프로젝트 루트로 이동한 뒤 실행하는 것입니다.

### 1-1. 저장소 클론

```powershell
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
```

### 1-2. Git LFS 초기화 및 모델 받기

최초 1회:

```powershell
git lfs install
```

모델 파일 받기:

```powershell
git lfs pull
```

모델 파일 확인:

```powershell
Get-Item .\models\qwen2.5-0.5b-instruct-q4_k_m.gguf
```

정상이라면 수백 MB 크기의 파일이 보여야 합니다.

### 1-3. 환경 변수 파일 생성

```powershell
Copy-Item .env.example .env
```

기본값 그대로 실행 가능합니다.

### 1-4. 배포용 실행

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

이 스크립트는 다음 순서로 동작합니다.

1. Windows Docker daemon 연결 시도
2. 연결 실패 시 WSL 내부 Docker로 자동 fallback
3. `docker compose up -d` 실행
4. API와 프론트엔드가 실제로 응답할 때까지 대기

참고:

- `Local Docker daemon was not reachable. Falling back to WSL Docker...` 문구는 오류가 아니라 자동 전환 안내입니다.
- 이 문구 뒤에 컨테이너가 계속 올라오면 정상입니다.

### 1-5. 실행 확인

```powershell
Invoke-WebRequest http://localhost:8000/health -UseBasicParsing
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
```

그리고 브라우저에서 아래 주소를 엽니다.

- `http://localhost:3000`
- `http://localhost:8000/docs`

### 1-6. Windows에서 PSSecurityException 이 발생하는 경우

PowerShell 실행 정책 때문에 `.ps1` 스크립트가 차단된 것입니다.

README의 Windows 명령은 모두 아래 방식으로 실행하면 됩니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up.ps1
```

진단 스크립트도 같은 방식으로 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-doctor.ps1
```

### 1-7. Docker 연결 진단

Windows에서 Docker 연결이 되지 않으면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-doctor.ps1
```

## 2. Linux 실행 방법

예시는 Ubuntu 기준입니다.

### 2-1. 저장소 클론

```bash
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
```

### 2-2. Git LFS 초기화 및 모델 받기

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
ls -lh models/qwen2.5-0.5b-instruct-q4_k_m.gguf
```

### 2-3. 환경 변수 파일 생성

```bash
cp .env.example .env
```

### 2-4. 배포용 실행

```bash
docker compose up -d
```

설명:

- 처음 실행이고 이미지가 없으면 Docker가 이미지를 빌드합니다.
- 이미 한 번 빌드가 끝난 환경에서는 기존 이미지를 사용해 바로 실행됩니다.

### 2-5. 실행 확인

```bash
docker compose ps
curl http://localhost:8000/health
curl -I http://localhost:3000
```

정상이라면:

- API health 응답: `{"status":"ok"}`
- 프론트엔드 응답: `HTTP/1.1 200 OK`

## 3. macOS 실행 방법

Apple Silicon / Intel 모두 같은 방식으로 실행할 수 있습니다.

### 3-1. 저장소 클론

```bash
git clone https://github.com/J-han2/SweetBook_TEST.git
cd SweetBook_TEST
```

### 3-2. Git LFS 초기화 및 모델 받기

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
ls -lh models/qwen2.5-0.5b-instruct-q4_k_m.gguf
```

### 3-3. 환경 변수 파일 생성

```bash
cp .env.example .env
```

### 3-4. 배포용 실행

```bash
docker compose up -d
```

### 3-5. 실행 확인

```bash
docker compose ps
curl http://localhost:8000/health
curl -I http://localhost:3000
```

## 재실행 / 종료 / 초기화

### 이미 한 번 빌드한 뒤 다시 실행

```bash
docker compose up -d
```

Windows PowerShell에서는:

```powershell
powershell -ExecutionPolicy Bypass -Command "& { .\scripts\up.ps1 -ComposeArgs @('up', '-d') }"
```

### 코드 변경으로 이미지를 다시 빌드해야 할 때

Linux / macOS:

```bash
docker compose up --build -d
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -Command "& { .\scripts\up.ps1 -ComposeArgs @('up', '--build', '-d') }"
```

### 종료

```bash
docker compose down
```

### 볼륨까지 포함해 완전 초기화

```bash
docker compose down -v
```

초기화 후 다시 실행하면 seed 데이터가 새로 생성됩니다.

## 개발용 실행 방법

개발용 구성은 `docker-compose.debug.yml`을 사용합니다.

특징:

- 소스 코드 바인드 마운트
- API `--reload`
- Web `next dev`

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\up-debug.ps1
```

### Linux / macOS

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## 현재 배포 구성 특징

- API 이미지 안에 GGUF 모델이 포함됩니다.
- 프론트는 production build 후 `next start`로 실행됩니다.
- 프론트는 DB에 직접 접근하지 않고 백엔드 API만 호출합니다.
- 데이터베이스와 업로드 파일은 Docker volume으로 유지됩니다.

사용되는 volume:

- `sweetbook_test_api_data`
- `sweetbook_test_api_runtime_uploads`

## 트러블슈팅

### 1. 모델 파일이 없다고 나오는 경우

```bash
git lfs pull
```

다시 실행한 뒤 모델 파일 크기를 확인하세요.

### 2. `docker compose up --build -d` 중 베이스 이미지를 못 받는 경우

예시 오류:

- `failed to resolve source metadata for docker.io/...`
- `dial tcp ...:443: i/o timeout`
- `no route to host`

이 경우는 프로젝트 코드 문제가 아니라 Docker Hub 네트워크 연결 문제입니다.

확인:

```bash
docker compose build
```

조치:

- 인터넷 연결 확인
- Docker Desktop 재시작
- VPN / 프록시 / 사내망 제한 확인
- 잠시 후 다시 시도

이미 한 번 빌드가 끝난 환경이라면:

```bash
docker compose up -d
```

로컬 캐시된 이미지로 재기동할 수 있습니다.

### 3. 컨테이너 상태 확인

```bash
docker compose ps
```

### 4. 로그 확인

```bash
docker compose logs -f
```

특정 서비스만 보려면:

```bash
docker compose logs -f api
docker compose logs -f web
```

## 빠른 실행 요약

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
