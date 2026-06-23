"use client";

import { useState } from "react";
import { completeStage, assignStaff, updateNote } from "@/lib/actions";
import { getDeadlineStatus, getStageDays } from "@/lib/utils";

type Staff = { id: string; name: string; color: string };

type Assignment = {
  id: string;
  stage: number;
  staffId: string | null;
  assignedAt: Date;
  staff: Staff | null;
};

type Patient = {
  id: string;
  patientName: string;
  patientId: string | null;
  note: string | null;
  deadline: Date | null;
  assignments: Assignment[];
};

type Props = {
  patient: Patient;
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

export default function PatientCard({ patient, stage, allStaff, highlighted }: Props) {
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteValue, setNoteValue] = useState(patient.note || "");
  const [pending, setPending] = useState(false);

  const currentAssignment = patient.assignments.find((a) => a.stage === stage);
  const deadlineStatus = getDeadlineStatus(patient.deadline);
  const stageDays = currentAssignment ? getStageDays(currentAssignment.assignedAt) : 0;

  async function handleComplete() {
    setPending(true);
    await completeStage(patient.id, stage);
    setPending(false);
  }

  async function handleAssign(staffId: string) {
    await assignStaff(patient.id, stage, staffId || null);
  }

  async function handleNoteSave() {
    await updateNote(patient.id, noteValue);
    setNoteEdit(false);
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 border border-slate-100 p-3 transition-all ${
        BORDER_COLOR[deadlineStatus]
      } ${highlighted ? "ring-2 ring-sky-400" : ""}`}
    >
      {/* 患者名・ID */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${STATUS_DOT[deadlineStatus]}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm truncate">{patient.patientName}</div>
          {patient.patientId && (
            <div className="text-xs text-slate-400">ID: #{patient.patientId}</div>
          )}
        </div>
      </div>

      {/* 担当者バッジ（クリックで変更） */}
      <div className="mb-2">
        <select
          className="text-xs border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50 text-slate-600 cursor-pointer"
          value={currentAssignment?.staffId || ""}
          onChange={(e) => handleAssign(e.target.value)}
        >
          <option value="">未担当</option>
          {allStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {currentAssignment?.staff && (
          <span className="inline-flex items-center gap-1 ml-1">
            <span
              className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: currentAssignment.staff.color }}
            >
              {currentAssignment.staff.name[0]}
            </span>
            <span className="text-xs text-slate-500">{currentAssignment.staff.name}</span>
          </span>
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

      {/* 底部：滞在日数 + 完了ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
          </svg>
          滞在{stageDays}日
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

