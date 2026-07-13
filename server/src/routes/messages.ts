import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { conversationIdFor } from "../lib/conversation.js";
import type { IoServer } from "../socket/index.js";

export function messagesRouter(io: IoServer) {
  const router = Router();
  router.use(requireAuth);

  const sendSchema = z.object({
    recipientUsername: z.string().min(1),
    cipherType: z.number().int(),
    ciphertext: z.string().min(1),
  });

  // Persist + relay an opaque encrypted envelope. The server cannot read
  // its contents — it only knows sender, recipient and timing.
  router.post("/", async (req, res) => {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { recipientUsername, cipherType, ciphertext } = parsed.data;

    const recipient = await prisma.user.findUnique({ where: { username: recipientUsername } });
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const senderId = req.auth!.userId;
    const conversationId = conversationIdFor(senderId, recipient.id);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        recipientId: recipient.id,
        cipherType,
        ciphertext,
      },
    });

    const room = `user:${recipient.id}`;
    const delivered = (io.sockets.adapter.rooms.get(room)?.size ?? 0) > 0;
    io.to(room).emit("message", {
      id: message.id,
      conversationId,
      senderId,
      senderUsername: req.auth!.username,
      cipherType,
      ciphertext,
      createdAt: message.createdAt,
    });

    if (delivered) {
      await prisma.message.update({ where: { id: message.id }, data: { delivered: true } });
    }

    res.status(201).json({ id: message.id, conversationId, delivered });
  });

  // Fetch any messages the recipient missed while offline.
  router.get("/conversations/:conversationId", async (req, res) => {
    const conversationId = req.params.conversationId;
    const userId = req.auth!.userId;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: { sender: { select: { username: true } } },
    });

    await prisma.message.updateMany({
      where: { conversationId, recipientId: userId, delivered: false },
      data: { delivered: true },
    });

    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderUsername: m.sender.username,
        cipherType: m.cipherType,
        ciphertext: m.ciphertext,
        createdAt: m.createdAt,
      })),
    });
  });

  // List conversations this user has messages in, with the latest message time
  // and the other participant's username (sessions are keyed by username).
  router.get("/conversations", async (req, res) => {
    const userId = req.auth!.userId;
    const rows = await prisma.message.groupBy({
      by: ["conversationId"],
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      _max: { createdAt: true },
    });

    const sorted = rows.sort((a, b) => (b._max.createdAt! > a._max.createdAt! ? 1 : -1));

    const conversations = await Promise.all(
      sorted.map(async (r) => {
        const otherUserId = r.conversationId.split(":").find((id) => id !== userId)!;
        const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { username: true } });
        return {
          conversationId: r.conversationId,
          lastMessageAt: r._max.createdAt,
          otherUsername: other?.username ?? null,
        };
      })
    );

    res.json({ conversations });
  });

  return router;
}
