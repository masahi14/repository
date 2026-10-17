import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: "./dev.db" });
const prisma = new PrismaClient({ adapter });

const STAFF_NAMES = [
  "原", "ゆさな", "白内",
  "松信", "横瀬", "白田",
  "箕輪", "深沢", "仙波",
  "郡司", "日向寺", "飯田",
  "篠原", "澤野", "前野",
  "小林", "浅井", "諸谷",
];

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981",
  "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f97316",
  "#6366f1", "#14b8a6", "#e11d48",
  "#0ea5e9", "#a855f7", "#22c55e",
  "#fb923c", "#64748b", "#d946ef",
];

async function main() {
  await prisma.staff.deleteMany();

  for (let i = 0; i < STAFF_NAMES.length; i++) {
    await prisma.staff.create({
      data: {
        name: STAFF_NAMES[i],
        color: COLORS[i % COLORS.length],
      },
    });
  }

  console.log(`✅ ${STAFF_NAMES.length}名のスタッフを登録しました`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
