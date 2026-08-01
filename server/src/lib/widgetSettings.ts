import { prisma } from "../prisma.js";

export async function getOrCreateWidgetSettings(accountId: string) {
  const existing = await prisma.widgetSettings.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.widgetSettings.create({ data: { accountId } });
}
