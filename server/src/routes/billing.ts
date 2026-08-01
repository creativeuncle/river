import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

const SETTINGS_ID = "default";

async function getOrCreateBillingSettings() {
  return prisma.billingSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

// Internal bookkeeping only — no real payment gateway is wired up. Plan and
// seat limit are just stored and displayed; nothing is actually charged.
router.get("/", async (_req, res) => {
  const [billing, seatCount] = await Promise.all([getOrCreateBillingSettings(), prisma.agent.count()]);
  res.json({ billing, seatCount });
});

const updateSchema = z.object({
  plan: z.enum(["Free", "Pro", "Business"]).optional(),
  seatLimit: z.number().int().min(1).max(1000).optional(),
});

router.patch("/", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await getOrCreateBillingSettings();
  const billing = await prisma.billingSettings.update({ where: { id: SETTINGS_ID }, data: parsed.data });
  res.json({ billing });
});

export default router;
