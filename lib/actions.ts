"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { CASE_TYPES } from "./constants";

// 既存患者検索（患者追加モーダルで使用）
export async function searchPatients(query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.patient.findMany({
    where: {
      OR: [{ patientName: { contains: q } }, { patientId: { contains: q } }],
    },
    include: {
      cases: {
        select: { id: true, caseType: true, archived: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

async function logActivity(caseId: string | null, action: string, detail: string) {
  await prisma.activityLog.create({ data: { caseId, action, detail } });
}

// 患者追加（新規患者 or 既存患者への新規ケース追加）
export async function addPatient(formData: FormData) {
  const existingPatientId = formData.get("existingPatientId") as string;
  const patientName = formData.get("patientName") as string;
  const patientId = formData.get("patientId") as string;
  const caseTypeRaw = formData.get("caseType") as string;
  const note = formData.get("note") as string;
  const deadlineStr = formData.get("deadline") as string;
  const staffIds = formData.getAll("staffIds") as string[];
  const yellowDays = parseInt(formData.get("yellowDays") as string) || 3;
  const redDays = parseInt(formData.get("redDays") as string) || 1;

  const patient = existingPatientId
    ? await prisma.patient.findUniqueOrThrow({ where: { id: existingPatientId } })
    : await prisma.patient.create({ data: { patientName, patientId: patientId || null } });

  const caseType = existingPatientId && CASE_TYPES.includes(caseTypeRaw) ? caseTypeRaw : "初回";

  const caseRecord = await prisma.case.create({
    data: {
      patientId: patient.id,
      caseType,
      note: note || null,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      yellowDays,
      redDays,
      currentStage: 1,
    },
  });

  const stageAssignment = await prisma.stageAssignment.create({
    data: { caseId: caseRecord.id, stage: 1 },
  });

  if (staffIds.length > 0) {
    await prisma.stageAssignmentStaff.createMany({
      data: staffIds.map((staffId) => ({ stageAssignmentId: stageAssignment.id, staffId })),
    });
  }

  await logActivity(
    caseRecord.id,
    "CASE_CREATED",
    `${existingPatientId ? "既存患者に追加" : "新規患者として追加"}: ${patient.patientName}（${caseType}）`
  );

  revalidatePath("/");
}

// ステージ完了 → 次ステージへ移動 or アーカイブ
export async function completeStage(caseId: string, currentStage: number) {
  const now = new Date();

  await prisma.stageAssignment.updateMany({
    where: { caseId, stage: currentStage, completedAt: null },
    data: { completedAt: now },
  });
  await logActivity(caseId, "STAGE_COMPLETED", `ステージ${currentStage}を完了`);

  if (currentStage >= 4) {
    await prisma.case.update({
      where: { id: caseId },
      data: { archived: true, updatedAt: now },
    });
    await logActivity(caseId, "CASE_ARCHIVED", "全ステージ完了によりアーカイブ");
  } else {
    const nextStage = currentStage + 1;
    await prisma.case.update({
      where: { id: caseId },
      data: { currentStage: nextStage, updatedAt: now },
    });
    await prisma.stageAssignment.create({ data: { caseId, stage: nextStage } });
  }

  revalidatePath("/");
}

// 担当者アサイン（複数人対応）
export async function assignStaff(caseId: string, stage: number, staffIds: string[]) {
  const assignment = await prisma.stageAssignment.findFirst({
    where: { caseId, stage, completedAt: null },
  });
  if (!assignment) return;

  await prisma.stageAssignmentStaff.deleteMany({ where: { stageAssignmentId: assignment.id } });
  if (staffIds.length > 0) {
    await prisma.stageAssignmentStaff.createMany({
      data: staffIds.map((staffId) => ({ stageAssignmentId: assignment.id, staffId })),
    });
  }

  const names = staffIds.length
    ? (await prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { name: true } }))
        .map((s) => s.name)
        .join("、")
    : "未担当";
  await logActivity(caseId, "STAFF_ASSIGNED", `ステージ${stage}の担当者を変更: ${names}`);

  revalidatePath("/");
}

// 担当者追加
export async function addStaff(formData: FormData) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  await prisma.staff.create({ data: { name, color: color || "#1d4ed8" } });
  await logActivity(null, "STAFF_ADDED", `担当者追加: ${name}`);
  revalidatePath("/staff");
  revalidatePath("/");
}

// 担当者削除
export async function deleteStaff(staffId: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  await prisma.staff.delete({ where: { id: staffId } });
  await logActivity(null, "STAFF_DELETED", `担当者削除: ${staff?.name ?? staffId}`);
  revalidatePath("/staff");
  revalidatePath("/");
}

// 患者メモ更新
export async function updateNote(caseId: string, note: string) {
  await prisma.case.update({ where: { id: caseId }, data: { note, updatedAt: new Date() } });
  await logActivity(caseId, "NOTE_UPDATED", "メモを更新");
  revalidatePath("/");
}
