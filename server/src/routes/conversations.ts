import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAgent } from "../middleware/auth.js";
import { triggerWebhooks } from "../lib/webhooks.js";
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

  const archiveQuerySchema = z.object({
    q: z.string().max(200).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });

  function buildArchiveWhere(query: unknown) {
    const parsed = archiveQuerySchema.safeParse(query);
    const q = parsed.success ? parsed.data.q : undefined;
    const from = parsed.success ? parsed.data.from : undefined;
    const to = parsed.success ? parsed.data.to : undefined;

    return {
      status: "CLOSED" as const,
      ...(q
        ? {
            OR: [
              { visitorName: { contains: q, mode: "insensitive" as const } },
              { visitorEmail: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
  }

  // Archives: closed conversations, searchable by visitor name/email and
  // filterable by date range.
  router.get("/archives", async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: buildArchiveWhere(req.query),
      orderBy: { closedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        assignedAgent: { select: { id: true, name: true } },
      },
      take: 200,
    });

    res.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        visitorName: c.visitorName,
        visitorEmail: c.visitorEmail,
        status: c.status,
        assignedAgent: c.assignedAgent,
        createdAt: c.createdAt,
        closedAt: c.closedAt,
        rating: c.rating,
        lastMessage: c.messages[0] ?? null,
      })),
    });
  });

  router.get("/archives/export.csv", async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: buildArchiveWhere(req.query),
      orderBy: { closedAt: "desc" },
      include: { assignedAgent: { select: { name: true } } },
      take: 5000,
    });

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["Visitor Name", "Visitor Email", "Assigned Agent", "Created At", "Closed At", "Rating"].join(",");
    const rows = conversations.map((c) =>
      [
        escape(c.visitorName ?? ""),
        escape(c.visitorEmail ?? ""),
        escape(c.assignedAgent?.name ?? "Unassigned"),
        escape(c.createdAt.toISOString()),
        escape(c.closedAt?.toISOString() ?? ""),
        escape(c.rating != null ? String(c.rating) : ""),
      ].join(",")
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="conversations-export.csv"`);
    res.send([header, ...rows].join("\n"));
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
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        firstAgentReplyAt: conversation.firstAgentReplyAt ?? new Date(),
      },
    });

    io.to(`conversation:${conversation.id}`).emit("message:new", message);
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    triggerWebhooks("message.new", { conversationId: conversation.id, senderType: "AGENT", text: message.text });

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
      data: { status: "CLOSED", closedAt: new Date() },
    });
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    io.to(`conversation:${conversation.id}`).emit("conversation:closed", { conversationId: conversation.id });
    triggerWebhooks("conversation.closed", { conversationId: conversation.id, visitorName: conversation.visitorName });
    res.json({ conversation });
  });

  router.post("/:id/reopen", async (req, res) => {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: "OPEN", closedAt: null },
    });
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    res.json({ conversation });
  });

  router.get("/:id/notes", async (req, res) => {
    const notes = await prisma.conversationNote.findMany({
      where: { conversationId: req.params.id },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ notes });
  });

  const noteSchema = z.object({ text: z.string().min(1).max(2000) });

  // Internal, agent-only notes. Writing "@Full Name" mentions a teammate —
  // matched against real agent names and resolved to ids so the UI can
  // highlight/notify them, rather than trusting arbitrary client input.
  router.post("/:id/notes", async (req, res) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const allAgents = await prisma.agent.findMany({ select: { id: true, name: true } });
    const mentionedAgentIds = allAgents
      .filter((a) => parsed.data.text.toLowerCase().includes(`@${a.name.toLowerCase()}`))
      .map((a) => a.id);

    const note = await prisma.conversationNote.create({
      data: {
        conversationId: conversation.id,
        agentId: req.agent!.agentId,
        text: parsed.data.text,
        mentionedAgentIds,
      },
      include: { agent: { select: { id: true, name: true } } },
    });

    io.to(`conversation-agents:${conversation.id}`).emit("note:new", note);
    for (const agentId of mentionedAgentIds) {
      if (agentId !== req.agent!.agentId) {
        io.to(`agent:${agentId}`).emit("note:mention", { note, conversationId: conversation.id });
      }
    }

    res.status(201).json({ note });
  });

  return router;
}
