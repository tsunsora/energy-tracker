$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path $PSScriptRoot -Parent
if (Test-Path "$workspaceRoot\.tools\jdk") { $env:JAVA_HOME = "$workspaceRoot\.tools\jdk" }
if (Test-Path "$workspaceRoot\.tools\sdk") { $env:ANDROID_HOME = "$workspaceRoot\.tools\sdk" }
Push-Location $workspaceRoot
try {
    npm.cmd run android:sync
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
    Push-Location android
    try { .\gradlew.bat assembleDebug --no-daemon; if ($LASTEXITCODE -ne 0) { throw 'Android build failed' } }
    finally { Pop-Location }
    New-Item -ItemType Directory -Force releases | Out-Null
    Copy-Item -LiteralPath android\app\build\outputs\apk\debug\app-debug.apk -Destination releases\energy-tracker.apk
    Write-Output "APK: $workspaceRoot\releases\energy-tracker.apk"
} finally { Pop-Location }
