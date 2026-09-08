; Minimal JSON parser for AutoHotkey v2.
;
; Handwritten for this project rather than vendored from a third party,
; to keep the dependency small, license-clean, and easy to audit. It
; only needs to read this project's own config files, so it supports
; the JSON subset required for that: objects, arrays, strings, numbers,
; true/false/null. It intentionally does not attempt to be a general
; purpose, spec-complete parser.
;
; Usage:
;   data := JSON.Parse(FileRead("config\sets.json"))
;   ; Objects become Map, arrays become Array, per normal AHK v2 idiom.

class JSON {
    static Parse(text) {
        state := Map("text", text, "pos", 1, "len", StrLen(text))
        JSON._SkipWs(state)
        value := JSON._ParseValue(state)
        return value
    }

    static _SkipWs(state) {
        while (state["pos"] <= state["len"]) {
            c := SubStr(state["text"], state["pos"], 1)
            if (c = " " or c = "`t" or c = "`n" or c = "`r")
                state["pos"] += 1
            else
                break
        }
    }

    static _Peek(state) {
        return SubStr(state["text"], state["pos"], 1)
    }

    static _Expect(state, ch) {
        if (JSON._Peek(state) != ch)
            throw Error("JSON parse error: expected '" ch "' at position " state["pos"])
        state["pos"] += 1
    }

    static _ParseValue(state) {
        JSON._SkipWs(state)
        c := JSON._Peek(state)
        if (c = "{")
            return JSON._ParseObject(state)
        if (c = "[")
            return JSON._ParseArray(state)
        if (c = '"')
            return JSON._ParseString(state)
        if (c = "t" or c = "f")
            return JSON._ParseBool(state)
        if (c = "n")
            return JSON._ParseNull(state)
        return JSON._ParseNumber(state)
    }

    static _ParseObject(state) {
        obj := Map()
        JSON._Expect(state, "{")
        JSON._SkipWs(state)
        if (JSON._Peek(state) = "}") {
            state["pos"] += 1
            return obj
        }
        Loop {
            JSON._SkipWs(state)
            key := JSON._ParseString(state)
            JSON._SkipWs(state)
            JSON._Expect(state, ":")
            value := JSON._ParseValue(state)
            obj[key] := value
            JSON._SkipWs(state)
            c := JSON._Peek(state)
            if (c = ",") {
                state["pos"] += 1
                continue
            }
            if (c = "}") {
                state["pos"] += 1
                break
            }
            throw Error("JSON parse error: expected ',' or '}' at position " state["pos"])
        }
        return obj
    }

    static _ParseArray(state) {
        arr := []
        JSON._Expect(state, "[")
        JSON._SkipWs(state)
        if (JSON._Peek(state) = "]") {
            state["pos"] += 1
            return arr
        }
        Loop {
            value := JSON._ParseValue(state)
            arr.Push(value)
            JSON._SkipWs(state)
            c := JSON._Peek(state)
            if (c = ",") {
                state["pos"] += 1
                continue
            }
            if (c = "]") {
                state["pos"] += 1
                break
            }
            throw Error("JSON parse error: expected ',' or ']' at position " state["pos"])
        }
        return arr
    }

    static _ParseString(state) {
        JSON._Expect(state, '"')
        result := ""
        Loop {
            c := JSON._Peek(state)
            if (c = "")
                throw Error("JSON parse error: unterminated string")
            if (c = '"') {
                state["pos"] += 1
                break
            }
            if (c = "\") {
                state["pos"] += 1
                esc := JSON._Peek(state)
                switch esc {
                    case '"':
                        result .= '"'
                    case "\":
                        result .= "\"
                    case "/":
                        result .= "/"
                    case "b":
                        result .= "`b"
                    case "f":
                        result .= "`f"
                    case "n":
                        result .= "`n"
                    case "r":
                        result .= "`r"
                    case "t":
                        result .= "`t"
                    case "u":
                        hex := SubStr(state["text"], state["pos"] + 1, 4)
                        result .= Chr(Integer("0x" . hex))
                        state["pos"] += 4
                    default:
                        result .= esc
                }
                state["pos"] += 1
            } else {
                result .= c
                state["pos"] += 1
            }
        }
        return result
    }

    static _ParseNumber(state) {
        start := state["pos"]
        while (state["pos"] <= state["len"]) {
            c := JSON._Peek(state)
            if InStr("0123456789+-.eE", c)
                state["pos"] += 1
            else
                break
        }
        numStr := SubStr(state["text"], start, state["pos"] - start)
        if (numStr = "")
            throw Error("JSON parse error: invalid number at position " start)
        return IsInteger(numStr) ? Integer(numStr) : Number(numStr)
    }

    static _ParseBool(state) {
        if (SubStr(state["text"], state["pos"], 4) = "true") {
            state["pos"] += 4
            return true
        }
        if (SubStr(state["text"], state["pos"], 5) = "false") {
            state["pos"] += 5
            return false
        }
        throw Error("JSON parse error: invalid literal at position " state["pos"])
    }

    static _ParseNull(state) {
        if (SubStr(state["text"], state["pos"], 4) = "null") {
            state["pos"] += 4
            return ""
        }
        throw Error("JSON parse error: invalid literal at position " state["pos"])
    }
}
