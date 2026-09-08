#Requires AutoHotkey v2.0
#SingleInstance Force

#Include ..\vendor\JSON.ahk
#Include lib\ConfigLoader.ahk
#Include lib\SelectionEngine.ahk
#Include lib\InputEngine.ahk
#Include lib\Logger.ahk
#Include lib\Panel.ahk

global AppSets := ""
global AppSettings := ""
global ConfigDir := ""

Main()

Main() {
    global ConfigDir
    ConfigDir := FindConfigDir()
    LoadConfig()
    Panel.Init(AppSets["sets"], AppSettings)
    BuildTrayMenu()
}

; The config folder is kept outside the compiled exe (see build/build.ps1
; and docs/admin-guide.md) so non-engineers can edit sets.json without
; recompiling. Look for it next to the exe first (production layout),
; then one level up (running src\main.ahk directly during development).
FindConfigDir() {
    candidates := [A_ScriptDir "\config", A_ScriptDir "\..\config"]
    for dir in candidates {
        if FileExist(dir "\sets.json")
            return dir
    }
    MsgBox(
        "config フォルダ(sets.json)が見つかりません。`n"
        . "実行ファイルと同じ階層、または一つ上の階層に config フォルダを配置してください。",
        "起動エラー", "Icon!"
    )
    ExitApp(1)
}

LoadConfig() {
    global AppSets, AppSettings, ConfigDir
    AppSets := ConfigLoader.LoadSets(ConfigDir "\sets.json")
    AppSettings := ConfigLoader.LoadSettings(ConfigDir "\settings.json")
}

BuildTrayMenu() {
    tray := A_TrayMenu
    tray.Delete()
    tray.Add("設定を再読み込み", (*) => ReloadConfig())
    tray.Add("設定フォルダを開く", (*) => Run(ConfigDir))
    tray.Add("ログフォルダを開く", (*) => OpenLogs())
    tray.Add()
    tray.Add("終了", (*) => ExitApp())
    tray.Default := "設定を再読み込み"
    A_IconTip := "歯科カルテ ワンクリック入力パネル"
}

ReloadConfig() {
    global AppSets, AppSettings
    try {
        LoadConfig()
        Panel.Rebuild(AppSets["sets"], AppSettings)
        MsgBox("設定を再読み込みしました。", "完了", "Iconi T2")
    } catch as err {
        MsgBox("再読み込みに失敗しました: " err.Message, "エラー", "Icon!")
    }
}

OpenLogs() {
    dir := EnvGet("LOCALAPPDATA") "\DentalKartePanel\logs"
    if !DirExist(dir)
        DirCreate(dir)
    Run(dir)
}
