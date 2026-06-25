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
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    if (selectedStaffId) formData.set("staffId", selectedStaffId);
    await addPatient(formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">患者を追加</h2>
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">
              患者名 <span className="text-red-400">*</span>
            </label>
            <input
              name="patientName"
              required
              placeholder="例：山田 太郎"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">患者ID（院内番号）</label>
            <input
              name="patientId"
              placeholder="例：P-0042"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 担当者 */}
          {staffList.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">担当者</label>
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                {staffList.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                      selectedStaffId === s.id
                        ? "bg-sky-100 border border-sky-400 text-sky-700"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-sky-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="staffRadio"
                      value={s.id}
                      checked={selectedStaffId === s.id}
                      onChange={() =>
                        setSelectedStaffId(selectedStaffId === s.id ? "" : s.id)
                      }
                      className="sr-only"
                    />
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name[0]}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </label>
                ))}
              </div>
              {selectedStaffId && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffId("")}
                  className="mt-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  選択解除
                </button>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">期限</label>
            <input
              name="deadline"
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 黄色・赤日数 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600 block mb-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1 align-middle" />
                黄色にする日数
              </label>
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
              <label className="text-sm font-medium text-gray-600 block mb-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />
                赤にする日数
              </label>
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

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">備考</label>
            <textarea
              name="note"
              rows={2}
              placeholder="メモ…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>
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
