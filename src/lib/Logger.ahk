; Logger.ahk
;
; Writes a plain-text log of which set was run and which codes were
; sent (or, in test mode, would have been sent). Never logs patient
; information - only set IDs, codes, and timestamps - since the log
; file may be read by non-clinical IT staff (Kirisawa-san) while
; troubleshooting.

class Logger {
    static LogDir => EnvGet("LOCALAPPDATA") "\DentalKartePanel\logs"

    static Log(setId, codes, testMode) {
        try {
            if !DirExist(Logger.LogDir)
                DirCreate(Logger.LogDir)
            fileName := Logger.LogDir "\" FormatTime(, "yyyy-MM-dd") ".log"
            prefix := testMode ? "[TEST MODE - not sent] " : "[SENT] "
            line := FormatTime(, "yyyy-MM-dd HH:mm:ss") " " prefix "set=" setId " codes=" Logger._Join(codes, ",") "`n"
            f := FileOpen(fileName, "a", "UTF-8")
            f.Write(line)
            f.Close()
        }
    }

    static _Join(arr, sep) {
        out := ""
        for i, v in arr {
            if (i > 1)
                out .= sep
            out .= v
        }
        return out
    }
}
