"use client";

type StaffWithCount = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
};

type Props = {
  staffList: StaffWithCount[];
  onFilter: (staffId: string | null) => void;
  activeFilter: string | null;
};

export default function StaffSummary({ staffList, onFilter, activeFilter }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {staffList.map((s) => (
        <button
          key={s.id}
          onClick={() => onFilter(activeFilter === s.id ? null : s.id)}
          className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            activeFilter === s.id
              ? "bg-white text-slate-800 shadow"
              : "bg-slate-500 text-white hover:bg-slate-400"
          }`}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: s.color }}
          >
            {s.name[0]}
          </span>
          <span>{s.name}</span>
          <span
            className={`text-xs rounded-full px-1.5 py-0.5 font-bold ml-0.5 ${
              activeFilter === s.id
                ? "bg-sky-100 text-sky-700"
                : "bg-white/20 text-white"
            }`}
          >
            {s.taskCount}
          </span>
        </button>
      ))}
      {activeFilter && (
        <button
          onClick={() => onFilter(null)}
          className="text-xs text-slate-300 hover:text-white underline"
        >
          解除
        </button>
      )}
    </div>
  );
}

