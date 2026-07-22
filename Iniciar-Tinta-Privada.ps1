$ErrorActionPreference = 'Stop'
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Lms = Join-Path $env:USERPROFILE '.lmstudio\bin\lms.exe'
$Url = 'http://localhost:3000'
$DefaultModel = 'llama-3.1-8b-lexi-uncensored-v2-heretic'

if (-not (Test-Path -LiteralPath $Lms)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('No se encontró LM Studio en este usuario.', 'Tinta Privada') | Out-Null
    exit 1
}

function Test-LmStudioServer {
    try {
        return (Invoke-WebRequest -Uri 'http://127.0.0.1:1234/api/v1/models' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
    } catch {
        return $false
    }
}

$lmServerReady = Test-LmStudioServer
if (-not $lmServerReady) {
    for ($startAttempt = 0; $startAttempt -lt 2 -and -not $lmServerReady; $startAttempt++) {
        try { & $Lms server start *> $null } catch { }
        for ($waitAttempt = 0; $waitAttempt -lt 20; $waitAttempt++) {
            Start-Sleep -Milliseconds 500
            if (Test-LmStudioServer) {
                $lmServerReady = $true
                break
            }
        }
    }
}

$siteReady = $false
try {
    $siteReady = (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200
} catch { }

if (-not $siteReady) {
    Start-Process -FilePath 'C:\Program Files\nodejs\npm.cmd' -ArgumentList @('run', 'dev') -WorkingDirectory $ProjectDir -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            if ((Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { break }
        } catch { }
    }
}

Start-Process -FilePath "$env:SystemRoot\explorer.exe" -ArgumentList $Url

# Si LM Studio ya tiene un modelo cargado, lo respetamos. Así el acceso directo
# nunca duplica modelos ni deshace una selección hecha desde la aplicación.
$loadedModels = @()
if ($lmServerReady) {
    try { $loadedModels = @((& $Lms ps --json 2>$null | ConvertFrom-Json)) } catch { }
}

if ($lmServerReady -and $loadedModels.Count -eq 0) {
    try {
        & $Lms load $DefaultModel --gpu off --context-length 4096 --parallel 1 -y *> $null
    } catch {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show('Tinta Privada abrió, pero LM Studio no pudo cargar Lexi Heretic.', 'Tinta Privada') | Out-Null
    }
}

if (-not $lmServerReady) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('Tinta Privada abrió, pero LM Studio no inició. La aplicación mostrará “LM Studio apagado” y permitirá reintentar.', 'Tinta Privada') | Out-Null
}
