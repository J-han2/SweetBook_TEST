$ErrorActionPreference = "Stop"

function Write-Section($title) {
  Write-Host ""
  Write-Host "[$title]" -ForegroundColor Cyan
}

function Write-Status($label, $ok, $detail) {
  $mark = if ($ok) { "OK  " } else { "FAIL" }
  $color = if ($ok) { "Green" } else { "Red" }
  Write-Host ("{0} {1}" -f $mark, $label) -ForegroundColor $color
  if ($detail) {
    Write-Host ("     {0}" -f $detail)
  }
}

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Invoke-Quiet($scriptBlock) {
  try {
    & $scriptBlock 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

$dockerAvailable = Test-Command "docker"
$dockerComposeV1Available = Test-Command "docker-compose"
$dockerComposeV2Available = $false
$dockerContext = $null
$dockerDaemonAvailable = $false
$wslAvailable = Test-Command "wsl"
$wslDockerAvailable = $false

Write-Section "CLI"
$dockerDetail = if ($dockerAvailable) { (Get-Command docker).Source } else { "docker CLI was not found." }
$dockerComposeV1Detail = if ($dockerComposeV1Available) { (Get-Command docker-compose).Source } else { "Compose V1 binary was not found." }
Write-Status "docker command" $dockerAvailable $dockerDetail
Write-Status "docker-compose command" $dockerComposeV1Available $dockerComposeV1Detail

if ($dockerAvailable) {
  $dockerComposeV2Available = Invoke-Quiet { docker compose version }
}

$dockerComposeV2Detail = if ($dockerComposeV2Available) { "Compose V2 is available." } else { "Compose V2 plugin was not found." }
Write-Status "docker compose plugin" $dockerComposeV2Available $dockerComposeV2Detail

Write-Section "Docker Host"
if ($dockerAvailable) {
  try {
    $dockerContext = (& docker context show 2>$null).Trim()
  } catch {
    $dockerContext = $null
  }

  if ($dockerContext) {
    Write-Status "current context" $true $dockerContext
  } else {
    Write-Status "current context" $false "Could not read docker context."
  }

  $dockerDaemonAvailable = Invoke-Quiet { docker version }
  $dockerDaemonDetail = if ($dockerDaemonAvailable) { "Docker Engine is reachable from this shell." } else { "Docker Engine is not reachable from this shell." }
  Write-Status "local docker daemon" $dockerDaemonAvailable $dockerDaemonDetail
} else {
  Write-Status "current context" $false "docker CLI is not available."
  Write-Status "local docker daemon" $false "docker CLI is not available."
}

Write-Section "WSL"
$wslDetail = if ($wslAvailable) { "WSL is available." } else { "WSL was not found." }
Write-Status "wsl command" $wslAvailable $wslDetail

if ($wslAvailable) {
  $wslDockerAvailable = $false
  try {
    $distros = (& wsl -l -q 2>$null) | Where-Object { $_ -and $_.Trim() -ne "" }
    if ($distros) {
      $wslDockerAvailable = Invoke-Quiet { wsl docker version }
    }
  } catch {
    $wslDockerAvailable = $false
  }
  $wslDockerDetail = if ($wslDockerAvailable) { "Docker Engine is reachable inside WSL." } else { "Docker in WSL was not found or is not running." }
  Write-Status "docker in WSL" $wslDockerAvailable $wslDockerDetail
}

Write-Section "Services"
try {
  $dockerServices = Get-Service *docker* -ErrorAction SilentlyContinue
  if ($dockerServices) {
    foreach ($service in $dockerServices) {
      $ok = $service.Status -eq "Running"
      Write-Status $service.DisplayName $ok ("status: {0}" -f $service.Status)
    }
  } else {
    Write-Status "docker-related services" $false "No docker-related Windows services were found."
  }
} catch {
  Write-Status "docker-related services" $false "Could not query Windows services."
}

Write-Section "Result"
if ($dockerDaemonAvailable) {
  Write-Host "You can run 'docker compose up -d' or '.\scripts\up.ps1' from this repo." -ForegroundColor Green
  exit 0
}

if ($wslDockerAvailable) {
  Write-Host "Windows Docker daemon is not reachable, but Docker inside WSL is available." -ForegroundColor Yellow
  Write-Host "Run '.\scripts\up.ps1' to try compose via WSL."
  exit 1
}

Write-Host "This repo includes Docker configuration, but it cannot include Docker Engine itself." -ForegroundColor Yellow
Write-Host "No reachable Docker daemon was found."
Write-Host "Start Docker Engine or prepare Docker inside WSL, then try again."
exit 1
