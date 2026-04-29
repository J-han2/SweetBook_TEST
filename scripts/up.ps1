param(
  [string[]]$ComposeArgs = @("up", "-d")
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

function Should-WaitForServices {
  return ($ComposeArgs.Count -gt 0 -and $ComposeArgs[0] -eq "up")
}

function Test-HttpReady {
  param(
    [string]$Url
  )

  try {
    $null = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 5
    return $true
  } catch {
    return $false
  }
}

function Wait-ForServices {
  if (-not (Should-WaitForServices)) {
    return
  }

  $checks = @(
    @{ Name = "API"; Url = "http://localhost:8000/health" },
    @{ Name = "WEB"; Url = "http://localhost:3000" }
  )

  foreach ($check in $checks) {
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
      if (Test-HttpReady -Url $check.Url) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 2
    }

    if (-not $ready) {
      Write-Host "$($check.Name) did not become reachable in time: $($check.Url)" -ForegroundColor Yellow
      return
    }
  }

  Write-Host "API and WEB are reachable." -ForegroundColor Green
  Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
  Write-Host "Backend:  http://localhost:8000/docs" -ForegroundColor Green
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
  $drive = $repoRoot.Substring(0, 1).ToLowerInvariant()
  $rest = $repoRoot.Substring(2) -replace "\\", "/"
  $linuxRoot = "/mnt/$drive$rest"

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
  if ($LASTEXITCODE -eq 0) {
    Wait-ForServices
  }
  exit $LASTEXITCODE
}

if (Test-WslDockerDaemon) {
  Write-Host "Local Docker daemon was not reachable. Falling back to WSL Docker..." -ForegroundColor Yellow
  Invoke-WslCompose
  if ($LASTEXITCODE -eq 0) {
    Wait-ForServices
  }
  exit $LASTEXITCODE
}

Write-Host "No reachable Docker daemon was found." -ForegroundColor Red
Write-Host "Run .\scripts\docker-doctor.ps1 for diagnostics." -ForegroundColor Yellow
exit 1
