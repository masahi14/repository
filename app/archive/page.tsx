import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const patients = await prisma.patient.findMany({
    where: { archived: true },
    include: {
      assignments: {
        include: { staff: true },
        orderBy: { stage: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50">
      <header className="bg-white border-b border-sky-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sky-600 hover:text-sky-800 text-sm">
            ← ボードに戻る
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-sky-700">📦 アーカイブ</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {patients.length === 0 ? (
          <div className="text-center text-gray-400 py-20">アーカイブされた患者はいません</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 border-b border-sky-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">患者名</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">患者ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">完了日</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">担当者（各ステージ）</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.patientName}</td>
                    <td className="px-4 py-3 text-gray-500">{p.patientId || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.updatedAt.toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: a.staff?.color
                                ? `${a.staff.color}22`
                                : "#e5e7eb",
                              color: a.staff?.color || "#6b7280",
                            }}
                          >
                            S{a.stage}: {a.staff?.name || "未担当"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {p.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
