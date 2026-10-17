import { Fragment } from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const cases = await prisma.case.findMany({
    where: { archived: true },
    include: {
      patient: true,
      assignments: {
        include: { staffAssignments: { include: { staff: true } } },
        orderBy: { stage: "asc" },
      },
      activityLogs: { orderBy: { createdAt: "asc" } },
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
        {cases.length === 0 ? (
          <div className="text-center text-gray-400 py-20">アーカイブされた患者はいません</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 border-b border-sky-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">患者名</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">患者ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">ケース種別</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">完了日</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">担当者（各ステージ）</th>
                  <th className="text-left px-4 py-3 font-semibold text-sky-700">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="hover:bg-sky-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.patient.patientName}</td>
                      <td className="px-4 py-3 text-gray-500">{c.patient.patientId || "-"}</td>
                      <td className="px-4 py-3 text-gray-500">{c.caseType}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.updatedAt.toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {c.assignments.map((a) => (
                            <span
                              key={a.id}
                              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                            >
                              S{a.stage}:{" "}
                              {a.staffAssignments.length > 0
                                ? a.staffAssignments.map((sa) => sa.staff.name).join("・")
                                : "未担当"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                        {c.note || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-4 pb-3 pt-0 bg-sky-50/20">
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer select-none text-sky-600 hover:text-sky-800">
                            操作履歴（{c.activityLogs.length}件）
                          </summary>
                          <ul className="mt-2 space-y-0.5">
                            {c.activityLogs.map((log) => (
                              <li key={log.id}>
                                {log.createdAt.toLocaleString("ja-JP")}　{log.detail ?? log.action}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
