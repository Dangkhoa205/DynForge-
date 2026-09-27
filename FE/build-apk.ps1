<#
  DynForge - build Android APK (debug) to install directly on a phone for testing.
  For Google Play use build-aab.ps1 instead.

  Cach chay (tu thu muc goc repo):
    powershell -ExecutionPolicy Bypass -File FE\build-apk.ps1 -ApiUrl https://dynforge-api.onrender.com

  -ApiUrl        Dia chi HTTPS cua backend (Render, hoac link cloudflared khi thu tren may). Bat buoc.
  -SkipApiCheck  Bo qua buoc kiem tra backend co dang chay khong.

  Ket qua: DynForge-debug.apk nam CANH thu muc repo (khong nam trong repo).
#>
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [switch]$SkipApiCheck
)

Set-Location $PSScriptRoot   # = thu muc FE
. (Join-Path $PSScriptRoot 'android-common.ps1')

$ApiUrl = Assert-ApiUrl $ApiUrl
Initialize-Toolchain
if (-not $SkipApiCheck) { Test-Backend $ApiUrl }
Install-Dependencies
Build-Web $ApiUrl
Initialize-AndroidProject
Assert-GradleJdk

Step "Build APK debug (lan dau Gradle tai thu vien, co the mat 5-10 phut)"
Push-Location android
.\gradlew.bat assembleDebug
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Fail "Gradle build that bai - xem log phia tren." }

$apk = Join-Path $PSScriptRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$out = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'DynForge-debug.apk'
Copy-Item $apk $out -Force

Write-Host "`nXONG! APK: $out" -ForegroundColor Green
Write-Host "Gui file nay sang dien thoai, mo ra va cho phep 'cai tu nguon khong xac dinh'."
