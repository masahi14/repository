"use client";

import { useTransition } from "react";
import { deletePatient, restorePatient } from "@/lib/actions";
import { formatDateJa } from "@/lib/utils";

export function ArchivedPatientRow({
  patient,
}: {
  patient: {
    id: string;
    patientName: string;
    patientId: string | null;
    deadline: Date | null;
    assignments: { staff: { id: string; name: string } }[];
  };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <p className="font-medium text-zinc-900">{patient.patientName}</p>
        <p className="text-xs text-zinc-500">
          {patient.patientId && <>ID: {patient.patientId} ・ </>}
          {patient.deadline && <>期限: {formatDateJa(patient.deadline)}</>}
        </p>
        {patient.assignments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
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
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => restorePatient(patient.id))}
          className="rounded px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          復元
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              if (confirm(`${patient.patientName} を完全に削除しますか？`)) {
                await deletePatient(patient.id);
              }
            })
          }
          className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}
