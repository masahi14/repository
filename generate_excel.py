"""
generate_excel.py
訪問診療 生活保護・介護保険 券管理台帳 Excelファイル生成スクリプト

実行: python3 generate_excel.py
出力: 訪問診療_券管理台帳.xlsx
"""

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.formatting.rule import Rule
from openpyxl.styles.differential import DifferentialStyle
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# カラム定義
# ---------------------------------------------------------------------------

HEADERS = [
    "番号",          # A 1
    "患者ID",        # B 2
    "患者名",        # C 3
    "訪問日",        # D 4
    "請求対象月",    # E 5
    "券種別",        # F 6  ドロップダウン
    "医療券到着日",  # G 7
    "介護券到着日",  # H 8
    "請求ステータス",# I 9  ドロップダウン＋条件付き書式
    "請求日",        # J 10
    "担当者",        # K 11
    "メモ",          # L 12
]

COL_NO       = 1
COL_PT_ID    = 2
COL_NAME     = 3
COL_VISIT    = 4
COL_MONTH    = 5
COL_券種     = 6
COL_医療到着 = 7
COL_介護到着 = 8
COL_STATUS   = 9
COL_請求日   = 10
COL_担当     = 11
COL_MEMO     = 12
TOTAL_COLS   = 12

STATUS_OPTIONS = ["未請求", "月遅れ待ち", "請求済み", "券未着-継続追跡"]
券種_OPTIONS   = ["医療券", "介護券", "医療券+介護券"]

DATA_START = 2
DATA_END   = 300  # 300行まで対応

# ステータスごとの色（行全体に適用）
STATUS_COLORS = {
    "未請求":         ("FFE0E0", "990000"),  # 薄赤・濃赤文字
    "月遅れ待ち":     ("FFFACD", "7D6608"),  # 薄黄・茶文字
    "請求済み":       ("E8F5E9", "1B5E20"),  # 薄緑・濃緑文字
    "券未着-継続追跡":("FFE8CC", "7F3F00"),  # 薄橙・濃橙文字
}

# ダッシュボード用
DASHBOARD_LABELS = [
    ("未請求",         "FFE0E0", "990000"),
    ("月遅れ待ち",     "FFFACD", "7D6608"),
    ("券未着-継続追跡","FFE8CC", "7F3F00"),
    ("請求済み",       "E8F5E9", "1B5E20"),
]

# ---------------------------------------------------------------------------
# 共通スタイル
# ---------------------------------------------------------------------------

THIN = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"),  bottom=Side(style="thin"),
)
MEDIUM = Border(
    left=Side(style="medium"), right=Side(style="medium"),
    top=Side(style="medium"),  bottom=Side(style="medium"),
)

def header_cell(ws, row, col, value, bg="1F4E79", fg="FFFFFF", size=11, bold=True, center=True):
    c = ws.cell(row=row, column=col, value=value)
    c.fill = PatternFill("solid", fgColor=bg)
    c.font = Font(bold=bold, color=fg, size=size)
    if center:
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = THIN
    return c

def data_cell(ws, row, col, value=None):
    c = ws.cell(row=row, column=col, value=value)
    c.alignment = Alignment(vertical="center")
    c.border = THIN
    return c

# ---------------------------------------------------------------------------
# シート1: 管理台帳
# ---------------------------------------------------------------------------

SAMPLE_DATA = [
    (1, "P001", "山田 太郎",   "2026-04-10", "2026年4月", "医療券",      "2026-04-12", "",           "請求済み",       "2026-05-10", "佐藤",  ""),
    (2, "P002", "鈴木 花子",   "2026-04-11", "2026年4月", "介護券",      "",           "",           "券未着-継続追跡","",           "田中",  "複数回催促済み"),
    (3, "P003", "高橋 一郎",   "2026-04-15", "2026年4月", "医療券+介護券","2026-05-20","",           "月遅れ待ち",     "",           "佐藤",  "介護券到着待ち"),
    (4, "P004", "中村 美咲",   "2026-05-02", "2026年5月", "医療券",      "",           "",           "未請求",         "",           "山本",  ""),
    (5, "P005", "小林 健二",   "2026-05-08", "2026年5月", "医療券+介護券","",           "",           "未請求",         "",           "田中",  ""),
]

