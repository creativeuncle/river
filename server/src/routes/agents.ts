import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent, requireRole, signAgentToken } from "../middleware/auth.js";
import { getOnlineAgentIds } from "../socket/index.js";

const router = Router();

const AGENT_SELECT = {
  id: true,
  name: true,
  email: true,
  title: true,
  role: true,
  groupId: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

// The sidebar's Agents list and the Team page — any logged-in agent can see their teammates.
router.get("/", requireAgent, async (_req, res) => {
  const agents = await prisma.agent.findMany({
    select: AGENT_SELECT,
    orderBy: { name: "asc" },
  });
  res.json({ agents, onlineAgentIds: getOnlineAgentIds() });
});

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(256),
});

// Public self-signup — the very first agent in the system becomes Owner.
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.agent.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An agent with this email already exists" });
  }

  const agentCount = await prisma.agent.count();
  const passwordHash = await bcrypt.hash(password, 12);
  const agent = await prisma.agent.create({
    data: { name, email, passwordHash, role: agentCount === 0 ? "Owner" : "Agent" },
    select: AGENT_SELECT,
  });

  const token = signAgentToken({ agentId: agent.id, name: agent.name, email: agent.email });
  res.status(201).json({ token, agent });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const agent = await prisma.agent.findUnique({ where: { email } });
  if (!agent) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const ok = await bcrypt.compare(password, agent.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signAgentToken({ agentId: agent.id, name: agent.name, email: agent.email });
  res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, title: agent.title, role: agent.role } });
});

const createTeammateSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(256),
  title: z.string().max(120).optional(),
});

// Team page "Add new agent" / "Invite agents" — creates the account directly
// (there's no email/SMTP setup here to send a real invite link yet).
router.post("/", requireAgent, requireRole(["Owner", "Admin"]), async (req, res) => {
  const parsed = createTeammateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email, password, title } = parsed.data;

  const existing = await prisma.agent.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An agent with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const agent = await prisma.agent.create({
    data: { name, email, passwordHash, title },
    select: AGENT_SELECT,
  });
  res.status(201).json({ agent });
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  role: z.string().min(1).max(40).optional(),
  groupId: z.string().nullable().optional(),
});

// Agents can edit their own name/title. Changing role, group, or someone
// else's profile requires Owner/Admin.
router.patch("/:id", requireAgent, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const isSelf = req.params.id === req.agent!.agentId;
  const touchesRestrictedFields = parsed.data.role !== undefined || parsed.data.groupId !== undefined;

  if (!isSelf || touchesRestrictedFields) {
    const requester = await prisma.agent.findUnique({ where: { id: req.agent!.agentId }, select: { role: true } });
    if (!requester || !["Owner", "Admin"].includes(requester.role)) {
      return res.status(403).json({ error: "You don't have permission to do this" });
    }
  }

  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: AGENT_SELECT,
  });
  res.json({ agent });
});

router.delete("/:id", requireAgent, requireRole(["Owner", "Admin"]), async (req, res) => {
  if (req.params.id === req.agent!.agentId) {
    return res.status(400).json({ error: "You can't remove your own account" });
  }
  await prisma.agent.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
