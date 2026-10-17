"use client";

import { useState } from "react";
import { completeStage, assignStaff, updateNote } from "@/lib/actions";
import { getDeadlineStatus, getStageDays } from "@/lib/utils";

type Staff = { id: string; name: string; color: string };

type Assignment = {
  id: string;
  stage: number;
  assignedAt: Date;
  staffAssignments: { staffId: string; staff: Staff }[];
};

type CaseItem = {
  id: string;
  note: string | null;
  deadline: Date | null;
  yellowDays: number;
  redDays: number;
  caseType: string;
  patient: { patientName: string; patientId: string | null };
  assignments: Assignment[];
};

type Props = {
  caseItem: CaseItem;
  stage: number;
  allStaff: Staff[];
  highlighted: boolean;
};

const BORDER_COLOR = {
  red: "border-l-red-500",
  yellow: "border-l-yellow-400",
  green: "border-l-green-500",
  none: "border-l-slate-200",
};

const STATUS_DOT = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  none: "bg-slate-300",
};

export default function PatientCard({ caseItem, stage, allStaff, highlighted }: Props) {
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteValue, setNoteValue] = useState(caseItem.note || "");
  const [pending, setPending] = useState(false);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);

  const currentAssignment = caseItem.assignments.find((a) => a.stage === stage);
  const assignedStaffIds = currentAssignment?.staffAssignments.map((sa) => sa.staffId) ?? [];
  const deadlineStatus = getDeadlineStatus(caseItem.deadline, caseItem.yellowDays, caseItem.redDays);
  const stageDays = currentAssignment ? getStageDays(currentAssignment.assignedAt) : 0;

  async function handleComplete() {
    setPending(true);
    await completeStage(caseItem.id, stage);
    setPending(false);
  }

  async function handleToggleStaff(staffId: string) {
    const next = assignedStaffIds.includes(staffId)
      ? assignedStaffIds.filter((id) => id !== staffId)
      : [...assignedStaffIds, staffId];
    await assignStaff(caseItem.id, stage, next);
  }

  async function handleNoteSave() {
    await updateNote(caseItem.id, noteValue);
    setNoteEdit(false);
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 border border-slate-100 p-3 transition-all ${
        BORDER_COLOR[deadlineStatus]
      } ${highlighted ? "ring-2 ring-sky-400" : ""}`}
    >
      {/* 患者名・ID・ケース種別 */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${STATUS_DOT[deadlineStatus]}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm truncate">{caseItem.patient.patientName}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {caseItem.patient.patientId && <span>ID: #{caseItem.patient.patientId}</span>}
            {caseItem.caseType !== "初回" && (
              <span className="text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">{caseItem.caseType}</span>
            )}
          </div>
        </div>
      </div>

      {/* 担当者（複数選択・クリックで変更） */}
      <div className="mb-2 relative">
        <button
          type="button"
          onClick={() => setStaffPickerOpen((v) => !v)}
          className="flex items-center gap-1 flex-wrap"
        >
          {!currentAssignment || currentAssignment.staffAssignments.length === 0 ? (
            <span className="text-xs border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50 text-slate-400">
              担当者を選択
            </span>
          ) : (
            currentAssignment.staffAssignments.map(({ staff }) => (
              <span
                key={staff.id}
                className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5"
              >
                <span
                  className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: staff.color }}
                >
                  {staff.name[0]}
                </span>
                <span className="text-xs text-slate-600">{staff.name}</span>
              </span>
            ))
          )}
        </button>

        {staffPickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStaffPickerOpen(false)} />
            <div className="absolute z-20 mt-1 grid grid-cols-2 gap-1 border border-slate-200 rounded-lg p-2 bg-white shadow-lg max-h-48 overflow-y-auto w-56">
              {allStaff.map((s) => {
                const checked = assignedStaffIds.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleStaff(s.id)}
                      className="w-3.5 h-3.5 accent-sky-500 flex-shrink-0"
                    />
                    <span className="truncate">{s.name}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* メモボックス */}
      <div className="mb-3">
        {noteEdit ? (
          <div className="flex gap-1">
            <input
              className="flex-1 text-xs border border-sky-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-sky-50"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleNoteSave}
              className="text-xs bg-sky-500 text-white rounded px-2 py-1 hover:bg-sky-600"
            >
              保存
            </button>
            <button onClick={() => setNoteEdit(false)} className="text-xs text-gray-400 px-1">×</button>
          </div>
        ) : (
          <button
            onClick={() => setNoteEdit(true)}
            className="w-full text-left text-xs text-slate-500 bg-sky-50 rounded px-2 py-1.5 hover:bg-sky-100 transition-colors min-h-[1.8rem]"
          >
            {noteValue || <span className="text-slate-300 italic">メモを追加…</span>}
          </button>
        )}
      </div>

      {/* 底部：滋在日数 + 完了ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
          </svg>
          滋在{stageDays}日
        </div>
        <button
          onClick={handleComplete}
          disabled={pending}
          className="text-xs font-semibold py-1 px-3 rounded-md bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
        >
          {pending ? "処理中…" : stage === 4 ? "✓ 完了→アーカイブ" : "✓ 完了"}
        </button>
      </div>
    </div>
  );
}
