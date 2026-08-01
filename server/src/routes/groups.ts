import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAgent);

router.get("/", async (req, res) => {
  const groups = await prisma.group.findMany({
    where: { accountId: req.agent!.accountId },
    include: { agents: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ groups });
});

const createSchema = z.object({ name: z.string().min(1).max(60) });

router.post("/", requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const accountId = req.agent!.accountId;
  const existing = await prisma.group.findUnique({ where: { accountId_name: { accountId, name: parsed.data.name } } });
  if (existing) {
    return res.status(409).json({ error: "A group with this name already exists" });
  }
  const group = await prisma.group.create({ data: { name: parsed.data.name, accountId } });
  res.status(201).json({ group });
});

router.delete("/:id", requireRole(["Owner", "Admin"]), async (req, res) => {
  const existing = await prisma.group.findUnique({ where: { id: req.params.id }, select: { accountId: true } });
  if (!existing || existing.accountId !== req.agent!.accountId) {
    return res.status(404).json({ error: "Group not found" });
  }
  await prisma.group.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
