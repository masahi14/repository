<#
.SYNOPSIS
    Mirrors the shared dist folder to this PC's local disk, then
    launches the panel from the local copy.

.DESCRIPTION
    Runs at every logon (registered by install-startup.ps1). Running
    the exe off local disk, rather than directly from the network
    share, avoids logon-time SMB hiccups, file-lock contention while
    someone else is updating the share, and antivirus scan latency
    over the network - which matter more here than on a single machine
    because all 20 PCs would otherwise hit the same share at once.

.PARAMETER SourceDir
    Path to the shared "dist" folder produced by build/build.ps1, e.g.
    \\FILESERVER\dental-tools\karte-panel\dist
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDir
)

$LocalDir = Join-Path $Env:LOCALAPPDATA "DentalKartePanel\app"

if (-not (Test-Path $LocalDir)) {
    New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null
}

if (Test-Path $SourceDir) {
    robocopy $SourceDir $LocalDir /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null
    # robocopy exit codes 0-7 all mean "success" in some form (files
    # copied / already up to date / extra files removed); 8+ is a real
    # error.
    if ($LASTEXITCODE -ge 8) {
        Write-Warning "共有フォルダからの同期に失敗しました(exit code $LASTEXITCODE)。前回のローカルコピーで起動を試みます。"
    }
} else {
    Write-Warning "共有フォルダに接続できません: $SourceDir 。前回のローカルコピーで起動を試みます。"
}

$exePath = Join-Path $LocalDir "DentalKartePanel.exe"
if (Test-Path $exePath) {
    Start-Process -FilePath $exePath
} else {
    Write-Error "起動ファイルが見つかりません: $exePath 。共有フォルダへの接続を確認するか、桐生さんに連絡してください。"
}
