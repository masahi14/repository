"use client";

import { useState } from "react";
import { STAGE_NAMES } from "@/lib/constants";
import { StageColumn } from "@/components/StageColumn";
import { AddPatientModal } from "@/components/AddPatientModal";
import type { PatientCardData } from "@/components/PatientCard";

export function KanbanBoard({
  patients,
  staffOptions,
}: {
  patients: PatientCardData[];
  staffOptions: { id: string; name: string }[];
}) {
  const [addingStage, setAddingStage] = useState<number | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto p-6">
      {STAGE_NAMES.map((name, index) => {
        const stage = index + 1;
        return (
          <StageColumn
            key={stage}
            title={name}
            patients={patients.filter((p) => p.currentStage === stage)}
            staffOptions={staffOptions}
            onAddClick={() => setAddingStage(stage)}
          />
        );
      })}

      {addingStage !== null && (
        <AddPatientModal
          staffOptions={staffOptions}
          initialStage={addingStage}
          onClose={() => setAddingStage(null)}
        />
      )}
    </div>
  );
}
