import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { isAnyAgentOnline, type IoServer } from "../socket/index.js";
import { getOrCreateWidgetSettings } from "../lib/widgetSettings.js";

// Everything under here is reachable by anonymous website visitors (no
// login) — access to a conversation's data is gated purely by knowing its
// visitorId, a random id the widget generates and keeps in localStorage.
export function widgetRouter(io: IoServer) {
  const router = Router();

  // Public widget customization (color, welcome text, position, logo).
  router.get("/settings", async (_req, res) => {
    const settings = await getOrCreateWidgetSettings();
    res.json({ settings });
  });

  async function assertOwnsConversation(conversationId: string, visitorId: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.visitorId !== visitorId) return null;
    return conversation;
  }

  // If no agent is currently online, auto-post the configured away message
  // once per conversation so the customer isn't left hanging.
  async function maybeSendAwayMessage(conversationId: string) {
    if (isAnyAgentOnline()) return;
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.awayMessageSent) return;

    const settings = await getOrCreateWidgetSettings();
    const message = await prisma.message.create({
      data: { conversationId, senderType: "AGENT", text: settings.awayMessage, isAutomated: true },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { awayMessageSent: true } });

    io.to(`conversation:${conversationId}`).emit("message:new", message);
    io.to("agents").emit("conversation:updated", { conversationId });
  }

  // Returns the visitor's most recent conversation (if any), so a returning
  // visitor picks up where they left off instead of starting a new thread.
  router.get("/conversations/mine", async (req, res) => {
    const visitorId = z.string().min(1).safeParse(req.query.visitorId);
    if (!visitorId.success) {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const conversation = await prisma.conversation.findFirst({
      where: { visitorId: visitorId.data },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    res.json({ conversation });
  });

  const startSchema = z.object({
    visitorId: z.string().min(1),
    visitorName: z.string().max(120).optional(),
    visitorEmail: z.string().email().optional(),
    text: z.string().min(1).max(4000),
  });

  // Starts a new conversation with the customer's first message.
  router.post("/conversations", async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { visitorId, visitorName, visitorEmail, text } = parsed.data;

    const created = await prisma.conversation.create({
      data: {
        visitorId,
        visitorName,
        visitorEmail,
        messages: { create: { senderType: "CUSTOMER", text } },
      },
    });

    io.to("agents").emit("conversation:new", { conversationId: created.id });
    await maybeSendAwayMessage(created.id);

    const conversation = await prisma.conversation.findUnique({
      where: { id: created.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    res.status(201).json({ conversation });
  });

  const messageSchema = z
    .object({
      visitorId: z.string().min(1),
      text: z.string().max(4000).default(""),
      attachmentUrl: z.string().max(500).optional(),
      attachmentName: z.string().max(255).optional(),
    })
    .refine((v) => v.text.length > 0 || v.attachmentUrl, { message: "text or attachment is required" });

  router.post("/conversations/:id/messages", async (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const conversation = await assertOwnsConversation(req.params.id, parsed.data.visitorId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "CUSTOMER",
        text: parsed.data.text,
        attachmentUrl: parsed.data.attachmentUrl,
        attachmentName: parsed.data.attachmentName,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date(), status: "OPEN" },
    });

    io.to(`conversation:${conversation.id}`).emit("message:new", message);
    io.to("agents").emit("conversation:updated", { conversationId: conversation.id });
    await maybeSendAwayMessage(conversation.id);

    res.status(201).json({ message });
  });

  router.get("/conversations/:id/messages", async (req, res) => {
    const visitorId = z.string().min(1).safeParse(req.query.visitorId);
    if (!visitorId.success) {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const conversation = await assertOwnsConversation(req.params.id, visitorId.data);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderType: "AGENT", readByVisitor: false },
      data: { readByVisitor: true },
    });

    res.json({ messages });
  });

  return router;
}
