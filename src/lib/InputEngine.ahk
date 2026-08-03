; InputEngine.ahk
;
; The only file in this codebase that sends keystrokes to the karte
; software. Every set, regardless of pattern, resolves to a plain list
; of 5-digit codes, and each code is sent the same way: the code,
; then Enter. There is no code path anywhere in this file that sends a
; number, a time, or any other value derived from a measurement -
; only codes that a clinician chose in advance via config/sets.json.
; See docs/architecture.md and docs/requirements.md before changing
; this file.

class InputEngine {
    ; Runs one set definition (as loaded from config/sets.json) and
    ; returns the list of codes that were (or, in test mode, would
    ; have been) sent, for logging purposes.
    static RunSet(setDef, settings) {
        testMode := settings["test_mode"]
        codes := []

        if (setDef["pattern"] = "fixed_sequence") {
            for item in setDef["items"] {
                codes.Push(item["code"])
                if !testMode
                    InputEngine.SendCodeAndEnter(item["code"], settings)
                if (item.Has("then") && item["then"] = "leave_blank_manual_entry")
                    InputEngine._HandleLeaveBlankManualEntry()
            }
        } else if (setDef["pattern"] = "random_pool") {
            codes := SelectionEngine.SelectRandomCodes(setDef["pool"], setDef["pick_count"])
            if !testMode {
                for code in codes
                    InputEngine.SendCodeAndEnter(code, settings)
            }
        } else {
            throw Error("InputEngine: unknown pattern '" setDef["pattern"] "'")
        }

        Logger.Log(setDef["id"], codes, testMode)
        return codes
    }

    ; Sends exactly one 5-digit code, waits, sends Enter, waits again.
    ; Do not add a "value"/"time" parameter to this function - measured
    ; or timed data must always be typed by a human.
    static SendCodeAndEnter(code, settings) {
        SendInput(code)
        Sleep(settings["timing"]["after_code_ms"])
        SendInput("{Enter}")
        Sleep(settings["timing"]["after_enter_ms"])
    }

    ; Intentional no-op. A "then": "leave_blank_manual_entry" item (for
    ; example, the hygiene-instruction set's 43771 jisshi-shidou-jikan
    ; code) must leave the resulting value field untouched so a human
    ; fills in the real measured/observed value afterwards. Do NOT add
    ; SendInput calls here - doing so would mean the tool is
    ; fabricating clinical data. See docs/requirements.md,
    ; "最重要の安全制約".
    static _HandleLeaveBlankManualEntry() {
        ; deliberately empty
    }
}
