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
    $distros = (& wsl -l -q 2>$null) | Where-Object { $_ -and $_.Trim() -ne "" }
    if (-not $distros) {
      return $false
    }

    & wsl docker version 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Convert-ToWslPath {
  param(
    [string]$PathValue
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $PathValue
  }

  if (-not [System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue -replace "\\", "/"
  }

  $resolved = (Resolve-Path $PathValue).Path
  $drive = $resolved.Substring(0, 1).ToLowerInvariant()
  $rest = $resolved.Substring(2) -replace "\\", "/"
  return "/mnt/$drive$rest"
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
  $linuxRoot = Convert-ToWslPath $repoRoot

  $wslArgs = [System.Collections.Generic.List[string]]::new()
  $wslArgs.Add("docker")
  $wslArgs.Add("compose")
  $wslArgs.Add("--project-directory")
  $wslArgs.Add($linuxRoot)

  $hasFileArg = $false
  for ($i = 0; $i -lt $ComposeArgs.Count; $i++) {
    $arg = $ComposeArgs[$i]
    if ($arg -in @("-f", "--file")) {
      $hasFileArg = $true
      $wslArgs.Add($arg)
      $i++
      if ($i -ge $ComposeArgs.Count) {
        throw "Compose file path is missing after $arg."
      }
      $wslArgs.Add((Convert-ToWslPath $ComposeArgs[$i]))
      continue
    }

    if ($arg -in @("--env-file", "--project-directory")) {
      $wslArgs.Add($arg)
      $i++
      if ($i -ge $ComposeArgs.Count) {
        throw "Path value is missing after $arg."
      }
      $wslArgs.Add((Convert-ToWslPath $ComposeArgs[$i]))
      continue
    }

    $wslArgs.Add($arg)
  }

  if (-not $hasFileArg) {
    $wslArgs.Insert(4, "-f")
    $wslArgs.Insert(5, "$linuxRoot/docker-compose.yml")
  }

  & wsl @wslArgs
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
