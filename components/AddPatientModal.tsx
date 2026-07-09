"use client";

import { useRef, useState } from "react";
import { addPatient, searchPatients } from "@/lib/actions";
import { CASE_TYPES } from "@/lib/constants";

type Staff = { id: string; name: string; color: string };

type PatientSearchResult = {
  id: string;
  patientName: string;
  patientId: string | null;
  cases: { id: string; caseType: string; archived: boolean; createdAt: Date }[];
};

type Props = {
  onClose: () => void;
  staffList: Staff[];
};

export default function AddPatientModal({ onClose, staffList }: Props) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleStaff(id: string) {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleNameChange(value: string) {
    setNameInput(value);
    setSelectedPatient(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setResults(await searchPatients(value));
    }, 300);
  }

  function pickPatient(p: PatientSearchResult) {
    setSelectedPatient(p);
    setNameInput(p.patientName);
    setResults([]);
  }

  async function handleSubmit(formData: FormData) {
    selectedStaffIds.forEach((id) => formData.append("staffIds", id));
    if (selectedPatient) formData.set("existingPatientId", selectedPatient.id);
    await addPatient(formData);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">患者を追加</h2>
        <form action={handleSubmit} className="flex flex-col gap-4">

          {/* 患者名 + 検索 */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              患者名 <span className="text-red-400">*</span>
            </label>
            <input
              name="patientName"
              required
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="例：山田 太郎"
              autoComplete="off"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pickPatient(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50"
                    >
                      {p.patientName}
                      {p.patientId ? `（ID: ${p.patientId}）` : ""}
                      <span className="text-xs text-gray-400 ml-1">
                        既存患者・{p.cases.length}件のケース
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedPatient ? (
            <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>既存患者「{selectedPatient.patientName}」に新しいケースを追加します</span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  解除
                </button>
              </div>
              {selectedPatient.cases.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {selectedPatient.cases.map((c) => (
                    <li key={c.id}>
                      ・{c.caseType}（{new Date(c.createdAt).toLocaleDateString("ja-JP")}・
                      {c.archived ? "完了" : "進行中"}）
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">患者ID（院内番号）</label>
              <input
                name="patientId"
                placeholder="例：P-0042"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}

          {selectedPatient && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">ケースの種類</label>
              <select
                name="caseType"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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

          {/* 担当者 */}
          {staffList.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                担当者（複数選択可）
              </label>
              <div className="grid grid-cols-3 gap-1.5 border border-gray-200 rounded-lg p-2 bg-gray-50 max-h-44 overflow-y-auto">
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
