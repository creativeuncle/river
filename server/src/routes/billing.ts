import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

async function getOrCreateBillingSettings(accountId: string) {
  return prisma.billingSettings.upsert({
    where: { accountId },
    update: {},
    create: { accountId },
  });
}

// Internal bookkeeping only — no real payment gateway is wired up. Plan and
// seat limit are just stored and displayed; nothing is actually charged.
router.get("/", async (req, res) => {
  const accountId = req.agent!.accountId;
  const [billing, seatCount] = await Promise.all([
    getOrCreateBillingSettings(accountId),
    prisma.agent.count({ where: { accountId } }),
  ]);
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
  const accountId = req.agent!.accountId;
  await getOrCreateBillingSettings(accountId);
  const billing = await prisma.billingSettings.update({ where: { accountId }, data: parsed.data });
  res.json({ billing });
});

export default router;
