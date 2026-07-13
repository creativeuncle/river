import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Search users by username prefix, so people can find each other to chat.
router.get("/search", async (req, res) => {
  const q = z.string().min(1).max(32).safeParse(req.query.q);
  if (!q.success) {
    return res.json({ users: [] });
  }
  const users = await prisma.user.findMany({
    where: {
      username: { startsWith: q.data, mode: "insensitive" },
      NOT: { id: req.auth!.userId },
    },
    select: { id: true, username: true },
    take: 20,
  });
  res.json({ users });
});

// Resolve a username to its user id without touching prekeys (unlike
// GET /keys/:username, which consumes a one-time prekey).
router.get("/:username", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: { id: true, username: true },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user });
});

export default router;
