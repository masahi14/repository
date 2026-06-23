import { prisma } from "@/lib/db";
import Link from "next/link";
import { addStaff, deleteStaff } from "@/lib/actions";

export const dynamic = "force-dynamic";

const PRESET_COLORS = [
  "#1d4ed8", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#65a30d",
];

export default async function StaffPage() {
  const staffList = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50">
      <header className="bg-white border-b border-sky-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sky-600 hover:text-sky-800 text-sm">
            ← ボードに戻る
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-sky-700">👥 担当者管理</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 max-w-lg">
        {/* 担当者追加フォーム */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">担当者を追加</h2>
          <form action={addStaff} className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">名前</label>
              <input
                name="name"
                required
                placeholder="例：田中 看護師"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">カラー</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="color" value={c} className="sr-only" defaultChecked={c === "#1d4ed8"} />
                    <span
                      className="w-8 h-8 rounded-full block border-2 border-white shadow hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
            >
              追加
            </button>
          </form>
        </div>

        {/* 担当者一覧 */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-700">担当者一覧</span>
            <span className="ml-2 text-sm text-gray-400">{staffList.length}名</span>
          </div>
          {staffList.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">担当者がいません</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {staffList.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name[0]}
                    </span>
                    <span className="font-medium text-gray-700">{s.name}</span>
                  </div>
                  <form action={deleteStaff.bind(null, s.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors"
                      onClick={(e) => {
                        if (!confirm(`「${s.name}」を削除しますか？`)) e.preventDefault();
                      }}
                    >
                      削除
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
