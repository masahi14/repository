; ConfigLoader.ahk
;
; Loads and validates config/sets.json and config/settings.json.
; Validation mirrors config/sets.schema.json (kept in sync by hand,
; since this project intentionally avoids a generic JSON-schema
; validator dependency). On any validation failure, falls back to the
; last known-good copy cached locally, so a bad edit to the shared
; config never breaks the tool for staff mid-shift.
;
; IMPORTANT: This file only ever reads "code" (a 5-digit string),
; "label", "note", "pattern", "pick_count", "pool", "then",
; "menu_path" (an array of AutoHotkey Send-format key strings for
; items with no 5-digit code). It must never be extended to read a
; numeric measurement/time field (e.g. "value", "bp", "time"). See
; docs/architecture.md.

class ConfigLoader {
    static CacheDir => EnvGet("LOCALAPPDATA") "\DentalKartePanel"

    static LoadSets(path) {
        return ConfigLoader._LoadWithFallback(path, ConfigLoader.CacheDir "\last_good_sets.json", ConfigLoader._ValidateSets)
    }

    static LoadSettings(path) {
        return ConfigLoader._LoadWithFallback(path, ConfigLoader.CacheDir "\last_good_settings.json", ConfigLoader._ValidateSettings)
    }

    static _LoadWithFallback(path, cachePath, validatorFn) {
        try {
            raw := FileRead(path, "UTF-8")
            data := JSON.Parse(raw)
            validatorFn.Call(data)
            ConfigLoader._SaveCache(cachePath, raw)
            return data
        } catch as err {
            cached := ConfigLoader._LoadCache(cachePath, validatorFn)
            if (cached != "") {
                MsgBox(
                    "設定ファイルの読み込みに失敗しました:`n" path "`n`n"
                    . "エラー内容: " err.Message "`n`n"
                    . "直前まで正常に動いていた設定を代わりに使用します。`n"
                    . "設定ファイルの内容を確認・修正してください。",
                    "設定エラー", "Icon!"
                )
                return cached
            }
            MsgBox(
                "設定ファイルの読み込みに失敗し、以前の正常な設定も見つかりませんでした:`n" path "`n`n"
                . "エラー内容: " err.Message "`n`n"
                . "ツールを終了します。設定ファイルの内容を確認してください。",
                "設定エラー", "Icon!"
            )
            ExitApp(1)
        }
    }

    static _SaveCache(cachePath, raw) {
        try {
            SplitPath(cachePath, , &dir)
            if !DirExist(dir)
                DirCreate(dir)
            f := FileOpen(cachePath, "w", "UTF-8")
            f.Write(raw)
            f.Close()
        }
    }

    static _LoadCache(cachePath, validatorFn) {
        if !FileExist(cachePath)
            return ""
        try {
            raw := FileRead(cachePath, "UTF-8")
            data := JSON.Parse(raw)
            validatorFn.Call(data)
            return data
        } catch {
            return ""
        }
    }

    ; --- Validation (mirrors config/sets.schema.json) ---

    static _ValidateSets(data) {
        if !(data is Map) || !data.Has("version") || !data.Has("sets")
            throw Error("sets.json: 'version' と 'sets' が必要です")
        if !(data["sets"] is Array) || data["sets"].Length = 0
            throw Error("sets.json: 'sets' は1件以上の配列である必要があります")

        seenIds := Map()
        for setDef in data["sets"] {
            if !(setDef is Map) || !setDef.Has("id") || !setDef.Has("label") || !setDef.Has("pattern")
                throw Error("sets.json: 各セットには id, label, pattern が必要です")

            id := setDef["id"]
            if seenIds.Has(id)
                throw Error("sets.json: id '" id "' が重複しています")
            seenIds[id] := true

            pattern := setDef["pattern"]
            if (pattern = "fixed_sequence") {
                if !setDef.Has("items") || !(setDef["items"] is Array)
                    throw Error("sets.json: '" id "' は fixed_sequence なので items 配列が必要です")
                for item in setDef["items"]
                    ConfigLoader._ValidateItem(id, item)
            } else if (pattern = "random_pool") {
                if !setDef.Has("pool") || !(setDef["pool"] is Array) || setDef["pool"].Length = 0
                    throw Error("sets.json: '" id "' は random_pool なので pool 配列が必要です")
                if !setDef.Has("pick_count") || !(setDef["pick_count"] is Integer) || setDef["pick_count"] < 1
                    throw Error("sets.json: '" id "' の pick_count は1以上の整数が必要です")
                if (setDef["pick_count"] > setDef["pool"].Length)
                    throw Error("sets.json: '" id "' の pick_count が pool の件数を超えています")
                for code in setDef["pool"]
                    ConfigLoader._ValidateCode(id, code)
            } else {
                throw Error("sets.json: '" id "' の pattern は fixed_sequence か random_pool のみ有効です")
            }
        }
    }

    ; An item is exactly one of two shapes: a 5-digit "code" (method 1,
    ; typed directly into the karte software) or a "menu_path" (method
    ; 2, a fixed key sequence through the 処置選択表 menu for items that
    ; have no 5-digit code). Never both, never neither.
    static _ValidateItem(setId, item) {
        if !(item is Map)
            throw Error("sets.json: '" setId "' の項目はオブジェクトである必要があります")

        hasCode := item.Has("code")
        hasMenuPath := item.Has("menu_path")
        if (hasCode = hasMenuPath)
            throw Error("sets.json: '" setId "' の項目には code か menu_path のどちらか一方が必要です")

        if (hasCode) {
            ConfigLoader._ValidateCode(setId, item["code"])
            if item.Has("then") && item["then"] != "leave_blank_manual_entry"
                throw Error("sets.json: '" setId "' の then に無効な値があります(leave_blank_manual_entry のみ許可)")
            allowed := Map("code", true, "note", true, "then", true)
        } else {
            if !(item["menu_path"] is Array) || item["menu_path"].Length = 0
                throw Error("sets.json: '" setId "' の menu_path は1件以上の配列である必要があります")
            for key in item["menu_path"]
                ConfigLoader._ValidateMenuKey(setId, key)
            allowed := Map("menu_path", true, "note", true)
        }

        ; Deliberately reject any numeric/measurement-like keys such as
        ; "value", "bp", "spo2", "time" so a future edit cannot smuggle
        ; a fabricated clinical value through the config file.
        for key in item {
            if !allowed.Has(key)
                throw Error("sets.json: '" setId "' の項目に許可されていないフィールド '" key "' があります")
        }
    }

    static _ValidateCode(setId, code) {
        if !(code is String) || !RegExMatch(code, "^\d{5}$")
            throw Error("sets.json: '" setId "' に5桁の数字コードでない値があります: " code)
    }

    static _ValidateMenuKey(setId, key) {
        if !(key is String) || !RegExMatch(key, "^\+?\{[A-Za-z0-9]+\}$")
            throw Error("sets.json: '" setId "' の menu_path に不正なキー形式があります: " key)
    }

    static _ValidateSettings(data) {
        if !(data is Map) || !data.Has("timing") || !data.Has("test_mode")
            throw Error("settings.json: 'timing' と 'test_mode' が必要です")
        timing := data["timing"]
        if !timing.Has("after_code_ms") || !timing.Has("after_enter_ms") || !timing.Has("after_menu_key_ms")
            throw Error("settings.json: timing.after_code_ms と after_enter_ms と after_menu_key_ms が必要です")
    }
}
