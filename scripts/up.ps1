param(
  [string[]]$ComposeArgs = @("up", "--build")
)

$ErrorActionPreference = "Stop"

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-LocalDockerDaemon {
  if (-not (Test-Command "docker")) {
    return $false
  }

  try {
    & docker version 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Test-WslDockerDaemon {
  if (-not (Test-Command "wsl")) {
    return $false
  }

  try {
    & wsl sh -lc "command -v docker >/dev/null 2>&1 && docker version >/dev/null 2>&1"
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Invoke-LocalCompose {
  if (Test-Command "docker-compose") {
    & docker-compose @ComposeArgs
    return
  }

  if (Test-Command "docker") {
    & docker compose @ComposeArgs
    return
  }

  throw "docker-compose or docker compose was not found."
}

function Invoke-WslCompose {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $linuxRoot = (& wsl wslpath -a $repoRoot).Trim()

  foreach ($arg in $ComposeArgs) {
    if ($arg -match "[`"']") {
      throw "Compose arguments with quotes are not supported by this helper."
    }
  }

  $joinedArgs = $ComposeArgs -join " "
  $command = "cd '$linuxRoot' && docker compose $joinedArgs"
  & wsl sh -lc $command
}

if (Test-LocalDockerDaemon) {
  Write-Host "Using local Docker daemon..." -ForegroundColor Green
  Invoke-LocalCompose
  exit $LASTEXITCODE
}

if (Test-WslDockerDaemon) {
  Write-Host "Local Docker daemon was not reachable. Falling back to WSL Docker..." -ForegroundColor Yellow
  Invoke-WslCompose
  exit $LASTEXITCODE
}

Write-Host "No reachable Docker daemon was found." -ForegroundColor Red
Write-Host "Run .\scripts\docker-doctor.ps1 for diagnostics." -ForegroundColor Yellow
exit 1
