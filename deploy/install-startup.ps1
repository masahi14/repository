<#
.SYNOPSIS
    Registers this PC to launch the karte panel automatically at logon.
    Run once per PC (20 times total during initial rollout, since each
    of the 20 clinic PCs needs this).

.PARAMETER SharedDistPath
    Path to the shared "dist" folder produced by build/build.ps1, e.g.
    \\FILESERVER\dental-tools\karte-panel\dist

.EXAMPLE
    pwsh -File deploy\install-startup.ps1 -SharedDistPath "\\FILESERVER\dental-tools\karte-panel\dist"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SharedDistPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SharedDistPath)) {
    throw "指定した共有フォルダが見つかりません: $SharedDistPath"
}

$LauncherSource = Join-Path $PSScriptRoot "launcher.ps1"
$LocalAppDir = Join-Path $Env:LOCALAPPDATA "DentalKartePanel"
$LocalLauncherPath = Join-Path $LocalAppDir "launcher.ps1"

if (-not (Test-Path $LocalAppDir)) {
    New-Item -ItemType Directory -Path $LocalAppDir -Force | Out-Null
}
Copy-Item -Path $LauncherSource -Destination $LocalLauncherPath -Force

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "DentalKartePanel.lnk"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$LocalLauncherPath`" -SourceDir `"$SharedDistPath`""
$Shortcut.WorkingDirectory = $LocalAppDir
$Shortcut.Description = "歯科カルテ ワンクリック入力パネル(自動起動)"
$Shortcut.Save()

Write-Host "スタートアップ登録が完了しました: $ShortcutPath" -ForegroundColor Green
Write-Host "次回ログオン時から自動的にパネルが起動します。"
Write-Host ""
Write-Host "今すぐ試したい場合は、ログオフ→再ログオンするか、以下を手動実行してください:"
Write-Host "  powershell -File `"$LocalLauncherPath`" -SourceDir `"$SharedDistPath`""
