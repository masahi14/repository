export function PatientFormFields({
  staffOptions,
  defaultValues,
}: {
  staffOptions: { id: string; name: string }[];
  defaultValues?: {
    patientName?: string;
    patientId?: string | null;
    deadline?: Date | null;
    yellowDays?: number;
    redDays?: number;
    assignedStaffIds?: string[];
  };
}) {
  const deadlineValue = defaultValues?.deadline
    ? new Date(defaultValues.deadline).toISOString().slice(0, 10)
    : "";
  const assignedStaffIds = new Set(defaultValues?.assignedStaffIds ?? []);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">患者名</span>
        <input
          type="text"
          name="patientName"
          required
          defaultValue={defaultValues?.patientName}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">患者ID</span>
        <input
          type="text"
          name="patientId"
          defaultValue={defaultValues?.patientId ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">期限</span>
        <input
          type="date"
          name="deadline"
          defaultValue={deadlineValue}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">黄色にする日数</span>
          <input
            type="number"
            name="yellowDays"
            min={0}
            defaultValue={defaultValues?.yellowDays ?? 3}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">赤にする日数</span>
          <input
            type="number"
            name="redDays"
            min={0}
            defaultValue={defaultValues?.redDays ?? 1}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="font-medium text-zinc-700">担当者</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {staffOptions.map((staff) => (
            <label key={staff.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="staffIds"
                value={staff.id}
                defaultChecked={assignedStaffIds.has(staff.id)}
              />
              {staff.name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
