# DreamArchive

DreamArchive는 꿈을 기록하고 다시 찾아보고, 여러 기록을 모아 책 초안과 주문으로 확장할 수 있는 서비스입니다.

이 저장소는 **로컬 LLM 모델을 포함한 Docker 배포 구성**을 기본값으로 사용합니다.  
아래 README는 **`git clone` 이후 Windows / Linux / macOS에서 그대로 따라 하면 실행 가능한 기준**으로 작성되어 있습니다.

## 핵심 전제

- 이 저장소는 **Git LFS**로 관리되는 GGUF 모델 파일을 사용합니다.
- 따라서 반드시 **`git clone` + `git lfs pull`** 방식으로 받아야 합니다.
- GitHub 웹에서 ZIP 다운로드만 받으면 모델 파일이 정상 포함되지 않아 실행에 실패할 수 있습니다.
- 첫 빌드 시에는 Docker Hub에서 베이스 이미지를 내려받아야 하므로 인터넷 연결이 필요합니다.

## 공통 준비물

모든 운영체제에서 아래 도구가 필요합니다.

- `git`
- `git lfs`
- `docker`
- `docker compose`

추가 설명:

- Windows: `Docker Desktop` 권장
- macOS: `Docker Desktop` 권장
- Linux: `Docker Engine + Docker Compose plugin` 권장

## 실행 후 접속 주소

컨테이너가 정상 실행되면 아래 주소로 접속합니다.

- 프론트엔드: `http://localhost:3000`
- 백엔드 Swagger: `http://localhost:8000/docs`
- 백엔드 Health: `http://localhost:8000/health`

## 1. Windows 실행 방법

권장 환경:

- PowerShell
- Docker Desktop
- Git for Windows
- Git LFS

### 1-1. 저장소 클론

```powershell
git clone <REPO_URL>
cd SweetBook_TEST
```

### 1-2. Git LFS 준비

최초 1회:

```powershell
git lfs install
```

모델 파일 받기:

```powershell
git lfs pull
```

모델 파일이 정상인지 확인:

```powershell
Get-Item .\models\qwen2.5-0.5b-instruct-q4_k_m.gguf
```

정상이라면 파일 크기가 매우 크게 표시됩니다.  
작은 텍스트 파일처럼 보이면 LFS가 제대로 내려오지 않은 상태입니다.

### 1-3. 환경 변수 파일 준비

```powershell
Copy-Item .env.example .env
```

기본값만으로 바로 실행 가능합니다.

### 1-4. 실행

```powershell
.\scripts\up.ps1
```

이 스크립트는 다음 순서로 동작합니다.

1. Windows Docker daemon 연결 시도
2. 실패하면 WSL 내부 Docker 연결 시도
3. 가능한 쪽으로 `docker compose up --build -d` 실행

### 1-5. 실행 확인

브라우저에서 아래 주소를 확인합니다.

- `http://localhost:3000`
- `http://localhost:8000/docs`

### 1-6. Docker 연결 문제가 있을 때

```powershell
.\scripts\docker-doctor.ps1
```

## 2. Linux 실행 방법

권장 환경:

- Ubuntu 22.04+ 또는 동등한 Docker 지원 배포판
- Docker Engine
- Docker Compose plugin
- Git LFS

### 2-1. 저장소 클론

```bash
git clone <REPO_URL>
cd SweetBook_TEST
```

### 2-2. Git LFS 준비

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

### 2-3. 환경 변수 파일 준비

```bash
cp .env.example .env
```

### 2-4. 실행

```bash
docker compose up --build -d
```

### 2-5. 실행 확인

```bash
docker compose ps
curl http://localhost:8000/health
```

그 다음 브라우저에서 아래 주소를 확인합니다.

- `http://localhost:3000`
- `http://localhost:8000/docs`

## 3. macOS 실행 방법

권장 환경:

- macOS
- Docker Desktop for Mac
- Git
- Git LFS

Apple Silicon / Intel 모두 동일 절차로 실행 가능합니다.

### 3-1. 저장소 클론

```bash
git clone <REPO_URL>
cd SweetBook_TEST
```

### 3-2. Git LFS 준비

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

### 3-3. 환경 변수 파일 준비

```bash
cp .env.example .env
```

### 3-4. 실행

```bash
docker compose up --build -d
```

### 3-5. 실행 확인

```bash
docker compose ps
curl http://localhost:8000/health
```

그 다음 브라우저에서 아래 주소를 확인합니다.

- `http://localhost:3000`
- `http://localhost:8000/docs`

## 종료 방법

모든 운영체제 공통:

```bash
docker compose down
```

## 데이터 초기화 방법

이 프로젝트는 아래 Docker volume에 데이터를 저장합니다.

- `api_data`
- `api_runtime_uploads`

모든 데이터를 완전히 초기화하려면:

```bash
docker compose down -v
```

다시 실행하면 시드 데이터와 기본 콘텐츠가 다시 생성됩니다.

## 개발용 실행 방법

개발용 구성은 `docker-compose.debug.yml`을 사용합니다.  
이 모드에서는 소스 코드가 컨테이너에 바인드 마운트되고, API/웹이 reload 모드로 실행됩니다.

### Windows

```powershell
.\scripts\up-debug.ps1
```

### Linux / macOS

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## 현재 배포 구성 특징

- API 이미지 안에 GGUF 로컬 모델이 포함됩니다.
- 웹은 production build 후 `next start`로 실행됩니다.
- 프론트는 DB에 직접 접근하지 않고 백엔드 API만 호출합니다.
- SQLite DB와 업로드 이미지는 Docker volume으로 유지됩니다.

## 문제 해결

### 1. 모델 파일이 없다고 나오는 경우

아래 명령을 다시 실행합니다.

```bash
git lfs pull
```

### 2. Docker 빌드 중 베이스 이미지를 못 받아오는 경우

아래와 비슷한 에러가 날 수 있습니다.

- `failed to resolve source metadata for docker.io/...`
- `connect: no route to host`

이 경우는 프로젝트 코드 문제가 아니라 **현재 환경에서 Docker Hub로 네트워크 연결이 되지 않는 상태**입니다.

확인 방법:

```bash
docker compose build
```

조치:

- Docker Desktop / Docker daemon 재시작
- VPN / 프록시 / 사내망 제한 확인
- 잠시 후 다시 시도

### 3. 컨테이너 상태 확인

```bash
docker compose ps
```

### 4. 로그 확인

```bash
docker compose logs -f
```

특정 서비스만 보고 싶으면:

```bash
docker compose logs -f api
docker compose logs -f web
```

## 빠른 실행 요약

### Windows

```powershell
git clone <REPO_URL>
cd SweetBook_TEST
git lfs install
git lfs pull
Copy-Item .env.example .env
.\scripts\up.ps1
```

### Linux

```bash
git clone <REPO_URL>
cd SweetBook_TEST
git lfs install
git lfs pull
cp .env.example .env
docker compose up --build -d
```

### macOS

```bash
git clone <REPO_URL>
cd SweetBook_TEST
git lfs install
git lfs pull
cp .env.example .env
docker compose up --build -d
```

위 절차를 따르면 어떤 운영체제에서도 같은 콘텐츠를 실행할 수 있습니다.
