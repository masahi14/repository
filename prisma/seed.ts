import { prisma } from "@/lib/db";

const STAFF_NAMES = [
  "松信",
  "横瀬",
  "白田",
  "箕輪",
  "深沢",
  "仙波",
  "郡司",
  "日向寺",
  "飯田",
  "篠原",
  "澤野",
  "前野",
  "小林",
  "浅井",
];

async function main() {
  for (let i = 0; i < STAFF_NAMES.length; i++) {
    const name = STAFF_NAMES[i];
    await prisma.staff.upsert({
      where: { name },
      update: { order: i },
      create: { name, order: i },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
