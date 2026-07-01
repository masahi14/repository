"use client";

import { useTransition } from "react";
import { updatePatient } from "@/lib/actions";
import { PatientFormFields } from "@/components/PatientFormFields";
import type { PatientCardData } from "@/components/PatientCard";

export function EditPatientModal({
  patient,
  staffOptions,
  onClose,
  onDelete,
}: {
  patient: PatientCardData;
  staffOptions: { id: string; name: string }[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          患者情報を編集
        </h2>
        <form
          action={(formData) =>
            startTransition(async () => {
              await updatePatient(patient.id, formData);
              onClose();
            })
          }
        >
          <PatientFormFields
            staffOptions={staffOptions}
            defaultValues={{
              patientName: patient.patientName,
              patientId: patient.patientId,
              deadline: patient.deadline,
              yellowDays: patient.yellowDays,
              redDays: patient.redDays,
              assignedStaffIds: patient.assignments.map((a) => a.staff.id),
            }}
          />

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm(`${patient.patientName} を完全に削除しますか？`)) {
                  onDelete();
                }
              }}
              className="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              削除
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
