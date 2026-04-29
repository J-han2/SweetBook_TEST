param(
  [string[]]$ComposeArgs = @("up", "--build")
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$debugComposeArgs = @(
  "-f", (Join-Path $root "docker-compose.yml"),
  "-f", (Join-Path $root "docker-compose.debug.yml")
) + $ComposeArgs

& (Join-Path $PSScriptRoot "up.ps1") -ComposeArgs $debugComposeArgs
exit $LASTEXITCODE
