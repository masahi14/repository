import { prisma } from "@/lib/db";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cases, staffList] = await Promise.all([
    prisma.case.findMany({
      where: { archived: false },
      include: {
        patient: true,
        assignments: {
          include: { staffAssignments: { include: { staff: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staff.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return <KanbanBoard cases={cases} staffList={staffList} />;
}
