; SelectionEngine.ahk
;
; The only responsibility of this file is picking N unique codes at
; random from a pool of codes (used by any "random_pool" set defined
; in config/sets.json).
;
; IMPORTANT: this file must never grow a function that returns a
; number/time value (e.g. a fabricated blood-pressure or duration
; reading). It only ever selects among codes that a clinician defined
; in advance in config/sets.json. See docs/architecture.md.

class SelectionEngine {
    ; Returns an array of `count` unique codes randomly chosen from `pool`.
    static SelectRandomCodes(pool, count) {
        if (count > pool.Length)
            throw Error("SelectRandomCodes: count exceeds pool size")

        ; Fisher-Yates shuffle over a copy, then take the first `count`.
        shuffled := []
        for code in pool
            shuffled.Push(code)

        i := shuffled.Length
        while (i > 1) {
            j := Random(1, i)
            tmp := shuffled[i]
            shuffled[i] := shuffled[j]
            shuffled[j] := tmp
            i -= 1
        }

        result := []
        Loop count
            result.Push(shuffled[A_Index])
        return result
    }
}
