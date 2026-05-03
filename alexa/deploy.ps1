<#
.SYNOPSIS
  Deploy the Prism Alexa skill from the committed manifest with the real
  endpoint hostname substituted in from env.

.DESCRIPTION
  The committed alexa/skill.json keeps a placeholder hostname so the
  deployment URL never lands in git history (PII rule). This script
  reads $env:ALEXA_PRISM_HOSTNAME, writes a substituted copy into
  alexa/.deploy/ (gitignored), and runs ask-cli against it.

  Usage:
    $env:ALEXA_PRISM_HOSTNAME = "your-real-public-host"
    pwsh alexa/deploy.ps1

  Prereqs:
    - npm install -g ask-cli
    - ask configure   (one-time, links your Amazon developer account)
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSCommandPath

if (-not $env:ALEXA_PRISM_HOSTNAME) {
  Write-Error "ALEXA_PRISM_HOSTNAME is not set. Set it to the public hostname your Echo will reach (no scheme, no path)."
}

$placeholder = 'prism.example.com'
$replacement = $env:ALEXA_PRISM_HOSTNAME

$source = Join-Path $root 'skill.json'
$deployDir = Join-Path $root '.deploy'
$dest = Join-Path $deployDir 'skill.json'

if (-not (Test-Path $deployDir)) {
  New-Item -ItemType Directory -Path $deployDir | Out-Null
}

(Get-Content $source -Raw).Replace($placeholder, $replacement) `
  | Set-Content -Path $dest -NoNewline

# Mirror the interaction model unchanged so ask-cli sees the full skill layout.
$modelSrc = Join-Path $root 'interactionModels'
$modelDest = Join-Path $deployDir 'interactionModels'
if (Test-Path $modelDest) { Remove-Item -Recurse -Force $modelDest }
Copy-Item -Recurse -Path $modelSrc -Destination $modelDest

Write-Host "[alexa/deploy] Wrote substituted manifest to $dest"
Write-Host "[alexa/deploy] Running ask deploy ..."

Push-Location $deployDir
try {
  ask deploy --target skill --target model
} finally {
  Pop-Location
}
