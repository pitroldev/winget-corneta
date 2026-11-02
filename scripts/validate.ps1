param([Parameter(Mandatory)][string]$ManifestDirectory, [Parameter(Mandatory)][string]$ReleaseDirectory)
$ErrorActionPreference = 'Stop'
if ($env:RUNNER_ENVIRONMENT -ne 'github-hosted') { throw 'Installation validation requires a disposable GitHub-hosted runner.' }
Install-Module Microsoft.WinGet.Client -Scope CurrentUser -Force -Repository PSGallery
Import-Module Microsoft.WinGet.Client
Repair-WinGetPackageManager -Force -Latest
winget --version
winget validate --manifest $ManifestDirectory
if ($LASTEXITCODE) { throw 'WinGet manifest validation failed.' }
$release = Get-Content (Join-Path $ReleaseDirectory 'release.json') -Raw | ConvertFrom-Json
$installDir = Join-Path $env:LOCALAPPDATA 'Corneta'
$dataDir = Join-Path $env:APPDATA 'br.com.pitroldev.corneta'
if ((Test-Path $installDir) -or (Test-Path $dataDir)) { throw 'The runner already contains Corneta data.' }
$installer = (Resolve-Path (Join-Path $ReleaseDirectory $release.installer)).Path
$result = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
if ($result.ExitCode -notin @(0, 3010)) { throw 'Silent installation failed.' }
$arpPath = 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/Corneta'
$arp = Get-ItemProperty -LiteralPath $arpPath
if ($arp.DisplayName -ne 'Corneta' -or $arp.Publisher -ne 'Pitrol' -or $arp.DisplayVersion -ne $release.version) { throw 'Installed metadata does not match the manifest.' }
foreach ($name in @('corneta.exe', 'ffmpeg.exe', 'mediamtx.exe')) {
    if (-not (Test-Path (Join-Path $installDir $name))) { throw "Missing installed binary: $name" }
}
if (Get-Process corneta -ErrorAction SilentlyContinue) { throw 'Silent installation unexpectedly launched Corneta.' }
New-Item -ItemType Directory -Path $dataDir | Out-Null
$sentinel = Join-Path $dataDir 'ci-retain.txt'
Set-Content -LiteralPath $sentinel -Value 'synthetic validation data'
$uninstaller = Join-Path $installDir 'uninstall.exe'
if (-not (Test-Path $uninstaller)) { throw 'Missing uninstaller.' }
$result = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
if ($result.ExitCode -notin @(0, 3010)) { throw 'Silent uninstallation failed.' }
for ($attempt = 0; $attempt -lt 30 -and (Test-Path (Join-Path $installDir 'corneta.exe')); $attempt++) { Start-Sleep -Milliseconds 500 }
if ((Test-Path (Join-Path $installDir 'corneta.exe')) -or (Test-Path $arpPath)) { throw 'Uninstallation left the application or registry entry.' }
if (-not (Test-Path $sentinel)) { throw 'Uninstallation removed application data.' }
'Manifest validation, silent installation, installed metadata, removal, and data preservation passed.' >> $env:GITHUB_STEP_SUMMARY
