import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";
import { getOrCreateWidgetSettings } from "../lib/widgetSettings.js";
import { isEmailConfigured } from "../lib/email.js";

const router = Router();
router.use(requireAgent);

router.get("/widget", async (req, res) => {
  const [settings, account] = await Promise.all([
    getOrCreateWidgetSettings(req.agent!.accountId),
    prisma.account.findUniqueOrThrow({ where: { id: req.agent!.accountId }, select: { siteId: true } }),
  ]);
  res.json({ settings, isEmailConfigured, siteId: account.siteId });
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
  proactiveMessageEnabled: z.boolean().optional(),
  proactiveMessageText: z.string().min(1).max(200).optional(),
  proactiveMessageDelaySeconds: z.number().int().min(3).max(300).optional(),
  notifyEmail: z.string().email().or(z.literal("")).nullable().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  whatsappNotificationsEnabled: z.boolean().optional(),
});

router.patch("/widget", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await getOrCreateWidgetSettings(req.agent!.accountId);
  const data = { ...parsed.data, notifyEmail: parsed.data.notifyEmail === "" ? null : parsed.data.notifyEmail };
  const settings = await prisma.widgetSettings.update({ where: { accountId: req.agent!.accountId }, data });
  res.json({ settings });
});

export default router;
