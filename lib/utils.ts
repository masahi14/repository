export type DeadlineStatus = "normal" | "yellow" | "red" | "none";

export function getDeadlineStatus(
  deadline: Date | null,
  yellowDays: number,
  redDays: number
): DeadlineStatus {
  if (!deadline) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);

  const daysRemaining = Math.round(
    (dl.getTime() - today.getTime()) / 86_400_000
  );

  if (daysRemaining <= redDays) return "red";
  if (daysRemaining <= yellowDays) return "yellow";
  return "normal";
}

export function formatDateJa(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
