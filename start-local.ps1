$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $repoRoot 'backend'
$webPath = Join-Path $repoRoot 'web'

function Test-PortListening {
  param([int]$Port)

  try {
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1)
  } catch {
    return $false
  }
}

$mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
if ($null -ne $mongoService) {
  if ($mongoService.Status -ne 'Running') {
    Start-Service MongoDB
    Write-Host 'Started MongoDB service.'
  } else {
    Write-Host 'MongoDB service is already running.'
  }
} else {
  Write-Warning 'MongoDB service was not found. Start MongoDB manually if your backend needs it.'
}

if (Test-PortListening 8082) {
  Write-Host 'Backend is already running on http://localhost:8082'
} else {
  Start-Process powershell -WorkingDirectory $backendPath -ArgumentList @(
    '-NoExit',
    '-Command',
    'mvn spring-boot:run'
  ) | Out-Null
  Write-Host 'Starting backend on http://localhost:8082'
}

if (Test-PortListening 4201) {
  Write-Host 'Frontend is already running on http://localhost:4201'
} else {
  Start-Process powershell -WorkingDirectory $webPath -ArgumentList @(
    '-NoExit',
    '-Command',
    'npm run start'
  ) | Out-Null
  Write-Host 'Starting frontend on http://localhost:4201'
}

Write-Host 'Startup command finished.'