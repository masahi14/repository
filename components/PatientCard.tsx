"use client";

import { useState, useTransition } from "react";
import { archivePatient, deletePatient, movePatientStage } from "@/lib/actions";
import { getDeadlineStatus, formatDateJa } from "@/lib/utils";
import { STAGE_COUNT } from "@/lib/constants";
import { EditPatientModal } from "@/components/EditPatientModal";

export type PatientCardData = {
  id: string;
  patientName: string;
  patientId: string | null;
  currentStage: number;
  deadline: Date | null;
  yellowDays: number;
  redDays: number;
  assignments: { staff: { id: string; name: string } }[];
};

const STATUS_STYLES: Record<string, string> = {
  red: "border-red-400 bg-red-50",
  yellow: "border-yellow-400 bg-yellow-50",
  normal: "border-zinc-200 bg-white",
  none: "border-zinc-200 bg-white",
};

export function PatientCard({
  patient,
  staffOptions,
}: {
  patient: PatientCardData;
  staffOptions: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const status = getDeadlineStatus(
    patient.deadline,
    patient.yellowDays,
    patient.redDays
  );

  return (
    <div
      className={`rounded-lg border p-3 shadow-sm ${STATUS_STYLES[status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-left text-sm font-semibold text-zinc-900 hover:underline"
        >
          {patient.patientName}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              if (confirm(`${patient.patientName} をアーカイブしますか？`)) {
                await archivePatient(patient.id);
              }
            })
          }
          className="text-xs text-zinc-400 hover:text-zinc-600"
          title="アーカイブ"
        >
          ✕
        </button>
      </div>

      {patient.patientId && (
        <p className="mt-0.5 text-xs text-zinc-500">ID: {patient.patientId}</p>
      )}

      {patient.deadline && (
        <p className="mt-1 text-xs font-medium text-zinc-700">
          期限: {formatDateJa(patient.deadline)}
        </p>
      )}

      {patient.assignments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {patient.assignments.map((a) => (
            <span
              key={a.staff.id}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {a.staff.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          disabled={isPending || patient.currentStage <= 1}
          onClick={() =>
            startTransition(() => movePatientStage(patient.id, "prev"))
          }
          className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
        >
          ◀ 前へ
        </button>
        <button
          type="button"
          disabled={isPending || patient.currentStage >= STAGE_COUNT}
          onClick={() =>
            startTransition(() => movePatientStage(patient.id, "next"))
          }
          className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
        >
          次へ ▶
        </button>
      </div>

      {isEditing && (
        <EditPatientModal
          patient={patient}
          staffOptions={staffOptions}
          onClose={() => setIsEditing(false)}
          onDelete={() =>
            startTransition(async () => {
              await deletePatient(patient.id);
              setIsEditing(false);
            })
          }
        />
      )}
    </div>
  );
}
