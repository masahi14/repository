"use client";

import { deleteStaff } from "@/lib/actions";

export function DeleteStaffButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteStaff.bind(null, id)}>
      <button
        type="submit"
        className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors"
        onClick={(e) => {
          if (!confirm(`「${name}」を削除しますか？`)) e.preventDefault();
        }}
      >
        削除
      </button>
    </form>
  );
}