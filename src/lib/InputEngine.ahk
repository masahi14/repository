; InputEngine.ahk
;
; The only file in this codebase that sends keystrokes to the karte
; software. Every set, regardless of pattern, resolves to a plain list
; of items, and each item is one of exactly two kinds:
;   - a 5-digit code (method 1: type the code, press Enter), or
;   - a menu_path (method 2: Shift+F4 -> F5 opens the "カスタムコメント
;     選択" screen, then a fixed sequence of navigation keys and a
;     final Enter select an item that has no 5-digit code).
; There is no code path anywhere in this file that sends a number, a
; time, or any other value derived from a measurement - only codes and
; menu key sequences that a clinician chose in advance via
; config/sets.json. See docs/architecture.md and docs/requirements.md
; before changing this file.

class InputEngine {
    ; Runs one set definition (as loaded from config/sets.json) and
    ; returns a list of strings describing what was (or, in test mode,
    ; would have been) sent, for logging purposes.
    ;
    ; targetHwnd, when nonzero, is the karte window to send into via
    ; ControlSend (see _Send below) - the window the staff member had
    ; focused before touching the panel. Pass 0 to fall back to
    ; SendInput (whatever currently has system keyboard focus).
    static RunSet(setDef, settings, targetHwnd := 0) {
        testMode := settings["test_mode"]
        sent := []

        if (setDef["pattern"] = "fixed_sequence") {
            for item in setDef["items"] {
                if (item.Has("code")) {
                    sent.Push(item["code"])
                    if !testMode
                        InputEngine.SendCodeAndEnter(item["code"], settings, targetHwnd)
                    if (item.Has("then") && item["then"] = "leave_blank_manual_entry")
                        InputEngine._HandleLeaveBlankManualEntry()
                } else if (item.Has("menu_path")) {
                    sent.Push("[menu] " (item.Has("note") ? item["note"] : item["menu_path"].Length " keys"))
                    if !testMode
                        InputEngine.SendMenuPath(item["menu_path"], settings, targetHwnd)
                } else {
                    throw Error("InputEngine: item has neither 'code' nor 'menu_path'")
                }
            }
        } else if (setDef["pattern"] = "random_pool") {
            sent := SelectionEngine.SelectRandomCodes(setDef["pool"], setDef["pick_count"])
            if !testMode {
                for code in sent
                    InputEngine.SendCodeAndEnter(code, settings, targetHwnd)
            }
        } else {
            throw Error("InputEngine: unknown pattern '" setDef["pattern"] "'")
        }

        Logger.Log(setDef["id"], sent, testMode)
        return sent
    }

    ; Sends exactly one 5-digit code, waits, sends Enter, waits again.
    ; Do not add a "value"/"time" parameter to this function - measured
    ; or timed data must always be typed by a human.
    static SendCodeAndEnter(code, settings, targetHwnd := 0) {
        InputEngine._Send(code, targetHwnd)
        Sleep(settings["timing"]["after_code_ms"])
        InputEngine._Send("{Enter}", targetHwnd)
        Sleep(settings["timing"]["after_enter_ms"])
    }

    ; Sends a fixed sequence of navigation keys (method 2: a menu
    ; screen opened via Shift+F4 -> F5, then a fixed sequence of
    ; number/letter/arrow keys and a final Enter), for items that have
    ; no 5-digit code. Each entry in menuPath is one AutoHotkey v2
    ; Send-format key (see config/sets.schema.json's "menu_key"
    ; definition), sent one at a time with a wait after each so the
    ; karte software's menu has time to redraw before the next keypress.
    ; Like SendCodeAndEnter, this only ever replays a fixed key sequence
    ; chosen in advance in config/sets.json - it never computes a key
    ; count or navigates based on anything read from the screen, and it
    ; must never be extended to take a numeric/time argument.
    static SendMenuPath(menuPath, settings, targetHwnd := 0) {
        for key in menuPath {
            InputEngine._Send(key, targetHwnd)
            Sleep(settings["timing"]["after_menu_key_ms"])
        }
    }

    ; Delivers one key/text to the karte window.
    ;
    ; Pilot testing found that plain SendInput (which delivers to
    ; whichever window currently has system keyboard focus) silently
    ; lost keystrokes: Panel is a WS_EX_NOACTIVATE window, and Windows
    ; can refuse a background process's WinActivate/SetForegroundWindow
    ; call on an unrelated window, so the karte window sometimes never
    ; actually regained system focus even though no error was raised
    ; anywhere.
    ;
    ; ControlSend(keys, , "ahk_id " hwnd) with a blank Control - meaning
    ; "send to whatever control currently has focus in that window" -
    ; was tried next, but pilot testing showed it also silently
    ; delivered nothing, even to a window that isn't the foreground
    ; window. So this now resolves the actually-focused control inside
    ; the target window explicitly via ControlGetFocus first, and sends
    ; to that control by name. This does not require the target window
    ; to be the system foreground window at all, which is the whole
    ; point: it must keep working even when Windows refuses to give the
    ; karte window focus back.
    ;
    ; Real-machine testing (2026-08) found a further wrinkle: some
    ; codes (e.g. fluoride's 46095, denture's 40177) make the karte
    ; software pop up an extra top-level "処置選択" window on its own,
    ; which genuinely takes real OS focus - unlike the panel, which
    ; never does. targetHwnd is captured once, back when the panel
    ; button was first clicked, so once one of these popups appears
    ; mid-sequence it stops being the right destination. Re-resolving
    ; the actually-active window ("A") on every single key keeps this
    ; working whether the karte software is showing its main screen or
    ; one of these auto-popups; targetHwnd is kept only as a fallback
    ; for the rare case where nothing is active at all. ControlSend
    ; itself is now wrapped in try too, so a window that disappears in
    ; the instant between the existence check and the send (closing a
    ; popup, for example) falls back to SendInput instead of aborting
    ; the whole set with an unhandled error.
    static _Send(keys, targetHwnd) {
        hwnd := WinExist("A")
        if (!hwnd)
            hwnd := targetHwnd

        if (hwnd && WinExist("ahk_id " hwnd)) {
            focusedControl := ""
            try
                focusedControl := ControlGetFocus("ahk_id " hwnd)
            if (focusedControl != "") {
                try {
                    ControlSend(keys, focusedControl, "ahk_id " hwnd)
                    return
                }
            }
        }
        SendInput(keys)
    }

    ; Intentional no-op. A "then": "leave_blank_manual_entry" item (for
    ; example, the hygiene-instruction set's 43771 jisshi-shidou-jikan
    ; code) must leave the resulting value field untouched so a human
    ; fills in the real measured/observed value afterwards. Do NOT add
    ; any Send call here - doing so would mean the tool is fabricating
    ; clinical data. See docs/requirements.md, "最重要の安全制約".
    static _HandleLeaveBlankManualEntry() {
        ; deliberately empty
    }
}
