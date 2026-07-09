"use client";

import { useState } from "react";
import StageColumn from "./StageColumn";
import StaffSummary from "./StaffSummary";
import AddPatientModal from "./AddPatientModal";
import { STAGE_NAMES } from "@/lib/constants";

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
  currentStage: number;
  patient: { patientName: string; patientId: string | null };
  assignments: Assignment[];
};

type Props = {
  cases: CaseItem[];
  staffList: Staff[];
};

export default function KanbanBoard({ cases, staffList }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const staffWithCount = staffList.map((s) => ({
    ...s,
    taskCount: cases.filter((c) =>
      c.assignments.some((a) => a.staffAssignments.some((sa) => sa.staffId === s.id))
    ).length,
  }));

  const casesByStage = (stage: number) => cases.filter((c) => c.currentStage === stage);

  return (
    <div className="min-h-screen bg-sky-100">
      {/* ダークネイビーヘッダー */}
      <header className="bg-slate-700 sticky top-0 z-10 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-white tracking-wide">
            🦷 アライナー矯正 ワークフロー
          </h1>
          <div className="flex items-center gap-1">
            <span className="text-xs bg-slate-500 text-white font-semibold rounded px-3 py-1.5">
              ボード
            </span>
            <a
              href="/archive"
              className="text-xs text-slate-300 hover:text-white rounded px-3 py-1.5 hover:bg-slate-600 transition-colors"
            >
              アーカイブ
            </a>
            <a
              href="/staff"
              className="text-xs text-slate-300 hover:text-white rounded px-3 py-1.5 hover:bg-slate-600 transition-colors"
            >
              担当者管理
            </a>
          </div>
        </div>
        {/* 担当者タスク数バー */}
        <div className="bg-slate-600 border-t border-slate-500">
          <div className="max-w-screen-xl mx-auto px-5 py-2 flex items-center gap-3">
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">担当者別タスク数</span>
            <StaffSummary
              staffList={staffWithCount}
              onFilter={setActiveFilter}
              activeFilter={activeFilter}
            />
          </div>
        </div>
      </header>

      {/* カンバンボード */}
      <main className="max-w-screen-xl mx-auto px-4 py-5">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGE_NAMES.map((name, i) => (
            <StageColumn
              key={i}
              stageName={name}
              stageNumber={i + 1}
              cases={casesByStage(i + 1)}
              allStaff={staffList}
              activeFilterStaffId={activeFilter}
              onAddPatient={() => setShowModal(true)}
            />
          ))}
        </div>
      </main>

      {showModal && (
        <AddPatientModal onClose={() => setShowModal(false)} staffList={staffList} />
      )}
    </div>
  );
}