def build_管理台帳(wb):
    ws = wb.active
    ws.title = "管理台帳"

    # ヘッダー行
    for i, h in enumerate(HEADERS, 1):
        header_cell(ws, 1, i, h)
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "A2"

    # 列幅
    widths = {1:6, 2:10, 3:16, 4:13, 5:14, 6:16, 7:15, 8:15, 9:18, 10:13, 11:10, 12:26}
    for col, w in widths.items():
        ws.column_dimensions[get_column_letter(col)].width = w

    # サンプルデータ
    for r, row in enumerate(SAMPLE_DATA, DATA_START):
        for c, val in enumerate(row, 1):
            data_cell(ws, r, c, val)

    # ドロップダウン: 券種別
    dv1 = DataValidation(
        type="list",
        formula1='"' + ",".join(券種_OPTIONS) + '"',
        allow_blank=True, showDropDown=False,
        showErrorMessage=True, errorTitle="入力エラー", error="リストから選択してください",
    )
    dv1.sqref = f"F{DATA_START}:F{DATA_END}"
    ws.add_data_validation(dv1)

    # ドロップダウン: 請求ステータス
    dv2 = DataValidation(
        type="list",
        formula1='"' + ",".join(STATUS_OPTIONS) + '"',
        allow_blank=True, showDropDown=False,
        showErrorMessage=True, errorTitle="入力エラー", error="リストから選択してください",
    )
    dv2.sqref = f"I{DATA_START}:I{DATA_END}"
    ws.add_data_validation(dv2)

    # 条件付き書式: ステータスに応じて行全体を色付け
    row_range = f"A{DATA_START}:{get_column_letter(TOTAL_COLS)}{DATA_END}"
    for status, (bg, fg) in STATUS_COLORS.items():
        fill = PatternFill("solid", fgColor=bg)
        font = Font(color=fg)
        ds   = DifferentialStyle(fill=fill, font=font)
        rule = Rule(type="expression", dxf=ds)
        rule.formula = [f'$I{DATA_START}="{status}"']
        ws.conditional_formatting.add(row_range, rule)

    return ws

# ---------------------------------------------------------------------------
# シート2: ダッシュボード
# ---------------------------------------------------------------------------

def build_ダッシュボード(wb):
    ws = wb.create_sheet("ダッシュボード")

    # タイトル
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 30
    ws.merge_cells("B1:D1")
    t = ws.cell(1, 2, "訪問診療　券管理 ダッシュボード")
    t.font = Font(bold=True, size=16, color="1F4E79")
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    ws.cell(2, 2, "※ 管理台帳シートのデータを参照して自動集計します")
    ws.cell(2, 2).font = Font(italic=True, color="888888", size=9)

    ws.row_dimensions[3].height = 10

    # 集計テーブルヘッダー
    header_cell(ws, 4, 2, "ステータス", size=11)
    header_cell(ws, 4, 3, "件数",       size=11)
    header_cell(ws, 4, 4, "説明",       size=11)

    descriptions = {
        "未請求":         "券が届いており、まだ請求していない",
        "月遅れ待ち":     "先月分の券が届いており、月遅れ請求待ち",
        "券未着-継続追跡":"券が届かず追跡中。早急に確認が必要",
        "請求済み":       "請求完了済み",
    }

    for i, (status, bg, fg) in enumerate(DASHBOARD_LABELS, 5):
        # ステータスラベル
        sc = ws.cell(i, 2, status)
        sc.fill = PatternFill("solid", fgColor=bg)
        sc.font = Font(bold=True, color=fg, size=11)
        sc.alignment = Alignment(horizontal="center", vertical="center")
        sc.border = THIN
        ws.row_dimensions[i].height = 24

        # COUNTIF数式
        cc = ws.cell(i, 3)
        cc.value = f'=COUNTIF(管理台帳!$I:$I,"{status}")'
        cc.fill = PatternFill("solid", fgColor=bg)
        cc.font = Font(bold=True, color=fg, size=14)
        cc.alignment = Alignment(horizontal="center", vertical="center")
        cc.border = THIN

        # 説明
        dc = ws.cell(i, 4, descriptions.get(status, ""))
        dc.fill = PatternFill("solid", fgColor="F9F9F9")
        dc.font = Font(color="444444", size=10)
        dc.alignment = Alignment(vertical="center", indent=1)
        dc.border = THIN

    # 合計行
    total_row = 5 + len(DASHBOARD_LABELS)
    header_cell(ws, total_row, 2, "合計", bg="37474F")
    tc = ws.cell(total_row, 3)
    tc.value = f"=SUM(C5:C{total_row-1})"
    tc.fill = PatternFill("solid", fgColor="37474F")
    tc.font = Font(bold=True, color="FFFFFF", size=14)
    tc.alignment = Alignment(horizontal="center", vertical="center")
    tc.border = THIN
    ws.cell(total_row, 4).border = THIN
    ws.row_dimensions[total_row].height = 24

    # 更新方法の案内
    note_row = total_row + 2
    ws.merge_cells(f"B{note_row}:D{note_row}")
    nc = ws.cell(note_row, 2, "【使い方】管理台帳シートの「請求ステータス」列を更新すると、件数が自動反映されます。")
    nc.font = Font(italic=True, color="555555", size=9)

    return ws

