-- CreateTable
CREATE TABLE "treatment_case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "case_type" TEXT NOT NULL DEFAULT '初回',
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "deadline" DATETIME,
    "yellow_days" INTEGER NOT NULL DEFAULT 3,
    "red_days" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "treatment_case_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stage_assignment_staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage_assignment_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    CONSTRAINT "stage_assignment_staff_stage_assignment_id_fkey" FOREIGN KEY ("stage_assignment_id") REFERENCES "stage_assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stage_assignment_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_assignment_staff_stage_assignment_id_staff_id_key" ON "stage_assignment_staff" ("stage_assignment_id", "staff_id");

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "treatment_case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Split existing "patient" rows into a "treatment_case" row (same workflow data) while keeping
-- the person-level row in "patient". Every pre-existing patient becomes one case of type '初回'
-- with a freshly generated case id, so historical stage_assignment rows can be repointed to it.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TEMP TABLE "_case_id_map" AS
SELECT "id" AS "patient_id", lower(hex(randomblob(16))) AS "case_id" FROM "patient";

INSERT INTO "treatment_case" ("id", "patient_id", "case_type", "current_stage", "note", "deadline", "yellow_days", "red_days", "archived", "created_at", "updated_at")
SELECT m."case_id", p."id", '初回', p."current_stage", p."note", p."deadline", p."yellow_days", p."red_days", p."archived", p."created_at", p."updated_at"
FROM "patient" p
JOIN "_case_id_map" m ON m."patient_id" = p."id";

INSERT INTO "stage_assignment_staff" ("id", "stage_assignment_id", "staff_id")
SELECT lower(hex(randomblob(16))), sa."id", sa."staff_id"
FROM "stage_assignment" sa
WHERE sa."staff_id" IS NOT NULL;

-- RedefineTables
CREATE TABLE "new_stage_assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "case_id" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "stage_assignment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "treatment_case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_stage_assignment" ("id", "case_id", "stage", "assigned_at", "completed_at")
SELECT sa."id", m."case_id", sa."stage", sa."assigned_at", sa."completed_at"
FROM "stage_assignment" sa
JOIN "_case_id_map" m ON m."patient_id" = sa."patient_id";
DROP TABLE "stage_assignment";
ALTER TABLE "new_stage_assignment" RENAME TO "stage_assignment";

-- RedefineTables
CREATE TABLE "new_patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_name" TEXT NOT NULL,
    "patient_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_patient" ("id", "patient_name", "patient_id", "created_at")
SELECT "id", "patient_name", "patient_id", "created_at" FROM "patient";
DROP TABLE "patient";
ALTER TABLE "new_patient" RENAME TO "patient";

DROP TABLE "_case_id_map";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
