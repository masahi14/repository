"use client";

import { useState } from "react";

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
    <div className="flex items-center gap-3 flex-wrap">
      {staffList.map((s) => (
        <button
          key={s.id}
          onClick={() => onFilter(activeFilter === s.id ? null : s.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
            activeFilter === s.id
              ? "ring-2 ring-offset-1 ring-sky-500 bg-sky-50"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: s.color }}
          >
            {s.name[0]}
          </span>
          <span className="text-sm font-medium text-gray-700">{s.name}</span>
          <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-1.5 py-0.5 font-semibold">
            {s.taskCount}
          </span>
        </button>
      ))}
      {activeFilter && (
        <button
          onClick={() => onFilter(null)}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          フィルター解除
        </button>
      )}
    </div>
  );
}
