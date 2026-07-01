"use client";

import { useTransition } from "react";
import { createPatient } from "@/lib/actions";
import { PatientFormFields } from "@/components/PatientFormFields";

export function AddPatientModal({
  staffOptions,
  initialStage,
  onClose,
}: {
  staffOptions: { id: string; name: string }[];
  initialStage: number;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          患者を追加
        </h2>
        <form
          action={(formData) =>
            startTransition(async () => {
              await createPatient(formData);
              onClose();
            })
          }
        >
          <input type="hidden" name="currentStage" value={initialStage} />
          <PatientFormFields staffOptions={staffOptions} />

          <div className="mt-6 flex justify-end gap-2">
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
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
