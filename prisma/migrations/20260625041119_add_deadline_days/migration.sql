-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_name" TEXT NOT NULL,
    "patient_id" TEXT,
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "deadline" DATETIME,
    "yellow_days" INTEGER NOT NULL DEFAULT 3,
    "red_days" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_patient" ("archived", "created_at", "current_stage", "deadline", "id", "note", "patient_id", "patient_name", "updated_at") SELECT "archived", "created_at", "current_stage", "deadline", "id", "note", "patient_id", "patient_name", "updated_at" FROM "patient";
DROP TABLE "patient";
ALTER TABLE "new_patient" RENAME TO "patient";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
