import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, '_' and '.'");

const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8).max(256),
  // Signal Protocol public key material generated client-side.
  registrationId: z.number().int().positive(),
  identityPublicKey: z.string().min(1),
  signedPreKeyId: z.number().int().nonnegative(),
  signedPreKeyPublic: z.string().min(1),
  signedPreKeySignature: z.string().min(1),
  preKeys: z
    .array(z.object({ keyId: z.number().int().nonnegative(), publicKey: z.string().min(1) }))
    .min(1)
    .max(200),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      registrationId: data.registrationId,
      identityPublicKey: data.identityPublicKey,
      signedPreKeyId: data.signedPreKeyId,
      signedPreKeyPublic: data.signedPreKeyPublic,
      signedPreKeySignature: data.signedPreKeySignature,
      preKeys: {
        create: data.preKeys.map((pk) => ({ keyId: pk.keyId, publicKey: pk.publicKey })),
      },
    },
    select: { id: true, username: true },
  });

  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({ token, user });
});

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

export default router;
