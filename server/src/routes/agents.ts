import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signAgentToken } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(256),
});

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

  const passwordHash = await bcrypt.hash(password, 12);
  const agent = await prisma.agent.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
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
  res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email } });
});

export default router;
