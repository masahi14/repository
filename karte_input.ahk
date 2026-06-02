; ============================================================
; 歯科カルテ自動入力スクリプト（エキスパートシステム用）
; ------------------------------------------------------------
; Ctrl+Shift+1 : パターン1（大人・口腔機能なし）
; Ctrl+Shift+2 : パターン2（大人・口腔機能あり）
; Ctrl+Shift+3 : パターン3（子供・18歳未満）
; ------------------------------------------------------------
; 【ネットワーク共有での使用方法】
;   1. このファイルをサーバーの共有フォルダに配置する
;   2. 各PCにAutoHotkeyをインストールする
;   3. 各PCから共有フォルダのこのファイルをダブルクリックして起動する
;   4. 毎回起動が面倒な場合はショートカットをスタートアップに登録する
; ------------------------------------------------------------
; 【調整が必要な箇所】
;   - DELAY : 入力が速すぎる/遅すぎる場合に調整（ミリ秒）
;   - CheckWindow() : ウィンドウタイトルが異なる場合に修正
;   - EC()/EX() : Enterキー以外で確定する場合は {Tab} 等に変更
; ============================================================

#Requires AutoHotkey v1.1
#SingleInstance Force
SetWorkingDir %A_ScriptDir%

global DELAY := 300

; ============================================================
; コメント候補リスト定義
; ============================================================

; 食生活コメント（大人・10個）
global adultFood := []
adultFood.Push("間食１日２回以内とし就寝前は避ける")
adultFood.Push("間食、飲料摂取について指導")
adultFood.Push("規則正しい食生活につき指導")
adultFood.Push("1口30回噛み、1日30品目摂取の心がけを説明")
adultFood.Push("就寝前の甘味料摂取は避ける")
adultFood.Push("飴やガムの摂取は習慣性にしない")
adultFood.Push("含糖食品・飲料の摂取法")
adultFood.Push("ステファンカーブの説明")
adultFood.Push("ソフトフードに偏食した食生活について指導")
adultFood.Push("繊維食品による歯牙の自浄作用を説明")

; 食生活コメント（子供・6個）
global childFood := []
childFood.Push("ステファンカーブの説明")
childFood.Push("間食１日２回以内とし就寝前は避ける")
childFood.Push("規則正しい食生活につき指導")
childFood.Push("就寝前の甘味料摂取は避ける")
childFood.Push("飴やガムの摂取は習慣性にしない")
childFood.Push("含糖食品・飲料の摂取法")

; ブラッシングコメント（大人・10個）
global adultBrush := []
adultBrush.Push("スクラビング法によるブラッシング指導")
adultBrush.Push("バス法によるブラッシング指導")
adultBrush.Push("歯ブラシの動きはゆっくり小きざみにして歯間部分岐部に刷毛が入るように指示")
adultBrush.Push("垂直法によるブラッシング指導")
adultBrush.Push("毛先磨きの指導")
adultBrush.Push("歯間ブラシを使用し、時間をかけて確実にブラッシングすることを指示")
adultBrush.Push("ブラッシング圧は弱く、ストロークは短く")
adultBrush.Push("ブラッシングは時間をかけて丁寧に行うよう指導")
adultBrush.Push("フッ化物歯磨剤のむし歯予防効果とアクセルソン法指導")
adultBrush.Push("上記内容を指導するように指示")

; ブラッシングコメント（子供・12個）
global childBrush := []
childBrush.Push("アクセルソン法によるフッ素歯磨きのやり方説明")
childBrush.Push("フォーンズ法によるブラッシング指導")
childBrush.Push("毛先を歯面に直角にあてる")
childBrush.Push("スクラビング法によるブラッシング指導")
childBrush.Push("毛先磨きの指導")
childBrush.Push("歯ブラシの動きはゆっくり小きざみにして歯間部分岐部に刷毛が入るように指示")
childBrush.Push("食後のブラッシングの重要性について")
childBrush.Push("ブラッシング圧は弱く、ストロークは短く")
childBrush.Push("ブラッシングは時間をかけて丁寧に行うよう指導")
childBrush.Push("フッ素含有歯磨剤の使い方を説明")
childBrush.Push("デンタルフロス指導")
childBrush.Push("食事後の歯磨きの必要性説明と習慣化を指導")

