"use client";

import { useRef, useState } from "react";
import { addPatient } from "@/lib/actions";

type Staff = { id: string; name: string; color: string };

type Props = {
  onClose: () => void;
  staffList: Staff[];
};

export default function AddPatientModal({ onClose, staffList }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  function toggleStaff(id: string) {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(formData: FormData) {
    // 最初に選択したスタッフをステージ1に割り当て
    if (selectedStaffIds.length > 0) {
      formData.set("staffId", selectedStaffIds[0]);
    }
    await addPatient(formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">患者を追加</h2>
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">

          {/* 患者名 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              患者名 <span className="text-red-400">*</span>
            </label>
            <input
              name="patientName"
              required
              placeholder="例：山田 太郎"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 患者ID */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">患者ID（院内番号）</label>
            <input
              name="patientId"
              placeholder="例：P-0042"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 担当者 */}
          {staffList.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                担当者（複数選択可）
              </label>
              <div className="grid grid-cols-3 gap-1.5 border border-gray-200 rounded-lg p-2 bg-gray-50 max-h-40 overflow-y-auto">
                {staffList.map((s) => {
                  const checked = selectedStaffIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaff(s.id)}
                        className="w-3.5 h-3.5 accent-sky-500 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700 truncate">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 期限 */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">期限</label>
            <input
              name="deadline"
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 黄色・赤日数 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">黄色にする日数</label>
              <input
                name="yellowDays"
                type="number"
                min="0"
                defaultValue={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">期限の何日前から</p>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">赤にする日数</label>
              <input
                name="redDays"
                type="number"
                min="0"
                defaultValue={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">期限の何日前から</p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
