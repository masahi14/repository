#Requires AutoHotkey v2.0
#SingleInstance Force

; A stand-in for the real karte software's input field, since this
; project cannot be developed against the real (proprietary, in-clinic
; only) software. Click into the text box below, then use the real
; panel (src\main.ahk) to send a set and confirm the codes that appear
; here match what tests/manual-test-harness/test-checklist.md expects.
;
; This does not attempt to replicate the "5-digit code shows a
; candidate, Enter confirms it" behavior of the real software - it
; just records every keystroke sent to it, which is enough to verify
; the panel's code order, count, and Random selection behavior, and to
; confirm that "leave_blank_manual_entry" items really do stop sending
; after their Enter with nothing further.
;
; The text box variable is named editBox (not "edit") because
; AutoHotkey v2 has a built-in Edit() function, and a plain variable
; named "edit" collides with it ("This Func cannot be used as an
; output variable").

win := Gui("+Resize", "ダミーカルテ(テスト用) — ここをクリックしてフォーカスしてからパネルのボタンを押してください")
win.SetFont("s11")
editBox := win.Add("Edit", "w520 h420 Multi ReadOnly -Wrap")
win.Show()
editBox.Focus()

; Real code+Enter keystrokes typed into a ReadOnly Edit wouldn't show
; up, so intercept and append manually instead of relying on the OS to
; deliver text into the control.
Hotkey("~*Enter", LogEnter, "On")
Hotkey("~*0", (*) => LogDigit("0"), "On")
Hotkey("~*1", (*) => LogDigit("1"), "On")
Hotkey("~*2", (*) => LogDigit("2"), "On")
Hotkey("~*3", (*) => LogDigit("3"), "On")
Hotkey("~*4", (*) => LogDigit("4"), "On")
Hotkey("~*5", (*) => LogDigit("5"), "On")
Hotkey("~*6", (*) => LogDigit("6"), "On")
Hotkey("~*7", (*) => LogDigit("7"), "On")
Hotkey("~*8", (*) => LogDigit("8"), "On")
Hotkey("~*9", (*) => LogDigit("9"), "On")

LogDigit(d) {
    if !WinActive("ahk_id " win.Hwnd)
        return
    editBox.Value := editBox.Value . d
}

LogEnter(*) {
    if !WinActive("ahk_id " win.Hwnd)
        return
    editBox.Value := editBox.Value . "  <-- Enter`n"
}
