import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

const EVENTS = ["conversation.created", "conversation.closed", "message.new"] as const;

router.get("/", async (_req, res) => {
  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ webhooks, availableEvents: EVENTS });
});

const createSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(EVENTS)).min(1),
});

router.post("/", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const webhook = await prisma.webhook.create({ data: parsed.data });
  res.status(201).json({ webhook });
});

const updateSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.enum(EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});

router.patch("/:id", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const webhook = await prisma.webhook.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ webhook });
});

router.delete("/:id", requireRole(["Owner", "Admin"]), async (req, res) => {
  await prisma.webhook.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
