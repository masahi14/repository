<#
.SYNOPSIS
    Compiles src/main.ahk into a single .exe and assembles a dist/
    folder ready to copy to the shared deployment folder.

.DESCRIPTION
    Requires AutoHotkey v2 and its Ahk2Exe compiler to be installed on
    the machine running this script. This is a one-time-per-release
    build step for whoever maintains releases (e.g. 桐生さん) - the 20
    clinic PCs never need AutoHotkey installed, since they only ever
    run the compiled exe.

.EXAMPLE
    pwsh -File build/build.ps1
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DistDir = Join-Path $RepoRoot "dist"
$ExeName = "DentalKartePanel.exe"

# Never ship a build that fails the safety static check.
$checkScript = Join-Path $RepoRoot "tests\config-validation\check-forbidden-patterns.ps1"
& pwsh -File $checkScript
if ($LASTEXITCODE -ne 0) {
    throw "静的安全チェックに失敗したため、ビルドを中止しました。"
}

$ahk2exeCandidates = @(
    "$Env:ProgramFiles\AutoHotkey\Compiler\Ahk2Exe.exe",
    "${Env:ProgramFiles(x86)}\AutoHotkey\Compiler\Ahk2Exe.exe"
)
$ahk2exe = $ahk2exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $ahk2exe) {
    throw "Ahk2Exe.exe が見つかりません。AutoHotkey v2 をインストールしてください: https://www.autohotkey.com/"
}

if (Test-Path $DistDir) {
    Remove-Item $DistDir -Recurse -Force
}
New-Item -ItemType Directory -Path $DistDir | Out-Null

$mainAhk = Join-Path $RepoRoot "src\main.ahk"
$exePath = Join-Path $DistDir $ExeName

& $ahk2exe /in $mainAhk /out $exePath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exePath)) {
    throw "コンパイルに失敗しました。"
}

# config/ is copied alongside the exe, not embedded into it, so
# non-engineers can keep editing sets.json/settings.json without a
# rebuild. See docs/admin-guide.md.
Copy-Item -Path (Join-Path $RepoRoot "config") -Destination (Join-Path $DistDir "config") -Recurse

Write-Host "ビルド完了: $DistDir" -ForegroundColor Green
Write-Host "  - $ExeName"
Write-Host "  - config\ (sets.json, settings.json, sets.schema.json)"
Write-Host ""
Write-Host "この dist フォルダをそのまま共有フォルダにコピーしてください。詳細は deploy/deploy-readme.md を参照。"
