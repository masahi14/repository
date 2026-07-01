"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { STAGE_COUNT } from "@/lib/constants";

function getStaffIds(formData: FormData): string[] {
  return formData.getAll("staffIds").map(String);
}

function parsePatientFields(formData: FormData) {
  const patientName = String(formData.get("patientName") ?? "").trim();
  const patientId = String(formData.get("patientId") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  const yellowDays = Number(formData.get("yellowDays") ?? 3);
  const redDays = Number(formData.get("redDays") ?? 1);

  if (!patientName) {
    throw new Error("患者名は必須です");
  }

  return {
    patientName,
    patientId: patientId || null,
    deadline: deadlineRaw ? new Date(deadlineRaw) : null,
    yellowDays: Number.isFinite(yellowDays) ? yellowDays : 3,
    redDays: Number.isFinite(redDays) ? redDays : 1,
  };
}

export async function createPatient(formData: FormData): Promise<void> {
  const fields = parsePatientFields(formData);
  const staffIds = getStaffIds(formData);
  const currentStageRaw = Number(formData.get("currentStage") ?? 1);
  const currentStage = Math.min(
    Math.max(Number.isFinite(currentStageRaw) ? currentStageRaw : 1, 1),
    STAGE_COUNT
  );

  await prisma.patient.create({
    data: {
      ...fields,
      currentStage,
      assignments: {
        create: staffIds.map((staffId) => ({ staffId })),
      },
    },
  });

  revalidatePath("/");
}

export async function updatePatient(
  patientId: string,
  formData: FormData
): Promise<void> {
  const fields = parsePatientFields(formData);
  const staffIds = getStaffIds(formData);

  await prisma.$transaction([
    prisma.patient.update({
      where: { id: patientId },
      data: fields,
    }),
    prisma.patientAssignment.deleteMany({
      where: { patientId, staffId: { notIn: staffIds } },
    }),
    ...staffIds.map((staffId) =>
      prisma.patientAssignment.upsert({
        where: { patientId_staffId: { patientId, staffId } },
        update: {},
        create: { patientId, staffId },
      })
    ),
  ]);

  revalidatePath("/");
  revalidatePath("/archive");
}

export async function movePatientStage(
  patientId: string,
  direction: "next" | "prev"
): Promise<void> {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
  });

  const nextStage = direction === "next" ? patient.currentStage + 1 : patient.currentStage - 1;
  const clampedStage = Math.min(Math.max(nextStage, 1), STAGE_COUNT);

  await prisma.patient.update({
    where: { id: patientId },
    data: { currentStage: clampedStage },
  });

  revalidatePath("/");
}

export async function archivePatient(patientId: string): Promise<void> {
  await prisma.patient.update({
    where: { id: patientId },
    data: { archived: true },
  });

  revalidatePath("/");
  revalidatePath("/archive");
}

export async function restorePatient(patientId: string): Promise<void> {
  await prisma.patient.update({
    where: { id: patientId },
    data: { archived: false },
  });

  revalidatePath("/");
  revalidatePath("/archive");
}

export async function deletePatient(patientId: string): Promise<void> {
  await prisma.patient.delete({ where: { id: patientId } });

  revalidatePath("/");
  revalidatePath("/archive");
}

export async function createStaff(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("担当者名は必須です");
  }

  const maxOrder = await prisma.staff.aggregate({ _max: { order: true } });

  await prisma.staff.create({
    data: { name, order: (maxOrder._max.order ?? 0) + 1 },
  });

  revalidatePath("/staff");
  revalidatePath("/");
}

export async function updateStaff(
  staffId: string,
  formData: FormData
): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) {
    throw new Error("担当者名は必須です");
  }

  await prisma.staff.update({
    where: { id: staffId },
    data: { name, active },
  });

  revalidatePath("/staff");
  revalidatePath("/");
}

export async function deleteStaff(staffId: string): Promise<void> {
  await prisma.staff.delete({ where: { id: staffId } });

  revalidatePath("/staff");
  revalidatePath("/");
}
