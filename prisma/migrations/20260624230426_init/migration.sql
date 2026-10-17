-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1d4ed8',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_name" TEXT NOT NULL,
    "patient_id" TEXT,
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "deadline" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "stage_assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "staff_id" TEXT,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "stage_assignment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stage_assignment_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
