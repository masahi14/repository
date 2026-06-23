"use client";

import { useRef } from "react";
import { addPatient } from "@/lib/actions";

type Props = {
  onClose: () => void;
};

export default function AddPatientModal({ onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addPatient(formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">期限</label>
            <input
              name="deadline"
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
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
