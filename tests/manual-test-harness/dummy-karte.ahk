#Requires AutoHotkey v2.0
#SingleInstance Force

; A stand-in for the real karte software's input field, since this
; project cannot be developed against the real (proprietary, in-clinic
; only) software. Click into the text box below, then use the real
; panel (src\main.ahk) to send a set and confirm the codes that appear
; here match what tests/manual-test-harness/test-checklist.md expects.
;
; This is a plain, ordinary (not ReadOnly) multi-line Edit control, so
; whatever the panel actually types (codes, Enter as a newline, menu
; navigation keys) shows up exactly as typed - the same as it would in
; a real text field. An earlier version used a ReadOnly Edit plus a
; global Hotkey() to fake this, but pilot testing showed that
; InputEngine's ControlSend (see src\lib\InputEngine.ahk) delivers
; keys as window messages straight to this control, which a ReadOnly
; Edit rejects and which never reaches a separate script's global
; keyboard hook - so nothing appeared to happen even though the send
; genuinely worked. A normal editable control has neither problem and
; is also a more honest stand-in for the real software's input field.
;
; The variable is named editBox (not "edit") because AutoHotkey v2 has
; a built-in Edit() function, and a plain variable named "edit"
; collides with it ("This Func cannot be used as an output variable").

win := Gui("+Resize", "ダミーカルテ(テスト用) — ここをクリックしてフォーカスしてからパネルのボタンを押してください")
win.SetFont("s11")
editBox := win.Add("Edit", "w520 h420 Multi -Wrap")
win.Show()
editBox.Focus()
