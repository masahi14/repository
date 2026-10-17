import { defineConfig } from "prisma/config";
import path from "path";

const isLocalDev = !process.env.DATABASE_URL;

export default defineConfig({
  schema: isLocalDev
    ? path.join(__dirname, "prisma/schema.sqlite.prisma")
    : path.join(__dirname, "prisma/schema.prisma"),
  datasource: isLocalDev
    ? { url: "file:./dev.db" }
    : { url: process.env.DATABASE_URL! },
});
