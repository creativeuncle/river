import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Fetch a recipient's X3DH prekey bundle to establish a new Signal session.
// Consumes (marks used) one one-time prekey so it is never reused.
router.get("/:username", async (req, res) => {
  const username = req.params.username;
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      registrationId: true,
      identityPublicKey: true,
      signedPreKeyId: true,
      signedPreKeyPublic: true,
      signedPreKeySignature: true,
      preKeys: { where: { used: false }, take: 1, orderBy: { createdAt: "asc" } },
    },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const preKey = user.preKeys[0];
  if (preKey) {
    await prisma.preKey.update({ where: { id: preKey.id }, data: { used: true } });
  }

  res.json({
    userId: user.id,
    registrationId: user.registrationId,
    identityPublicKey: user.identityPublicKey,
    signedPreKey: {
      keyId: user.signedPreKeyId,
      publicKey: user.signedPreKeyPublic,
      signature: user.signedPreKeySignature,
    },
    preKey: preKey ? { keyId: preKey.keyId, publicKey: preKey.publicKey } : null,
  });
});

const topUpSchema = z.object({
  preKeys: z
    .array(z.object({ keyId: z.number().int().nonnegative(), publicKey: z.string().min(1) }))
    .min(1)
    .max(200),
});

// Client calls this periodically to replenish its pool of one-time prekeys.
router.post("/prekeys", async (req, res) => {
  const parsed = topUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await prisma.preKey.createMany({
    data: parsed.data.preKeys.map((pk) => ({
      userId: req.auth!.userId,
      keyId: pk.keyId,
      publicKey: pk.publicKey,
    })),
    skipDuplicates: true,
  });
  res.status(201).json({ ok: true });
});

// How many unused one-time prekeys remain, so the client knows when to top up.
router.get("/prekeys/count", async (req, res) => {
  const count = await prisma.preKey.count({ where: { userId: req.auth!.userId, used: false } });
  res.json({ count });
});

export default router;
