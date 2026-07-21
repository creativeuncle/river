import { prisma } from "../prisma.js";

const SETTINGS_ID = "default";

export async function getOrCreateWidgetSettings() {
  const existing = await prisma.widgetSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.widgetSettings.create({ data: { id: SETTINGS_ID } });
}

export { SETTINGS_ID };
