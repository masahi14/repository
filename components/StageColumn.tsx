"use client";

import { PatientCard, type PatientCardData } from "@/components/PatientCard";

export function StageColumn({
  title,
  patients,
  staffOptions,
  onAddClick,
}: {
  title: string;
  patients: PatientCardData[];
  staffOptions: { id: string; name: string }[];
  onAddClick: () => void;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-zinc-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        <button
          type="button"
          onClick={onAddClick}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-600 shadow hover:bg-zinc-50"
          title="患者を追加"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {patients.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-400">
            患者はいません
          </p>
        )}
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            staffOptions={staffOptions}
          />
        ))}
      </div>
    </div>
  );
}