; 歯垢付着部位（大人・6個）
global adultLoc := []
adultLoc.Push("42577")
adultLoc.Push("42578")
adultLoc.Push("42576")
adultLoc.Push("42574")
adultLoc.Push("42600")
adultLoc.Push("46189")

; 歯垢付着部位（子供・7個、42590 臼歯部咬合面 追加）
global childLoc := []
childLoc.Push("42577")
childLoc.Push("42578")
childLoc.Push("42576")
childLoc.Push("42574")
childLoc.Push("42600")
childLoc.Push("42590")
childLoc.Push("46189")

; 口腔機能コメント（大人・6個）
global adultOral := []
adultOral.Push("あいうべ体操")
adultOral.Push("パタカラ体操")
adultOral.Push("ガムトレ")
adultOral.Push("唾液腺マッサージ")
adultOral.Push("舌清掃（舌ブラシ）")
adultOral.Push("ぶくぶくうがい")

; 口腔機能コメント（子供・6個）
global childOral := []
childOral.Push("あいうべ体操")
childOral.Push("パタカラ体操")
childOral.Push("ガムトレ")
childOral.Push("ぶくぶくうがい")
childOral.Push("口唇：頬ふくらまし")
childOral.Push("舌：舌で音鳴らす")

; ============================================================
; ホットキー定義
; ============================================================

^+1::   ; Ctrl+Shift+1: パターン1（大人・口腔機能なし）
    if !CheckWindow()
        return
    RunAdultBase(false)
    RunAdultCe()
    MsgBox, パターン1（大人・口腔機能なし）の入力が完了しました。
return

^+2::   ; Ctrl+Shift+2: パターン2（大人・口腔機能あり）
    if !CheckWindow()
        return
    RunAdultBase(true)
    RunAdultCe()
    MsgBox, パターン2（大人・口腔機能あり）の入力が完了しました。
return

^+3::   ; Ctrl+Shift+3: パターン3（子供・18歳未満）
    if !CheckWindow()
        return
    RunChild()
    MsgBox, パターン3（子供）の入力が完了しました。
return

; ============================================================
; 共通ユーティリティ関数
; ============================================================

; ウィンドウ確認（エキスパートシステムがアクティブか）
; タイトルが異なる場合は "診療入力" の部分を修正してください
CheckWindow() {
    if !WinActive("診療入力") {
        MsgBox, エキスパートシステムの診療入力画面をアクティブにしてください。
        return false
    }
    return true
}

; 5桁コードを入力してEnterで確定
EC(code) {
    global DELAY
    SendInput, %code%
    SendInput, {Enter}
    Sleep, %DELAY%
}

; コメントテキストをクリップボード経由で入力（日本語対応）
EX(text) {
    global DELAY
    oldClip := ClipboardAll
    Clipboard := text
    ClipWait, 2
    SendInput, ^v
    SendInput, {Enter}
    Sleep, %DELAY%
    Clipboard := oldClip
}

; 配列からランダムに重複なし2つのインデックスを選択
Pick2(arr, ByRef i1, ByRef i2) {
    n := arr.MaxIndex()
    Random, i1, 1, %n%
    Loop {
        Random, i2, 1, %n%
        if (i2 != i1)
            break
    }
}

; 指定インデックスを除いてランダムに1つ選択（重複防止）
PickExclude(arr, exclude) {
    n := arr.MaxIndex()
    Loop {
        Random, idx, 1, %n%
        if (idx != exclude)
            break
    }
    return idx
}

; 配列からランダム2つを選んで入力
Input2Random(arr) {
    Pick2(arr, i1, i2)
    EX(arr[i1])
    EX(arr[i2])
}

