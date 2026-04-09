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

function Get-PortProcessIds {
  param([int]$Port)

  try {
    return Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique |
      Where-Object { $_ -and $_ -gt 0 }
  } catch {
    return @()
  }
}

function Stop-ProcessesOnPort {
  param(
    [int]$Port,
    [string]$Label
  )

  $processIds = @(Get-PortProcessIds -Port $Port)
  if ($processIds.Count -eq 0) {
    Write-Host "No existing process found on port $Port for $Label."
    return
  }

  Write-Host "Stopping $Label process(es) on port $Port: $($processIds -join ', ')"
  foreach ($processId in $processIds) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Warning "Could not stop process $processId on port $Port. $_"
    }
  }

  $maxAttempts = 20
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    if (-not (Test-PortListening $Port)) {
      Write-Host "$Label port $Port is free."
      return
    }
    Start-Sleep -Milliseconds 300
  }

  throw "$Label port $Port is still busy after stopping the process(es)."
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

Stop-ProcessesOnPort -Port 8082 -Label 'Backend'
Stop-ProcessesOnPort -Port 4201 -Label 'Frontend'

Start-Process powershell -WorkingDirectory $backendPath -ArgumentList @(
  '-NoExit',
  '-Command',
  'mvn spring-boot:run'
) | Out-Null
Write-Host 'Starting backend on http://localhost:8082'

Start-Process powershell -WorkingDirectory $webPath -ArgumentList @(
  '-NoExit',
  '-Command',
  'npm run start'
) | Out-Null
Write-Host 'Starting frontend on http://localhost:4201'

Write-Host 'Startup command finished.'