# ---------------------------------------------------------------------------
# シート3: 使い方
# ---------------------------------------------------------------------------

def build_使い方(wb):
    ws = wb.create_sheet("使い方")
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 6
    ws.column_dimensions["C"].width = 60

    def title(row, text):
        ws.merge_cells(f"B{row}:C{row}")
        c = ws.cell(row, 2, text)
        c.font = Font(bold=True, size=13, color="1F4E79")
        c.fill = PatternFill("solid", fgColor="DEEAF1")
        c.alignment = Alignment(indent=1, vertical="center")
        ws.row_dimensions[row].height = 28

    def step(row, num, text):
        ws.cell(row, 2, num).font = Font(bold=True, size=11, color="1F4E79")
        ws.cell(row, 2).alignment = Alignment(horizontal="center")
        ws.cell(row, 3, text).font = Font(size=10)
        ws.cell(row, 3).alignment = Alignment(wrap_text=True, vertical="center")
        ws.row_dimensions[row].height = 20

    def note(row, text, color="444444"):
        ws.merge_cells(f"B{row}:C{row}")
        c = ws.cell(row, 2, text)
        c.font = Font(size=10, color=color, italic=True)
        c.alignment = Alignment(indent=1, wrap_text=True)
        ws.row_dimensions[row].height = 18

    r = 1
    ws.merge_cells(f"B{r}:C{r}")
    t = ws.cell(r, 2, "訪問診療　券管理台帳　使い方ガイド")
    t.font = Font(bold=True, size=15, color="FFFFFF")
    t.fill = PatternFill("solid", fgColor="1F4E79")
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[r].height = 36

    r += 2
    title(r, "■ 基本的な入力手順")
    r += 1; step(r, "①", "訪問実施後すぐに「管理台帳」に患者情報（患者ID・患者名・訪問日・請求対象月・券種別）を入力する")
    r += 1; step(r, "②", "券が届いたら「医療券到着日」または「介護券到着日」に到着日を入力する")
    r += 1; step(r, "③", "請求可能になったら「請求ステータス」をドロップダウンで更新する")
    r += 1; step(r, "④", "請求完了後は「請求日」を入力し、ステータスを「請求済み」に変更する")
    r += 1; step(r, "⑤", "「ダッシュボード」シートで未請求・月遅れ・券未着の件数を確認する")

    r += 2
    title(r, "■ ステータス説明")
    r += 1; note(r, "🔴 未請求　　　　：券が届いており、まだ請求していない状態", "990000")
    r += 1; note(r, "🟡 月遅れ待ち　　：前月以前の訪問で、月遅れ請求を予定している状態", "7D6608")
    r += 1; note(r, "🟠 券未着-継続追跡：券がいまだ届いていない。担当者が定期的に確認・催促が必要", "7F3F00")
    r += 1; note(r, "🟢 請求済み　　　：レセプト請求が完了した状態", "1B5E20")

    r += 2
    title(r, "■ 運用ポイント")
    r += 1; note(r, "・毎月レセプト締め前に「ダッシュボード」の未請求件数を必ず確認する")
    r += 1; note(r, "・「券未着-継続追跡」が残っている患者は月1回以上、区役所等への確認を推奨")
    r += 1; note(r, "・患者IDは既存の電子カルテ番号と統一すると管理しやすい")
    r += 1; note(r, "・行が赤色 = 未請求（要対応）、橙色 = 追跡中（要確認）を意識して運用する")

    return ws

# ---------------------------------------------------------------------------
# メイン
# ---------------------------------------------------------------------------

def main():
    wb = openpyxl.Workbook()
    build_管理台帳(wb)
    build_ダッシュボード(wb)
    build_使い方(wb)

    output = "訪問診療_券管理台帳.xlsx"
    wb.save(output)
    print(f"✓ 出力完了: {output}")
    print("  シート構成: 管理台帳 / ダッシュボード / 使い方")

if __name__ == "__main__":
    main()
