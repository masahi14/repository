"use client";

import { useState, useTransition } from "react";
import { createStaff, deleteStaff, updateStaff } from "@/lib/actions";

type StaffItem = {
  id: string;
  name: string;
  active: boolean;
};

function StaffRow({ staff }: { staff: StaffItem }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <form
        action={(formData) =>
          startTransition(async () => {
            await updateStaff(staff.id, formData);
            setIsEditing(false);
          })
        }
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3"
      >
        <input
          type="text"
          name="name"
          defaultValue={staff.name}
          required
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-1 text-sm text-zinc-600">
          <input type="checkbox" name="active" defaultChecked={staff.active} />
          有効
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          キャンセル
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
      <span
        className={`text-sm font-medium ${staff.active ? "text-zinc-900" : "text-zinc-400"}`}
      >
        {staff.name}
        {!staff.active && "（無効）"}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          編集
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              if (confirm(`${staff.name} を削除しますか？`)) {
                await deleteStaff(staff.id);
              }
            })
          }
          className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}

export function StaffManager({ staffList }: { staffList: StaffItem[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <form
        action={(formData) =>
          startTransition(async () => {
            await createStaff(formData);
          })
        }
        className="flex gap-2"
      >
        <input
          type="text"
          name="name"
          placeholder="担当者名"
          required
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          追加
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {staffList.map((staff) => (
          <StaffRow key={staff.id} staff={staff} />
        ))}
      </div>
    </div>
  );
}
