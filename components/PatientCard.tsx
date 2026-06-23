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

export default function PatientCard({ patient, stage, allStaff, highlighted }: Props) {
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteValue, setNoteValue] = useState(patient.note || "");
  const [pending, setPending] = useState(false);

  const assignment = patient.assignments.find((a) => a.stage === stage && !("completedAt" in a));
  const currentAssignment = patient.assignments.find((a) => a.stage === stage);
  const deadlineStatus = getDeadlineStatus(patient.deadline);
  const stageDays = currentAssignment ? getStageDays(currentAssignment.assignedAt) : 0;

  const deadlineIcon =
    deadlineStatus === "red"
      ? "🔴"
      : deadlineStatus === "yellow"
      ? "🟡"
      : deadlineStatus === "green"
      ? "🟢"
      : "";

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
      className={`bg-white rounded-xl shadow-sm border p-3 transition-all ${
        highlighted ? "ring-2 ring-sky-400 shadow-sky-100" : "border-sky-100"
      }`}
    >
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {deadlineIcon && <span className="text-sm">{deadlineIcon}</span>}
            <span className="font-semibold text-gray-800 truncate">{patient.patientName}</span>
            {patient.patientId && (
              <span className="text-xs text-gray-400">#{patient.patientId}</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">滞在 {stageDays}日</div>
        </div>
        {/* 担当者バッジ */}
        <div className="flex-shrink-0">
          <select
            className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-gray-50 text-gray-600 cursor-pointer"
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
        </div>
      </div>

      {/* 担当者カラーバッジ */}
      {currentAssignment?.staff && (
        <div className="flex items-center gap-1 mb-2">
          <span
            className="w-4 h-4 rounded-full inline-block"
            style={{ backgroundColor: currentAssignment.staff.color }}
          />
          <span className="text-xs text-gray-500">{currentAssignment.staff.name}</span>
        </div>
      )}

      {/* メモ */}
      <div className="mb-2">
        {noteEdit ? (
          <div className="flex gap-1">
            <input
              className="flex-1 text-xs border border-sky-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
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
            <button
              onClick={() => setNoteEdit(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNoteEdit(true)}
            className="w-full text-left text-xs text-gray-400 italic hover:text-gray-600 min-h-[1.2rem]"
          >
            {noteValue || "メモを追加…"}
          </button>
        )}
      </div>

      {/* 完了ボタン */}
      <button
        onClick={handleComplete}
        disabled={pending}
        className="w-full text-xs font-semibold py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-50"
      >
        {pending ? "処理中…" : stage === 4 ? "完了→アーカイブ" : "完了 →"}
      </button>
    </div>
  );
}
