import path from "node:path";
import { env, type PrismaConfig } from "prisma/config";

export default {
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
} satisfies PrismaConfig;