; ============================================================
; パターン1・2共通: 大人ベース入力
; oral = true の場合、衛生指導前に口腔機能セクションを挿入
; ============================================================
RunAdultBase(oral) {
    global adultFood, adultBrush, adultLoc, adultOral

    ; 冒頭コメント（歯周病継続支援）
    EC("43991")

    ; 基本診療コード
    EC("40025")
    EC("40158")
    EC("36957")
    EC("36404")
    EC("36434")
    EC("36412")
    EC("40168")
    EC("46153")

    ; 食生活指導 → 10個からランダム2つ
    EC("42637")
    Input2Random(adultFood)

    ; 長期管理加算
    EC("46942")

    ; 口腔機能セクション（パターン2のみ）
    if (oral) {
        EC("46482")
        EC("36967")
        EC("46616")

        EC("36834")
        Random, oIdx1, 1, 6
        EX(adultOral[oIdx1])
        EX("管理内容等、別紙記載")

        EC("36976")
        oIdx2 := PickExclude(adultOral, oIdx1)
        EX(adultOral[oIdx2])
        EX("管理内容等、別紙記載")
    }

    ; 衛生実地指導
    EC("40248")

    ; 歯垢付着部位 → 6個からランダム2つ
    EC("42523")
    Pick2(adultLoc, lIdx1, lIdx2)
    EC(adultLoc[lIdx1])
    EC(adultLoc[lIdx2])

    ; ブラッシングコメント → 10個からランダム2つ（常時）
    Input2Random(adultBrush)

    ; 実地指導時間
    EC("43771")
}

; ============================================================
; 大人 Ceセクション（パターン1・2共通）
; ============================================================
RunAdultCe() {
    EC("36644")
    EC("46421")
    EC("46423")
    EC("46422")
    Random, ceVal, 15, 25
    EX(ceVal)
    EC("41434")
    EC("46095")
    EC("36649")
    EX("エナメル質に白濁・粗造な着色があり、う窩形成を防ぐためフッ化物の利用等を指導した")
    EX("フッ素塗布使用薬剤（フルオール・ゼリー歯科用2%）")
}

; ============================================================
; パターン3: 子供 全体入力
; ============================================================
RunChild() {
    global childFood, childBrush, childLoc, childOral

    ; 基本診療コード（43991なし）
    EC("40025")
    EC("40158")
    EC("36957")
    EC("36404")
    EC("36434")
    EC("36412")
    EC("40168")
    EC("46153")

    ; 食生活指導 → 6個からランダム2つ
    EC("42637")
    Input2Random(childFood)

    ; 長期管理加算・衛生指導
    EC("46942")
    EC("40248")
    EC("42421")

    ; 歯垢付着部位 → 7個からランダム2つ
    EC("42523")
    Pick2(childLoc, lIdx1, lIdx2)
    EC(childLoc[lIdx1])
    EC(childLoc[lIdx2])

    ; フッ化物使用状況
    EC("42525")
    EC("43601")

    ; ブラッシングコメント → 12個からランダム2つ
    Input2Random(childBrush)

    ; う蝕活動性
    EC("42463")
    EC("42061")
    EX("上記内容を指導するように指示")
    EC("43771")

    ; 口腔機能発達不全症セクション（子供は常時）
    EC("46481")
    EC("36965")
    EC("45804")
    EC("46427")
    EC("46616")

    EC("36833")
    Random, oIdx1, 1, 6
    EX(childOral[oIdx1])
    EX("管理内容等、別紙記載")

    EC("36976")
    oIdx2 := PickExclude(childOral, oIdx1)
    EX(childOral[oIdx2])
    EX("管理内容等、別紙記載")

    ; Ceセクション（子供版）
    EC("36644")
    EX("プラークコントロール指導")
    EC("46421")
    EC("46423")
    EC("46422")
    Random, ceVal, 15, 25
    EX(ceVal)
    EC("41434")
    EC("46095")
    EX("エナメル質に白濁・粗造な着色があり、う窩形成を防ぐためフッ化物の利用等を指導した")
    EX("フッ素塗布使用薬剤（フルオール・ゼリー歯科用2%）")
    EC("45805")
    EC("36649")
}