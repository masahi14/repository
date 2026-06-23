"use client";

import { useState } from "react";
import StageColumn from "./StageColumn";
import StaffSummary from "./StaffSummary";
import AddPatientModal from "./AddPatientModal";
import { STAGE_NAMES } from "@/lib/actions";

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
  currentStage: number;
};

type Props = {
  patients: Patient[];
  staffList: Staff[];
};

export default function KanbanBoard({ patients, staffList }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 担当者ごとのタスク数集計
  const staffWithCount = staffList.map((s) => ({
    ...s,
    taskCount: patients.filter((p) =>
      p.assignments.some((a) => a.staffId === s.id)
    ).length,
  }));

  const patientsByStage = (stage: number) =>
    patients.filter((p) => p.currentStage === stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50">
      {/* トップバー */}
      <header className="bg-white border-b border-sky-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-sky-700">🦷 アライナー管理ボード</h1>
            <div className="h-5 w-px bg-gray-200" />
            <StaffSummary
              staffList={staffWithCount}
              onFilter={setActiveFilter}
              activeFilter={activeFilter}
            />
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/staff"
              className="text-xs text-gray-500 hover:text-sky-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-sky-300 transition-colors"
            >
              担当者管理
            </a>
            <a
              href="/archive"
              className="text-xs text-gray-500 hover:text-sky-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-sky-300 transition-colors"
            >
              アーカイブ
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg px-3 py-1.5 transition-colors shadow-sm"
            >
              ＋ 患者追加
            </button>
          </div>
        </div>
      </header>

      {/* カンバンボード */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGE_NAMES.map((name, i) => (
            <StageColumn
              key={i}
              stageName={name}
              stageNumber={i + 1}
              patients={patientsByStage(i + 1)}
              allStaff={staffList}
              activeFilterStaffId={activeFilter}
            />
          ))}
        </div>
      </main>

      {showModal && (
        <AddPatientModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
