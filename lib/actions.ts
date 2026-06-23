"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";

export const STAGE_NAMES = ["オートセグメント", "プランニング", "サポート設定", "プリンティング"];

// 患者追加
export async function addPatient(formData: FormData) {
  const patientName = formData.get("patientName") as string;
  const patientId = formData.get("patientId") as string;
  const note = formData.get("note") as string;
  const deadlineStr = formData.get("deadline") as string;

  const patient = await prisma.patient.create({
    data: {
      patientName,
      patientId: patientId || null,
      note: note || null,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      currentStage: 1,
    },
  });

  // ステージ1のアサインレコード作成
  await prisma.stageAssignment.create({
    data: {
      patientId: patient.id,
      stage: 1,
    },
  });

  revalidatePath("/");
}

// ステージ完了 → 次ステージへ移動 or アーカイブ
export async function completeStage(patientId: string, currentStage: number) {
  const now = new Date();

  // 現在のアサインを完了
  await prisma.stageAssignment.updateMany({
    where: { patientId, stage: currentStage, completedAt: null },
    data: { completedAt: now },
  });

  if (currentStage >= 4) {
    // アーカイブへ
    await prisma.patient.update({
      where: { id: patientId },
      data: { archived: true, updatedAt: now },
    });
  } else {
    const nextStage = currentStage + 1;
    await prisma.patient.update({
      where: { id: patientId },
      data: { currentStage: nextStage, updatedAt: now },
    });
    // 次ステージのアサインレコード作成
    await prisma.stageAssignment.create({
      data: { patientId, stage: nextStage },
    });
  }

  revalidatePath("/");
}

// 担当者アサイン
export async function assignStaff(patientId: string, stage: number, staffId: string | null) {
  await prisma.stageAssignment.updateMany({
    where: { patientId, stage, completedAt: null },
    data: { staffId: staffId || null },
  });
  revalidatePath("/");
}

// 担当者追加
export async function addStaff(formData: FormData) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  await prisma.staff.create({ data: { name, color: color || "#1d4ed8" } });
  revalidatePath("/staff");
  revalidatePath("/");
}

// 担当者削除
export async function deleteStaff(staffId: string) {
  await prisma.staff.delete({ where: { id: staffId } });
  revalidatePath("/staff");
  revalidatePath("/");
}

// 患者メモ更新
export async function updateNote(patientId: string, note: string) {
  await prisma.patient.update({
    where: { id: patientId },
    data: { note, updatedAt: new Date() },
  });
  revalidatePath("/");
}
