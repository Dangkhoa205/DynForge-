<#
  DynForge - build the SIGNED Android App Bundle (.aab) to upload to Google Play.

  Cach chay (tu thu muc goc repo):
    powershell -ExecutionPolicy Bypass -File FE\build-aab.ps1 -ApiUrl https://dynforge-api.onrender.com -VersionCode 1 -VersionName 1.0

  -ApiUrl       Dia chi HTTPS CO DINH cua backend tren Render. KHONG dung link cloudflared cho ban Play.
  -VersionCode  So nguyen, moi lan nop Play phai TANG (1, 2, 3...).
  -VersionName  Ten phien ban hien cho nguoi dung (1.0, 1.1...).
  -KeystoreDir  Noi luu khoa ky app (mac dinh: %USERPROFILE%\dynforge-keys, NGOAI repo).

  Lan dau chay, script tao "upload key" va hoi mat khau. SAO LUU thu muc khoa va mat khau:
  mat khoa thi phai xin Google reset moi cap nhat duoc app.

  Ket qua: DynForge-<VersionName>-<VersionCode>.aab nam CANH thu muc repo.
#>
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [Parameter(Mandatory = $true)][int]$VersionCode,
  [string]$VersionName = '1.0',
  [string]$KeystoreDir = (Join-Path $env:USERPROFILE 'dynforge-keys')
)

Set-Location $PSScriptRoot   # = thu muc FE
. (Join-Path $PSScriptRoot 'android-common.ps1')

$ApiUrl = Assert-ApiUrl $ApiUrl
if ($ApiUrl -match 'trycloudflare\.com|ngrok') {
  Fail "Ban Play phai tro toi backend co dia chi co dinh (Render). Link cloudflared/ngrok se chet khi tat may."
}
if ($VersionCode -lt 1) { Fail "VersionCode phai >= 1." }

Initialize-Toolchain
Test-Backend $ApiUrl
Install-Dependencies
Build-Web $ApiUrl
Initialize-AndroidProject
Assert-GradleJdk

# ---------------------------------------------------------------- upload key
$propsFile = Join-Path $PSScriptRoot 'android\keystore.properties'
if (-not (Test-Path $propsFile)) {
  Step "Tao upload key de ky app (chi lan dau)"
  New-Item -ItemType Directory -Force -Path $KeystoreDir | Out-Null
  $jks = Join-Path $KeystoreDir 'dynforge-upload.jks'
  if (Test-Path $jks) { Fail "Da co $jks nhung thieu android\keystore.properties. Tao lai file do bang tay (xem PLAYSTORE.md)." }

  $p1 = Read-Host "Dat mat khau cho upload key (>= 8 ky tu)" -AsSecureString
  $p2 = Read-Host "Nhap lai mat khau" -AsSecureString
  $plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
  $plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
  if ($plain1 -ne $plain2) { Fail "Hai lan nhap mat khau khong khop." }
  if ($plain1.Length -lt 8) { Fail "Mat khau phai co it nhat 8 ky tu." }

  $keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
  & $keytool -genkeypair -v -keystore $jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $plain1 -keypass $plain1 -dname "CN=DynForge, O=DynForge, C=VN"
  Check "Tao keystore"

  $jksForGradle = $jks -replace '\\', '/'
  @(
    "storeFile=$jksForGradle",
    "storePassword=$plain1",
    "keyAlias=upload",
    "keyPassword=$plain1"
  ) | Set-Content -Path $propsFile -Encoding ASCII
  Write-Host "   Da tao $jks" -ForegroundColor Yellow
  Write-Host "   SAO LUU thu muc $KeystoreDir va mat khau vao noi an toan (Google Drive rieng, USB...)." -ForegroundColor Yellow
}

# ---------------------------------------------------------------- bundle
Step "Build AAB release (versionCode $VersionCode, versionName $VersionName)"
Push-Location android
.\gradlew.bat bundleRelease "-PdynforgeVersionCode=$VersionCode" "-PdynforgeVersionName=$VersionName"
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Fail "Gradle build that bai - xem log phia tren." }

$aab = Join-Path $PSScriptRoot 'android\app\build\outputs\bundle\release\app-release.aab'
if (-not (Test-Path $aab)) { Fail "Khong thay $aab" }
$out = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "DynForge-$VersionName-$VersionCode.aab"
Copy-Item $aab $out -Force

Write-Host "`nXONG! AAB: $out" -ForegroundColor Green
Write-Host "Tai file nay len Play Console -> Testing -> Closed testing -> Create new release."
