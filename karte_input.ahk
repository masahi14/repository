; ============================================================
; 歯科カルテ自動入力スクリプト（エキスパートシステム用）
; トリガー: Ctrl+Shift+K
; ============================================================

#Requires AutoHotkey v1.1
#SingleInstance Force

; ---- コメント候補（10個に増やしてください） ----
comments := []
comments.Push("規則正しい食生活につき指導")
comments.Push("飴やガムの摂取は習慣性にしない")
comments.Push("就寝前の甘味料摂取は避ける")
comments.Push("1口30回噛み、1日30品目摂取の心がけを説明")
; ↓ 残り6つを追加してください
comments.Push("コメント5")
comments.Push("コメント6")
comments.Push("コメント7")
comments.Push("コメント8")
comments.Push("コメント9")
comments.Push("コメント10")

; ---- カルテ入力コード（右側の診療行為） ----
; ※ 入力後のキー（Enter or Tab）はシステムに合わせて変更してください
^+k::
    ; ウィンドウ確認（エキスパートシステムがアクティブか）
    if !WinActive("診療入力") {
        MsgBox, エキスパートシステムの診療入力画面をアクティブにしてください。
        return
    }

    ; ---- コード入力 ----
    InputCode("40025")   ; 歯科再診料
    InputCode("40158")   ; 外安全１（再診）
    InputCode("36957")   ; 外感染１（再診）
    InputCode("36404")   ; 電子的歯科診療情報連携体制整備料
    InputCode("36434")   ; 歯科外来物価対応料（再診）
    InputCode("36412")   ; ベースアップ評価料Ⅰ（再診）
    InputCode("40168")   ; 歯科疾患管理料(継続)文書提供あり
    InputCode("46153")   ; 文書提供加算（歯管）
    InputCode("42637")   ; 食生活における指導

    ; ---- コメントをランダムで2個選択して入力 ----
    Random, idx1, 1, 10
    Loop {
        Random, idx2, 1, 10
        if (idx2 != idx1)
            break
    }
    ; コメント入力（コメントの入力方法に合わせて変更）
    InputComment(comments[idx1])
    InputComment(comments[idx2])

    MsgBox, 入力完了しました。（コメント: %idx1%番 / %idx2%番）
return

; ---- コード入力関数 ----
; 5桁コードを入力してEnterで確定
; ※ Enterの代わりにTabが必要な場合は {Tab} に変更してください
InputCode(code) {
    Send, %code%
    Send, {Enter}
    Sleep, 200   ; 入力が速すぎる場合は値を増やしてください
}

; ---- コメント入力関数 ----
; コメントテキストを直接入力する場合
InputComment(text) {
    Send, %text%
    Send, {Enter}
    Sleep, 200
}
