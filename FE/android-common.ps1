# Shared steps for build-apk.ps1 (debug APK to test on a phone) and build-aab.ps1 (signed bundle for
# Google Play). Dot-sourced by those scripts; do not run directly. ASCII only: Windows PowerShell 5.1
# reads scripts without a BOM as ANSI.

$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "`n[LOI] $msg" -ForegroundColor Red; exit 1 }
function Check($what) { if ($LASTEXITCODE -ne 0) { Fail "$what that bai - xem log phia tren." } }

function Get-JavaMajor($jdkDir) {
  $rel = Join-Path $jdkDir 'release'
  if (-not (Test-Path $rel)) { return 0 }
  $m = Select-String -Path $rel -Pattern '^JAVA_VERSION="(\d+)' | Select-Object -First 1
  if ($m) { return [int]$m.Matches[0].Groups[1].Value } else { return 0 }
}

function Assert-ApiUrl([string]$url) {
  $u = $url.TrimEnd('/')
  if ($u -notmatch '^https://') {
    Fail "ApiUrl phai bat dau bang https:// (Android chan http thuong)."
  }
  return $u
}

# Picks JDK 21 first (Capacitor 8 uses Gradle 8.x, which cannot run on the JDK 25 bundled with
# recent Android Studio), then Android Studio's own JDK, then JAVA_HOME.
function Initialize-Toolchain {
  Step "Kiem tra Node.js, JDK va Android SDK"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Chua cai Node.js." }

  $candidates = @()
  foreach ($pattern in @("$env:ProgramFiles\Eclipse Adoptium\jdk-21*",
                         "$env:ProgramFiles\Microsoft\jdk-21*",
                         "$env:ProgramFiles\Java\jdk-21*")) {
    $candidates += Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
  }
  $candidates += "$env:ProgramFiles\Android\Android Studio\jbr", "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
  if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
  $jdk = $candidates | Where-Object { Test-Path (Join-Path $_ 'bin\java.exe') } | Select-Object -First 1
  if (-not $jdk) { Fail "Khong tim thay JDK nao. Chay: winget install EclipseAdoptium.Temurin.21.JDK" }
  $env:JAVA_HOME = $jdk
  $script:JavaMajor = Get-JavaMajor $jdk
  Write-Host "   JAVA_HOME    = $env:JAVA_HOME (JDK $script:JavaMajor)"
  if ($script:JavaMajor -gt 0 -and $script:JavaMajor -lt 17) { Fail "JDK $script:JavaMajor qua cu, can JDK 17 tro len." }

  if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
  if (-not (Test-Path (Join-Path $env:ANDROID_HOME 'platform-tools'))) {
    Fail "Khong thay Android SDK o $env:ANDROID_HOME. Mo Android Studio 1 lan va lam xong buoc 'SDK Setup'."
  }
  Write-Host "   ANDROID_HOME = $env:ANDROID_HOME"
}

function Test-Backend([string]$apiUrl) {
  Step "Kiem tra backend tai $apiUrl"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  try {
    Invoke-WebRequest "$apiUrl/api/universities" -UseBasicParsing -TimeoutSec 60 | Out-Null
    Write-Host "   OK - backend tra loi."
  } catch {
    Fail "Khong goi duoc $apiUrl/api/universities. Backend da chay chua? (Render free ngu sau 15 phut - mo link tren trinh duyet cho no thuc day roi chay lai.)"
  }
}

# npm install is quick when nothing changed and picks up new dependencies such as @capacitor/app.
function Install-Dependencies {
  Step "Cai / cap nhat thu vien (npm install)"
  npm install --prefer-offline --no-audit --no-fund;         Check "npm install"
}

function Build-Web([string]$apiUrl) {
  Step "Build FE voi VITE_API_URL=$apiUrl"
  $env:VITE_API_URL = $apiUrl
  npm run build;                                               Check "npm run build"
}

# Creates FE\android on first run, applies DynForge icons + deep link, copies the web build in.
function Initialize-AndroidProject {
  if (-not (Test-Path 'android')) {
    Step "Tao project Android (chi lan dau)"
    npx cap add android;                                       Check "npx cap add android"
  }

  Step "Chep icon + splash DynForge vao project Android"
  Copy-Item -Path 'assets\android-res\*' -Destination 'android\app\src\main\res' -Recurse -Force

  # PayOS returns the buyer to dynforge://payment-return (see src/app/pages/PaymentReturn.tsx)
  $manifest = 'android\app\src\main\AndroidManifest.xml'
  $xml = Get-Content $manifest -Raw
  if ($xml -notmatch 'android:scheme="dynforge"') {
    Step "Them deep link dynforge://payment-return vao AndroidManifest.xml"
    $filter = @'
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="dynforge" android:host="payment-return" />
            </intent-filter>

        </activity>
'@
    $xml = $xml -replace '(?s)\s*</activity>', ("`r`n" + $filter)
    Set-Content -Path $manifest -Value $xml -Encoding UTF8 -NoNewline
  }

  Step "Dong bo web vao project Android"
  npx cap sync android;                                        Check "npx cap sync android"
}

# Gradle only runs on JDK 25 from version 9.1 on.
function Assert-GradleJdk {
  $wrapperProps = 'android\gradle\wrapper\gradle-wrapper.properties'
  if (-not (Test-Path $wrapperProps)) { return }
  $gm = Select-String -Path $wrapperProps -Pattern 'gradle-(\d+)\.(\d+)' | Select-Object -First 1
  if (-not $gm) { return }
  $gradleVer = [version]("{0}.{1}" -f $gm.Matches[0].Groups[1].Value, $gm.Matches[0].Groups[2].Value)
  Write-Host "   Gradle cua project = $gradleVer, JDK = $script:JavaMajor"
  if ($script:JavaMajor -ge 25 -and $gradleVer -lt [version]'9.1') {
    Fail "Gradle $gradleVer chua chay duoc tren JDK $script:JavaMajor. Cai JDK 21: winget install EclipseAdoptium.Temurin.21.JDK roi chay lai."
  }
}
