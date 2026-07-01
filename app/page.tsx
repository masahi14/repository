import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/KanbanBoard";
import { StaffSummary } from "@/components/StaffSummary";

export default async function Home() {
  const [patients, staff] = await Promise.all([
    prisma.patient.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      include: { assignments: { include: { staff: true } } },
    }),
    prisma.staff.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const staffCounts = staff.map((s) => ({
    id: s.id,
    name: s.name,
    count: patients.filter((p) =>
      p.assignments.some((a) => a.staff.id === s.id)
    ).length,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <StaffSummary staffCounts={staffCounts} />
      <KanbanBoard patients={patients} staffOptions={staff} />
    </div>
  );
}
