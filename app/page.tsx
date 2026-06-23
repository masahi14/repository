import { prisma } from "@/lib/db";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [patients, staffList] = await Promise.all([
    prisma.patient.findMany({
      where: { archived: false },
      include: {
        assignments: {
          include: { staff: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staff.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return <KanbanBoard patients={patients} staffList={staffList} />;
}
