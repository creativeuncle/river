import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

router.get("/", async (_req, res) => {
  const cannedReplies = await prisma.cannedReply.findMany({ orderBy: { shortcut: "asc" } });
  res.json({ cannedReplies });
});

const shortcutSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only");

const createSchema = z.object({
  shortcut: shortcutSchema,
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(2000),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await prisma.cannedReply.findUnique({ where: { shortcut: parsed.data.shortcut } });
  if (existing) {
    return res.status(409).json({ error: "A canned reply with this shortcut already exists" });
  }
  const cannedReply = await prisma.cannedReply.create({ data: parsed.data });
  res.status(201).json({ cannedReply });
});

const updateSchema = z.object({
  shortcut: shortcutSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  text: z.string().min(1).max(2000).optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const cannedReply = await prisma.cannedReply.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ cannedReply });
});

router.delete("/:id", async (req, res) => {
  await prisma.cannedReply.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
