import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";
import { getOrCreateWidgetSettings, SETTINGS_ID } from "../lib/widgetSettings.js";

const router = Router();
router.use(requireAgent);

router.get("/widget", async (_req, res) => {
  const settings = await getOrCreateWidgetSettings();
  res.json({ settings });
});

const updateSchema = z.object({
  companyName: z.string().min(1).max(80).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2f6fed")
    .optional(),
  position: z.enum(["left", "right"]).optional(),
  welcomeMessage: z.string().min(1).max(500).optional(),
  awayMessage: z.string().min(1).max(500).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
});

router.patch("/widget", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await getOrCreateWidgetSettings();
  const settings = await prisma.widgetSettings.update({ where: { id: SETTINGS_ID }, data: parsed.data });
  res.json({ settings });
});

export default router;
