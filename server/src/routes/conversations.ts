import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent } from "../middleware/auth.js";
import type { IoServer } from "../socket/index.js";

export function conversationsRouter(io: IoServer) {
  const router = Router();
  router.use(requireAgent);

  // Inbox list: newest activity first, with a preview of the last message
  // and an unread-by-agent count badge.
  router.get("/", async (req, res) => {
    const status = z.enum(["OPEN", "CLOSED"]).optional().safeParse(req.query.status);
    const conversations = await prisma.conversation.findMany({
      where: status.success && status.data ? { status: status.data } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        assignedAgent: { select: { id: true, name: true } },
        _count: { select: { messages: { where: { senderType: "CUSTOMER", readByAgent: false } } } },
      },
      take: 100,
    });

    res.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        visitorId: c.visitorId,
        visitorName: c.visitorName,
        visitorEmail: c.visitorEmail,
        status: c.status,
        assignedAgent: c.assignedAgent,
        updatedAt: c.updatedAt,
        lastMessage: c.messages[0] ?? null,
        unreadCount: c._count.messages,
      })),
    });
  });

  router.get("/:id", async (req, res) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        assignedAgent: { select: { id: true, name: true } },
      },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderType: "CUSTOMER", readByAgent: false },
      data: { readByAgent: true },
    });

    res.json({ conversation });
  });

  const replySchema = z
    .object({
      text: z.string().max(4000).default(""),
      attachmentUrl: z.string().max(500).optional(),
      attachmentName: z.string().max(255).optional(),
    })
    .refine((v) => v.text.length > 0 || v.attachmentUrl, { message: "text or attachment is required" });

  router.post("/:id/messages", async (req, res) => {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "AGENT",
        agentId: req.agent!.agentId,
        text: parsed.data.text,
        attachmentUrl: parsed.data.attachmentUrl,
        attachmentName: parsed.data.attachmentName,
      },
    });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    io.to(`conversation:${conversation.id}`).emit("message:new", message);
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });

    res.status(201).json({ message });
  });

  router.post("/:id/assign", async (req, res) => {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { assignedAgentId: req.agent!.agentId },
      include: { assignedAgent: { select: { id: true, name: true } } },
    });
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    res.json({ conversation });
  });

  router.post("/:id/close", async (req, res) => {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: "CLOSED" },
    });
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    io.to(`conversation:${conversation.id}`).emit("conversation:closed", { conversationId: conversation.id });
    res.json({ conversation });
  });

  router.post("/:id/reopen", async (req, res) => {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: "OPEN" },
    });
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    res.json({ conversation });
  });

  return router;
}
