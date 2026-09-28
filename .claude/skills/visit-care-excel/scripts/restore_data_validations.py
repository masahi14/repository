"""Restore the dropdown lists (data validations) that openpyxl silently drops.

The original 訪問診療患者一覧.xlsx stores its dropdowns using Excel's extended
data-validation format (x14:dataValidation, tied to an xr:uid). openpyxl cannot
read or write that extension: every load_workbook()/save() round-trip drops
these validations, with only a UserWarning ("Data Validation extension is not
supported and will be removed") to show for it. Run this script on any xlsx
you produce for this workbook, right before delivering it, to write the same
dropdowns back in openpyxl's standard (non-x14) format.

Usage:
    python restore_data_validations.py <path-to-xlsx>

Edits the file in place. If you add a new dropdown column to 患者一覧 or
来院履歴, add its (sqref, source) pair to the relevant list below.
"""

import sys

import openpyxl
from openpyxl.worksheet.datavalidation import DataValidationList
from openpyxl.worksheet.datavalidation import DataValidation

# (range in the sheet, source range the dropdown list comes from)
PATIENT_LIST_VALIDATIONS = [
    ("C2:C300", "マスタ!$L$2:$L$3"),   # 介護保険
    ("D2:D300", "マスタ!$N$2:$N$3"),   # 生活保護
    ("E2:E300", "マスタ!$P$2:$P$3"),   # 資格確認書
    ("F2:F300", "マスタ!$A$2:$A$30"),  # 入所施設
    ("G2:G300", "マスタ!$C$2:$C$7"),   # 訪問頻度
    ("O2:O300", "マスタ!$T$2:$T$2"),   # 状態(終了)
]

VISIT_HISTORY_VALIDATIONS = [
    ("B2:B200", "患者一覧!$A$2:$A$300"),  # 患者ID
    ("E2:F200", "マスタ!$H$2:$H$9"),      # ドクター治療内容・次回予定
    ("G2:H200", "マスタ!$J$2:$J$8"),      # 衛生士治療内容・次回予定
]


def add_list_dv(ws, sqref, source):
    dv = DataValidation(type="list", formula1=source, allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(sqref)


def restore(path):
    wb = openpyxl.load_workbook(path, data_only=False)

    # Reset first so re-running this script (e.g. on a file that was already
    # fixed in an earlier session) doesn't pile up duplicate validations on
    # the same ranges.
    p = wb["患者一覧"]
    p.data_validations = DataValidationList()
    for sqref, source in PATIENT_LIST_VALIDATIONS:
        add_list_dv(p, sqref, source)

    k = wb["来院履歴"]
    k.data_validations = DataValidationList()
    for sqref, source in VISIT_HISTORY_VALIDATIONS:
        add_list_dv(k, sqref, source)

    wb.save(path)
    print(f"restored {len(PATIENT_LIST_VALIDATIONS)} validations on 患者一覧, "
          f"{len(VISIT_HISTORY_VALIDATIONS)} on 来院履歴 -> {path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    restore(sys.argv[1])
