import { prisma } from "@/lib/db";
import { StaffManager } from "@/components/StaffManager";

export default async function StaffPage() {
  const staffList = await prisma.staff.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">担当者管理</h1>
      <StaffManager staffList={staffList} />
    </div>
  );
}
