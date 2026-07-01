import { prisma } from "@/lib/db";
import { ArchivedPatientRow } from "@/components/ArchivedPatientRow";

export default async function ArchivePage() {
  const patients = await prisma.patient.findMany({
    where: { archived: true },
    orderBy: { updatedAt: "desc" },
    include: { assignments: { include: { staff: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">アーカイブ</h1>
      <div className="flex flex-col gap-3">
        {patients.length === 0 && (
          <p className="text-sm text-zinc-500">
            アーカイブされた患者はいません
          </p>
        )}
        {patients.map((patient) => (
          <ArchivedPatientRow key={patient.id} patient={patient} />
        ))}
      </div>
    </div>
  );
}
