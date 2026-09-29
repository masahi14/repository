"""「担当別」シートを患者一覧から自動反映するフォーマットで作成する。

担当別の行 r（4行目以降）は患者一覧の行 r-2 に対応する。M列（衛生士次回目安日）は条件確定待ちのため見出しのみ。
"""
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

FILE = "訪問診療患者一覧.xlsx"
SRC = "患者一覧"
HEADER_ROW = 3
FIRST_ROW = 4
LAST_SRC_ROW = 501  # 患者一覧の最終行（2〜501行目）
OFFSET = FIRST_ROW - 2

DR_FILL = PatternFill("solid", fgColor="FF2F5C8A")    # ドクター（紺）
DH_FILL = PatternFill("solid", fgColor="FF7030A0")    # 衛生士（紫）
NOTE_FILL = PatternFill("solid", fgColor="FF1F7A6C")  # 備考（緑）
FACILITY_FILL = PatternFill("solid", fgColor="FFC6EFCE")
THIN = Side(style="thin", color="FFD9D9D9")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

EMPTY_ROW = f'{SRC}!$A{{p}}&{SRC}!$B{{p}}=""'


def ref(col):
    """患者一覧の値をそのまま表示（空欄は空欄のまま、0を出さない）"""
    return f'=IF({SRC}!${col}{{p}}="","",{SRC}!${col}{{p}})'


DR_NEXT = (
    f'=IF({EMPTY_ROW},"",IF({SRC}!$I{{p}}="","記録なし",'
    f'IF({SRC}!$G{{p}}="月1回",EDATE({SRC}!$I{{p}},1),'
    f'IF({SRC}!$G{{p}}="2か月1回",EDATE({SRC}!$I{{p}},2),"未定"))))'
)

# (列, 見出し, 幅, 見出し色, 数式, 種類)
COLUMNS = [
    ("A", "患者ID", 9, DR_FILL, ref("A"), "center"),
    ("B", "名前", 14, DR_FILL, ref("B"), "center"),
    ("C", "入所施設", 20, DR_FILL, ref("F"), "facility"),
    ("D", "ドクター最終来院日", 12, DR_FILL, ref("I"), "date"),
    ("E", "ドクター次回目安日", 12, DR_FILL, DR_NEXT, "date"),
    ("F", "ドクター治療内容", 12, DR_FILL, ref("J"), "center"),
    ("G", "ドクター次回予定内容", 16, DR_FILL, ref("K"), "wrap_center"),
    ("I", "患者ID", 9, DH_FILL, ref("A"), "center"),
    ("J", "名前", 14, DH_FILL, ref("B"), "center"),
    ("K", "入所施設", 20, DH_FILL, ref("F"), "facility"),
    ("L", "衛生士最終来院日", 12, DH_FILL, ref("P"), "date"),
    ("M", "衛生士次回目安日", 12, DH_FILL, None, "date"),  # 条件確定待ち
    ("N", "衛生士治療内容", 14, DH_FILL, ref("Q"), "center"),
    ("O", "衛生士次回予定内容", 16, DH_FILL, ref("R"), "wrap_center"),
    ("R", "備考", 36, NOTE_FILL, ref("V"), "wrap"),
]


def main():
    wb = load_workbook(FILE)
    ws = wb["担当別"]
    for row in ws.iter_rows():
        for c in row:
            c.value = None

    ws["A1"] = "ドクター・衛生士それぞれの最終来院日と訪問頻度から、個別に次回目安日を計算したビューです（患者一覧と自動連動・編集不要）。"
    ws["A1"].font = Font(name="Arial", size=10, italic=True, color="FF595959")

    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFFFF")
    body_font = Font(name="Arial", size=10)
    ws.row_dimensions[HEADER_ROW].height = 30
    ws.column_dimensions["H"].width = 2
    for col in ("P", "Q"):
        ws.column_dimensions[col].hidden = True

    for col, title, width, fill, formula, kind in COLUMNS:
        ws.column_dimensions[col].width = width
        h = ws[f"{col}{HEADER_ROW}"]
        h.value = title
        h.font = header_font
        h.fill = fill
        h.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        h.border = BORDER
        for p in range(2, LAST_SRC_ROW + 1):
            c = ws[f"{col}{p + OFFSET}"]
            if formula:
                c.value = formula.format(p=p)
            c.font = body_font
            c.border = BORDER
            if kind == "wrap":
                c.alignment = Alignment(vertical="center", wrap_text=True)
            else:
                c.alignment = Alignment(horizontal="center", vertical="center",
                                        wrap_text=(kind == "wrap_center"))
            if kind == "date":
                c.number_format = "yyyy/mm/dd"
            if kind == "facility":
                c.fill = FACILITY_FILL

    ws.freeze_panes = f"A{FIRST_ROW}"
    wb.save(FILE)
    print(f"saved {FILE}")


if __name__ == "__main__":
    main()
