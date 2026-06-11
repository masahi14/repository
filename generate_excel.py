#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
訪問診療 券管理台帳 Excel生成スクリプト
生活保護・介護保険の訪問診療患者管理用Excelファイルを生成します。
施設ごとにシートを分けて管理します。
"""

import sys
import os
from datetime import date, datetime

try:
    from openpyxl import Workbook
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation
    from openpyxl.formatting.rule import FormulaRule
except ImportError:
    print("エラー: openpyxlがインストールされていません。")
    print("インストール方法: pip install openpyxl")
    sys.exit(1)


# ============================================================
# 施設定義
# ============================================================

FACILITIES = [
    {
        "sheet_name": "ハートワン潮来",
        "name":       "ハートワン潮来",
        "tel":        "0299-94-7714",
        "color_bg":   "1F4E79",   # ヘッダー背景（青系）
        "color_tab":  "2E75B6",   # サブヘッダー背景
        "sample": [
            ("H001", "山田 太郎", date(2025, 5, 10), "2025年5月", "医療券+介護券",
             date(2025, 5, 20), date(2025, 5, 22), "請求済み",
             date(2025, 5, 25), "田中", ""),
            ("H002", "佐藤 花子", date(2025, 5, 12), "2025年5月", "医療券",
             date(2025, 5, 18), None, "請求済み",
             date(2025, 5, 23), "鈴木", ""),
            ("H003", "鈴木 一郎", date(2025, 5, 15), "2025年5月", "介護券",
             None, None, "券未着-継続追跡",
             None, "田中", "5/30以降も未着。施設へ確認要"),
            ("H004", "高橋 美子", date(2025, 5, 20), "2025年5月", "医療券+介護券",
             None, None, "月遅れ待ち",
             None, "佐藤", "6月上旬に券到着予定"),
            ("H005", "渡辺 健二", date(2025, 5, 28), "2025年5月", "医療券",
             None, None, "未請求",
             None, "鈴木", ""),
        ],
    },
    {
        "sheet_name": "養護老人ホーム潮来",
        "name":       "養護老人ホーム潮来",
        "tel":        "0299-94-7820",
        "color_bg":   "375623",   # ヘッダー背景（緑系）
        "color_tab":  "548235",   # サブヘッダー背景
        "sample": [
            ("Y001", "中村 正雄", date(2025, 5, 8),  "2025年5月", "医療券",
             date(2025, 5, 15), None, "請求済み",
             date(2025, 5, 20), "田中", ""),
            ("Y002", "小林 幸子", date(2025, 5, 14), "2025年5月", "医療券+介護券",
             None, None, "未請求",
             None, "鈴木", ""),
            ("Y003", "加藤 義男", date(2025, 5, 22), "2025年5月", "介護券",
             None, None, "券未着-継続追跡",
             None, "佐藤", "市役所へ問い合わせ中"),
        ],
    },
]

OUTPUT_FILENAME = "訪問診療_券管理台帳.xlsx"

# ステータス
STATUS_MISEI    = "未請求"
STATUS_TSUKI    = "月遅れ待ち"
STATUS_SEIKYU   = "請求済み"
STATUS_MIFUCHAKU = "券未着-継続追跡"
STATUS_LIST = [STATUS_MISEI, STATUS_TSUKI, STATUS_SEIKYU, STATUS_MIFUCHAKU]

VOUCHER_TYPES = ["医療券", "介護券", "医療券+介護券"]

# ステータスごとの色
STATUS_COLORS = {
    STATUS_MISEI:     "FFE0E0",   # 薄赤
    STATUS_TSUKI:     "FFFACD",   # 薄黄
    STATUS_SEIKYU:    "E8F5E9",   # 薄緑
    STATUS_MIFUCHAKU: "FFE8CC",   # 薄橙
}

# カラム定義: (col_idx, header, width)
# 注: 施設シートはステータス列 = I列 (col 9)
COLUMNS = [
    (1,  "No",            6),
    (2,  "患者ID",         11),
    (3,  "患者名",         16),
    (4,  "訪問日",         13),
    (5,  "請求対象月",     14),
    (6,  "券種別",         17),
    (7,  "医療券\n到着日", 14),
    (8,  "介護券\n到着日", 14),
    (9,  "請求\nステータス", 16),
    (10, "請求日",         13),
    (11, "担当者",         11),
    (12, "メモ",           32),
]
TOTAL_COLS   = 12
STATUS_COL   = 9   # I列
DATA_START   = 4   # 施設情報2行 + ヘッダー1行 → データは4行目から
DATA_END     = 203  # データ最終行


# ============================================================
# スタイルヘルパー
# ============================================================

def fill(color): return PatternFill(fill_type="solid", fgColor=color)
def font(bold=False, color="000000", size=11):
    return Font(bold=bold, color=color, size=size, name="メイリオ")
def align(h="center", v="center", wrap=False):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)
def border(style="thin"):
    s = Side(style=style)
    return Border(left=s, right=s, top=s, bottom=s)


# ============================================================
# 施設シート構築
# ============================================================

def build_facility_sheet(wb: Workbook, facility: dict, sheet_name: str):
    ws = wb.create_sheet(title=sheet_name)
    ws.sheet_view.showGridLines = True

    bg   = facility["color_bg"]
    sub  = facility["color_tab"]
    name = facility["name"]
    tel  = facility["tel"]

    # --- 行1: 施設タイトル ---
    ws.merge_cells(f"A1:{get_column_letter(TOTAL_COLS)}1")
    c = ws["A1"]
    c.value     = f"　{name}　　券管理台帳"
    c.fill      = fill(bg)
    c.font      = font(bold=True, color="FFFFFF", size=14)
    c.alignment = align("left", "center")
    ws.row_dimensions[1].height = 30

    # --- 行2: 施設情報（電話番号） ---
    ws.merge_cells(f"A2:{get_column_letter(TOTAL_COLS)}2")
    c = ws["A2"]
    c.value     = f"　TEL：{tel}　　　　券が届かない場合はこちらへ連絡してください"
    c.fill      = fill(sub)
    c.font      = font(bold=False, color="FFFFFF", size=10)
    c.alignment = align("left", "center")
    ws.row_dimensions[2].height = 20

    # --- 行3: カラムヘッダー ---
    for col_idx, header_text, col_width in COLUMNS:
        c = ws.cell(row=3, column=col_idx, value=header_text)
        c.fill      = fill("37474F")
        c.font      = font(bold=True, color="FFFFFF", size=10)
        c.alignment = align("center", "center", wrap=True)
        c.border    = border("medium")
        ws.column_dimensions[get_column_letter(col_idx)].width = col_width
    ws.row_dimensions[3].height = 30

    # ヘッダー行（3行目）を固定
    ws.freeze_panes = "A4"

    # --- ドロップダウン ---
    status_col_letter = get_column_letter(STATUS_COL)
    voucher_col_letter = get_column_letter(6)

    dv_voucher = DataValidation(
        type="list",
        formula1='"' + ",".join(VOUCHER_TYPES) + '"',
        allow_blank=True, showDropDown=False,
        showErrorMessage=True, errorTitle="入力エラー", error="リストから選択してください",
    )
    dv_voucher.sqref = f"{voucher_col_letter}{DATA_START}:{voucher_col_letter}{DATA_END}"
    ws.add_data_validation(dv_voucher)

    dv_status = DataValidation(
        type="list",
        formula1='"' + ",".join(STATUS_LIST) + '"',
        allow_blank=True, showDropDown=False,
        showErrorMessage=True, errorTitle="入力エラー", error="リストから選択してください",
    )
    dv_status.sqref = f"{status_col_letter}{DATA_START}:{status_col_letter}{DATA_END}"
    ws.add_data_validation(dv_status)

    # --- 条件付き書式（行全体をステータスで色付け）---
    cf_range = f"A{DATA_START}:{get_column_letter(TOTAL_COLS)}{DATA_END}"
    for status_val, hex_color in STATUS_COLORS.items():
        rule = FormulaRule(
            formula=[f'${status_col_letter}{DATA_START}="{status_val}"'],
            fill=fill(hex_color),
            stopIfTrue=False,
        )
        ws.conditional_formatting.add(cf_range, rule)

    # --- サンプルデータ ---
    thin = border("thin")
    data_font = font(size=10)
    center = align("center", "center")
    left   = align("left", "center", wrap=True)

    for row_offset, row_data in enumerate(facility["sample"]):
        r = DATA_START + row_offset
        (pid, pname, visit_dt, billing_month, voucher_type,
         med_arrive, care_arrive, status, billing_dt, staff, memo) = row_data

        values = [
            row_offset + 1, pid, pname, visit_dt, billing_month,
            voucher_type, med_arrive, care_arrive, status, billing_dt, staff, memo,
        ]
        for col_idx, val in enumerate(values, 1):
            c = ws.cell(row=r, column=col_idx, value=val)
            c.font   = data_font
            c.border = thin
            if col_idx in (4, 7, 8, 10) and isinstance(val, date):
                c.number_format = "YYYY/MM/DD"
                c.alignment = center
            elif col_idx in (1,):
                c.alignment = center
            elif col_idx == 12:
                c.alignment = left
            else:
                c.alignment = center
        ws.row_dimensions[r].height = 20

    # --- 空行のボーダー設定 ---
    empty_start = DATA_START + len(facility["sample"])
    for r in range(empty_start, DATA_END + 1):
        for c_idx in range(1, TOTAL_COLS + 1):
            c = ws.cell(row=r, column=c_idx)
            c.border = thin
            c.font   = data_font
            if c_idx in (4, 7, 8, 10):
                c.number_format = "YYYY/MM/DD"
                c.alignment = center
            elif c_idx == 1:
                c.alignment = center
            elif c_idx == 12:
                c.alignment = left
            else:
                c.alignment = center
        ws.row_dimensions[r].height = 20

    return ws


# ============================================================
# ダッシュボードシート
# ============================================================

def build_dashboard(wb: Workbook):
    ws = wb.create_sheet(title="ダッシュボード")
    ws.sheet_view.showGridLines = False

    # 列幅
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 14
    ws.column_dimensions["E"].width = 3

    # --- タイトル ---
    ws.merge_cells("B1:D1")
    c = ws["B1"]
    c.value     = "訪問診療　券管理　ダッシュボード"
    c.fill      = fill("1F4E79")
    c.font      = font(bold=True, color="FFFFFF", size=16)
    c.alignment = align("center", "center")
    ws.row_dimensions[1].height = 38

    ws.merge_cells("B2:D2")
    c = ws["B2"]
    c.value     = "ハートワン潮来　／　養護老人ホーム潮来"
    c.fill      = fill("D6E4F0")
    c.font      = font(size=11, color="1F4E79")
    c.alignment = align("center", "center")
    ws.row_dimensions[2].height = 22

    ws.row_dimensions[3].height = 10

    # --- 集計テーブルヘッダー ---
    headers = ["ステータス", "ハートワン\n潮来", "養護老人\nホーム潮来"]
    for i, h in enumerate(headers, 2):
        c = ws.cell(row=4, column=i, value=h)
        c.fill      = fill("37474F")
        c.font      = font(bold=True, color="FFFFFF", size=10)
        c.alignment = align("center", "center", wrap=True)
        c.border    = border("medium")
    ws.row_dimensions[4].height = 30

    # 施設シート名
    sheet_a = FACILITIES[0]["sheet_name"]
    sheet_b = FACILITIES[1]["sheet_name"]
    sc_a    = get_column_letter(STATUS_COL)
    sc_b    = get_column_letter(STATUS_COL)

    summary_rows = [
        (STATUS_MISEI,     STATUS_COLORS[STATUS_MISEI]),
        (STATUS_TSUKI,     STATUS_COLORS[STATUS_TSUKI]),
        (STATUS_MIFUCHAKU, STATUS_COLORS[STATUS_MIFUCHAKU]),
        (STATUS_SEIKYU,    STATUS_COLORS[STATUS_SEIKYU]),
    ]

    for i, (status, color) in enumerate(summary_rows, 5):
        r = i
        # ステータス名
        c = ws.cell(row=r, column=2, value=status)
        c.fill      = fill(color)
        c.font      = font(size=11, bold=True)
        c.alignment = align("left", "center")
        c.border    = border("thin")

        # 施設Aの件数
        c = ws.cell(row=r, column=3,
                    value=f"=COUNTIF('{sheet_a}'!${sc_a}:${sc_a},\"{status}\")")
        c.fill      = fill(color)
        c.font      = font(bold=True, size=14)
        c.alignment = align("center", "center")
        c.border    = border("thin")

        # 施設Bの件数
        c = ws.cell(row=r, column=4,
                    value=f"=COUNTIF('{sheet_b}'!${sc_b}:${sc_b},\"{status}\")")
        c.fill      = fill(color)
        c.font      = font(bold=True, size=14)
        c.alignment = align("center", "center")
        c.border    = border("thin")

        ws.row_dimensions[r].height = 28

    # 合計行
    total_row = 5 + len(summary_rows)
    for col, label in [(2, "合計件数"), (3, f"=COUNTA('{sheet_a}'!C{DATA_START}:C{DATA_END})"),
                       (4, f"=COUNTA('{sheet_b}'!C{DATA_START}:C{DATA_END})")]:
        c = ws.cell(row=total_row, column=col, value=label)
        c.fill      = fill("37474F")
        c.font      = font(bold=True, color="FFFFFF", size=12)
        c.alignment = align("center" if col > 2 else "left", "center")
        c.border    = border("medium")
    ws.row_dimensions[total_row].height = 28

    # 凡例
    legend_row = total_row + 2
    ws.merge_cells(f"B{legend_row}:D{legend_row}")
    c = ws[f"B{legend_row}"]
    c.value     = "■ 色の見方"
    c.fill      = fill("F0F4F8")
    c.font      = font(bold=True, size=11, color="37474F")
    c.alignment = align("left", "center")
    ws.row_dimensions[legend_row].height = 24

    legends = [
        (STATUS_MISEI,     STATUS_COLORS[STATUS_MISEI],     "券到着済みで未請求。早めに請求を。"),
        (STATUS_TSUKI,     STATUS_COLORS[STATUS_TSUKI],     "月遅れ請求待ち。期限を確認してください。"),
        (STATUS_MIFUCHAKU, STATUS_COLORS[STATUS_MIFUCHAKU], "券が届いていない。施設/市役所に連絡を。"),
        (STATUS_SEIKYU,    STATUS_COLORS[STATUS_SEIKYU],    "請求完了済み。"),
    ]
    for i, (status, color, desc) in enumerate(legends, legend_row + 1):
        c = ws.cell(row=i, column=2, value=f"  {status}")
        c.fill      = fill(color)
        c.font      = font(size=10, bold=True)
        c.alignment = align("left", "center")
        c.border    = border("thin")

        c2 = ws.cell(row=i, column=3, value=desc)
        c2.fill      = fill(color)
        c2.font      = font(size=10)
        c2.alignment = align("left", "center")
        ws.merge_cells(f"C{i}:D{i}")
        c2.border    = border("thin")

        ws.row_dimensions[i].height = 22

    return ws


# ============================================================
# 使い方シート
# ============================================================

def build_howto(wb: Workbook):
    ws = wb.create_sheet(title="使い方")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 52
    ws.column_dimensions["D"].width = 3

    r = 1

    def title_row(text):
        nonlocal r
        ws.merge_cells(f"B{r}:C{r}")
        c = ws[f"B{r}"]
        c.value     = text
        c.fill      = fill("1F4E79")
        c.font      = font(bold=True, color="FFFFFF", size=14)
        c.alignment = align("center", "center")
        ws.row_dimensions[r].height = 34
        r += 1

    def section(text):
        nonlocal r
        ws.merge_cells(f"B{r}:C{r}")
        c = ws[f"B{r}"]
        c.value     = text
        c.fill      = fill("D6E4F0")
        c.font      = font(bold=True, size=11, color="1F4E79")
        c.alignment = align("left", "center")
        ws.row_dimensions[r].height = 24
        r += 1

    def row2col(label, content, even=False):
        nonlocal r
        bg = "F8F8FF" if even else "FFFFFF"
        lc = ws.cell(row=r, column=2, value=label)
        lc.fill = fill(bg); lc.font = font(bold=True, size=10)
        lc.alignment = align("left", "center"); lc.border = border("thin")
        cc = ws.cell(row=r, column=3, value=content)
        cc.fill = fill(bg); cc.font = font(size=10)
        cc.alignment = align("left", "center", wrap=True); cc.border = border("thin")
        ws.row_dimensions[r].height = 22
        r += 1

    def spacer(h=8):
        nonlocal r
        ws.row_dimensions[r].height = h
        r += 1

    title_row("訪問診療 券管理台帳　使い方ガイド")
    spacer()

    section("【施設シートの使い方】")
    steps = [
        ("① 患者情報を登録",    "訪問後すぐに、担当施設のシートに患者IDと患者名・訪問日・請求対象月・券種別を入力します。"),
        ("② 初期ステータス",    "券が届いていない場合は「未請求」、届いている場合はそのまま請求準備をします。"),
        ("③ 券が届いたら",      "医療券または介護券の到着日欄に日付を入力します（例：2025/06/10）。"),
        ("④ 月内に届かない",    "当月中に届かない場合は「月遅れ待ち」に変更します。翌月以降に届いたら請求します。"),
        ("⑤ 請求完了後",        "「請求済み」に変更し、請求日を入力してください。"),
        ("⑥ 券が届かない場合", "「券未着-継続追跡」に変更し、メモ欄に連絡した日・相手・結果を記録します。"),
        ("⑦ 定期確認",          "「ダッシュボード」シートで2施設の未請求・追跡中の件数を毎月確認します。"),
    ]
    for i, (k, v) in enumerate(steps):
        row2col(k, v, even=(i % 2 == 0))
    spacer()

    section("【ステータスの意味】")
    status_desc = [
        ("🔴 未請求",           "券が届いており、まだ請求が完了していない状態。"),
        ("🟡 月遅れ待ち",       "当月中に券が届かず、翌月以降の請求を待っている状態。"),
        ("🟠 券未着-継続追跡",   "券がずっと届いていない。施設や市役所へ連絡して催促が必要。"),
        ("🟢 請求済み",          "請求手続きが完了した状態。"),
    ]
    for i, (k, v) in enumerate(status_desc):
        row2col(k, v, even=(i % 2 == 0))
    spacer()

    section("【券が届かないときの連絡先】")
    for fac in FACILITIES:
        row2col(fac["name"], f"TEL：{fac['tel']}　　各施設のシート上部にも記載しています。", even=False)
    spacer()

    section("【運用のポイント】")
    tips = [
        "毎月レセプト締め前にダッシュボードを確認する習慣をつけましょう。",
        "「券未着-継続追跡」が残っている患者は月1回以上、施設か市役所へ確認を。",
        "患者IDは電子カルテ番号と統一すると照合しやすいです（例：H001＝ハートワン、Y001＝養護）。",
        "メモ欄には「〇月〇日 施設に電話→来週送付予定」など対応履歴を残すと引継ぎに便利です。",
        "定期的にファイルをバックアップしてください。",
    ]
    for i, t in enumerate(tips):
        ws.merge_cells(f"B{r}:C{r}")
        c = ws[f"B{r}"]
        c.value     = f"・{t}"
        c.fill      = fill("F8F8FF" if i % 2 == 0 else "FFFFFF")
        c.font      = font(size=10)
        c.alignment = align("left", "center", wrap=True)
        ws.row_dimensions[r].height = 22
        r += 1

    return ws


# ============================================================
# メイン
# ============================================================

def main():
    print("訪問診療 券管理台帳 Excel生成を開始します...")

    try:
        wb = Workbook()
        # デフォルトシートを削除
        wb.remove(wb.active)

        print("  ダッシュボードシートを作成中...")
        build_dashboard(wb)

        for fac in FACILITIES:
            print(f"  「{fac['sheet_name']}」シートを作成中...")
            build_facility_sheet(wb, fac, fac["sheet_name"])

        print("  「使い方」シートを作成中...")
        build_howto(wb)

        # ダッシュボードをアクティブに
        wb.active = wb["ダッシュボード"]

        print(f"  ファイルを保存中: {OUTPUT_FILENAME}")
        wb.save(OUTPUT_FILENAME)

        abs_path = os.path.abspath(OUTPUT_FILENAME)
        print()
        print("=" * 60)
        print("生成完了!")
        print(f"  ファイル名 : {OUTPUT_FILENAME}")
        print(f"  保存場所   : {abs_path}")
        print()
        print("  含まれるシート:")
        print("    1. ダッシュボード       - 2施設合計の請求状況を一目確認")
        for fac in FACILITIES:
            print(f"    2. {fac['sheet_name']}  - 個別管理台帳")
        print("    4. 使い方               - 操作マニュアル")
        print("=" * 60)

    except PermissionError:
        print(f"エラー: ファイルが別のプログラムで開かれています。Excelを閉じてから再実行してください。")
        sys.exit(1)
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
