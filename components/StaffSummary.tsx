type StaffCount = {
  id: string;
  name: string;
  count: number;
};

export function StaffSummary({ staffCounts }: { staffCounts: StaffCount[] }) {
  return (
    <div className="border-b border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-6 py-3 text-sm">
        {staffCounts.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span className="font-medium text-zinc-700">{s.name}</span>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
