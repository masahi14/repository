<#
.SYNOPSIS
    Static safety check: makes sure this codebase cannot fabricate
    clinical measurement data (blood pressure, pulse, SpO2, timings,
    etc.) and that config/sets.json only contains fields this project
    is designed to handle.

.DESCRIPTION
    This is defense-in-depth on top of the runtime validation in
    src/lib/ConfigLoader.ahk (see docs/architecture.md, "数値自動生成を
    行わないことの担保"). Run this before every build/deploy, and treat
    any failure as a blocker, not a warning to ignore.

.EXAMPLE
    pwsh -File tests/config-validation/check-forbidden-patterns.ps1
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$failures = @()

# 1. Scan .ahk source (excluding vendor/) for suspicious identifiers
#    that suggest someone is trying to fabricate a measurement value.
#    Full-line comments are skipped - this project's own safety
#    comments intentionally name these words when explaining what NOT
#    to do, and that is not itself a violation.
$suspiciousPattern = '(?i)(blood.?pressure|mmhg|spo2|pulse.?rate|vital.?sign|血圧|脈拍|酸素飽和|測定値)'
$ahkFiles = Get-ChildItem -Path (Join-Path $RepoRoot "src") -Filter *.ahk -Recurse
foreach ($file in $ahkFiles) {
    $lines = Get-Content $file.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $trimmed = $lines[$i].Trim()
        if ($trimmed.StartsWith(";")) {
            continue
        }
        if ($lines[$i] -match $suspiciousPattern) {
            $failures += "[suspicious-identifier] $($file.FullName):$($i + 1): $($lines[$i].Trim())"
        }
    }
}

# 2. SelectionEngine.ahk must be the only file using Random(), and it
#    must only ever be used to pick among codes, not to synthesize a
#    numeric reading.
$randomUsers = $ahkFiles | Where-Object {
    (Get-Content $_.FullName -Raw) -match 'Random\s*\('
}
$disallowedRandomUsers = $randomUsers | Where-Object { $_.Name -ne "SelectionEngine.ahk" }
foreach ($f in $disallowedRandomUsers) {
    $failures += "[unexpected-random] $($f.FullName): Random() should only appear in SelectionEngine.ahk"
}

# 3. InputEngine.ahk's leave-blank handler must stay a no-op: no
#    SendInput/SendText/Send call inside its body.
$inputEnginePath = Join-Path $RepoRoot "src\lib\InputEngine.ahk"
if (Test-Path $inputEnginePath) {
    $content = Get-Content $inputEnginePath -Raw
    if ($content -match '_HandleLeaveBlankManualEntry\(\)\s*\{([\s\S]*?)\}') {
        $body = $Matches[1]
        if ($body -match '(?i)SendInput|SendText|\bSend\(') {
            $failures += "[leave-blank-violation] src/lib/InputEngine.ahk: _HandleLeaveBlankManualEntry() must remain a no-op"
        }
    } else {
        $failures += "[leave-blank-missing] src/lib/InputEngine.ahk: could not find _HandleLeaveBlankManualEntry() - has it been removed or renamed?"
    }
}

# 4. config/sets.json must only use the fields this project's schema
#    allows for an "item" (code, note, then, menu_path). Anything else
#    - most importantly anything numeric like "value"/"bp"/"time" - is
#    a sign someone is trying to route a fabricated measurement through
#    the config file instead of leaving it to manual entry. menu_path
#    is only ever a list of key-name strings (e.g. "{Down}", "{Enter}")
#    for items with no 5-digit code - never a numeric value.
$allowedItemKeys = @("code", "note", "then", "menu_path")
$setsPath = Join-Path $RepoRoot "config\sets.json"
if (Test-Path $setsPath) {
    $sets = Get-Content $setsPath -Raw | ConvertFrom-Json
    foreach ($setDef in $sets.sets) {
        if ($setDef.pattern -eq "fixed_sequence" -and $setDef.items) {
            foreach ($item in $setDef.items) {
                $keys = $item.PSObject.Properties.Name
                foreach ($k in $keys) {
                    if ($allowedItemKeys -notcontains $k) {
                        $failures += "[schema-violation] config/sets.json: set '$($setDef.id)' has disallowed field '$k'"
                    }
                }
                if ($keys -contains "menu_path") {
                    foreach ($mk in $item.menu_path) {
                        if ($mk -notmatch '^\+?\{[A-Za-z0-9]+\}$') {
                            $failures += "[schema-violation] config/sets.json: set '$($setDef.id)' has a menu_path entry that isn't a plain key name: '$mk'"
                        }
                    }
                }
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "静的チェックで問題が見つかりました:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "静的チェック: 問題なし" -ForegroundColor Green
exit 0
