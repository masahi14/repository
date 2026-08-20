; Panel.ahk
;
; The always-on-top button panel shown in the corner of the karte
; screen. One button per set in config/sets.json. Clicking a button
; must NOT steal keyboard focus away from the karte software's input
; field - that field is expected to already have focus (the staff
; member clicked into it before touching this panel), and the whole
; point of the tool is to type into it without requiring the user to
; re-focus it.
;
; This is achieved with the WS_EX_NOACTIVATE extended window style
; (+E0x08000000) plus Show("NoActivate"). As a fallback, in case that
; style is not fully honored on some machine/Windows build, we also
; track the most recent non-panel foreground window and explicitly
; re-activate it right before sending keys.

class Panel {
    static panelGui := ""
    static buttons := Map()
    static sets := []
    static settings := ""
    static lastActiveHwnd := 0

    static PositionFile => EnvGet("LOCALAPPDATA") "\DentalKartePanel\panel_position.json"

    static Init(sets, settings) {
        Panel._ShowGui(sets, settings)
        ; Bare static-method references (e.g. Panel._TrackActiveWindow
        ; passed directly, without calling it) were rejected by
        ; SetTimer/OnMessage on the pilot machine ("Invalid callback
        ; function."/"Missing a required parameter."). Wrapping each
        ; in a closure that calls the method normally (with parens)
        ; avoids passing a bare method reference as the callback value.
        SetTimer((*) => Panel._TrackActiveWindow(), 200)
        OnMessage(0x201, (wParam, lParam, msg, hwnd) => Panel._OnLButtonDown(wParam, lParam, msg, hwnd))   ; WM_LBUTTONDOWN -> drag support
        OnMessage(0x232, (wParam, lParam, msg, hwnd) => Panel._OnMoveEnd(wParam, lParam, msg, hwnd))        ; WM_EXITSIZEMOVE -> persist position
    }

    ; Rebuilds just the GUI/buttons (used when config is reloaded from
    ; the tray menu). Does not re-register the timer/message hooks
    ; from Init(), since AHK does not need (or want) those duplicated.
    static Rebuild(sets, settings) {
        if (Panel.panelGui != "")
            Panel.panelGui.Destroy()
        Panel._ShowGui(sets, settings)
    }

    static _ShowGui(sets, settings) {
        Panel.sets := sets
        Panel.settings := settings
        Panel._Build()
        Panel._RestorePosition()
        Panel.panelGui.Show("NoActivate")
    }

    static _Build() {
        Panel.panelGui := Gui("+AlwaysOnTop -Caption +ToolWindow +E0x08000000", "DentalKartePanel")
        Panel.panelGui.BackColor := "F0F0F0"
        Panel.panelGui.SetFont("s9", "Yu Gothic UI")

        maxCols := 3
        btnW := 92
        btnH := 32
        gap := 4
        margin := 6

        col := 0
        row := 0
        for setDef in Panel.sets {
            x := margin + col * (btnW + gap)
            y := margin + row * (btnH + gap)
            btn := Panel.panelGui.Add("Button", "x" x " y" y " w" btnW " h" btnH, setDef["label"])
            setId := setDef["id"]
            btn.OnEvent("Click", Panel._MakeClickHandler(setId))
            Panel.buttons[setId] := btn

            col += 1
            if (col >= maxCols) {
                col := 0
                row += 1
            }
        }
    }

    static _MakeClickHandler(setId) {
        return (*) => Panel._OnButtonClick(setId)
    }

    static _OnButtonClick(setId) {
        setDef := ""
        for s in Panel.sets {
            if (s["id"] = setId) {
                setDef := s
                break
            }
        }
        if (setDef = "")
            return

        Panel._SetButtonsEnabled(false)
        try {
            if (Panel.lastActiveHwnd && WinExist("ahk_id " Panel.lastActiveHwnd))
                WinActivate("ahk_id " Panel.lastActiveHwnd)
            InputEngine.RunSet(setDef, Panel.settings)
        } catch as err {
            MsgBox("入力中にエラーが発生しました: " err.Message, "エラー", "Icon!")
        }
        Panel._SetButtonsEnabled(true)
    }

    static _SetButtonsEnabled(enabled) {
        for id, btn in Panel.buttons
            btn.Enabled := enabled
    }

    static _TrackActiveWindow(*) {
        hwnd := WinExist("A")
        if (hwnd && hwnd != Panel.panelGui.Hwnd)
            Panel.lastActiveHwnd := hwnd
    }

    ; Lets the user drag the panel by clicking any empty area of it
    ; (not on a button - clicks on child controls are delivered to the
    ; control's own hwnd, so this only fires for background clicks).
    static _OnLButtonDown(wParam, lParam, msg, hwnd) {
        if (Panel.panelGui != "" && hwnd = Panel.panelGui.Hwnd)
            PostMessage(0xA1, 2, , , "ahk_id " hwnd)   ; WM_NCLBUTTONDOWN, HTCAPTION
    }

    static _OnMoveEnd(wParam, lParam, msg, hwnd) {
        if (Panel.panelGui != "" && hwnd = Panel.panelGui.Hwnd)
            Panel.SavePosition()
    }

    static _RestorePosition() {
        x := "", y := ""
        if FileExist(Panel.PositionFile) {
            try {
                data := JSON.Parse(FileRead(Panel.PositionFile, "UTF-8"))
                x := data["x"]
                y := data["y"]
            }
        }
        if ((x = "" || y = "") && Panel.settings.Has("panel")) {
            panelDefaults := Panel.settings["panel"]
            if (panelDefaults["start_x"] != "" && panelDefaults["start_y"] != "") {
                x := panelDefaults["start_x"]
                y := panelDefaults["start_y"]
            }
        }
        if (x != "" && y != "")
            Panel.panelGui.Move(x, y)
    }

    static SavePosition() {
        try {
            Panel.panelGui.GetPos(&x, &y)
            dir := EnvGet("LOCALAPPDATA") "\DentalKartePanel"
            if !DirExist(dir)
                DirCreate(dir)
            f := FileOpen(Panel.PositionFile, "w", "UTF-8")
            f.Write('{"x": ' x ', "y": ' y '}')
            f.Close()
        }
    }
}
