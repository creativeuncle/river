import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { isAnyAgentOnline, type IoServer } from "../socket/index.js";
import { getOrCreateWidgetSettings } from "../lib/widgetSettings.js";
import { sendNotificationEmail } from "../lib/email.js";
import { triggerWebhooks } from "../lib/webhooks.js";

// Everything under here is reachable by anonymous website visitors (no
// login) — every request must identify which company's widget it's for via
// a ?siteId= query param (the embed snippet sets this from Account.siteId).
// Access to a conversation's data is additionally gated by knowing its
// visitorId, a random id the widget generates and keeps in localStorage.
export function widgetRouter(io: IoServer) {
  const router = Router();

  async function resolveAccount(req: Request, res: Response, next: NextFunction) {
    const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }
    const account = await prisma.account.findUnique({ where: { siteId }, select: { id: true } });
    if (!account) {
      return res.status(404).json({ error: "Unknown site" });
    }
    res.locals.accountId = account.id;
    next();
  }
  router.use(resolveAccount);

  // Public widget customization (color, welcome text, position, logo).
  router.get("/settings", async (_req, res) => {
    const settings = await getOrCreateWidgetSettings(res.locals.accountId as string);
    res.json({ settings });
  });

  async function assertOwnsConversation(accountId: string, conversationId: string, visitorId: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.accountId !== accountId || conversation.visitorId !== visitorId) return null;
    return conversation;
  }

  // If no agent is currently online, auto-post the configured away message
  // once per conversation so the customer isn't left hanging.
  async function maybeSendAwayMessage(accountId: string, conversationId: string) {
    if (isAnyAgentOnline(accountId)) return;
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.awayMessageSent) return;

    const settings = await getOrCreateWidgetSettings(accountId);
    const message = await prisma.message.create({
      data: { conversationId, senderType: "AGENT", text: settings.awayMessage, isAutomated: true },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { awayMessageSent: true } });

    io.to(`conversation:${conversationId}`).emit("message:new", message);
    io.to(`agents:${accountId}`).emit("conversation:updated", { conversationId });
  }

  // If no agent is online, optionally email the configured notify address
  // so a message isn't missed entirely while everyone's away.
  async function maybeNotifyOffline(accountId: string, conversationId: string, customerText: string) {
    if (isAnyAgentOnline(accountId)) return;
    const settings = await getOrCreateWidgetSettings(accountId);
    if (!settings.emailNotificationsEnabled || !settings.notifyEmail) return;
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const from = conversation?.visitorName || conversation?.visitorEmail || "A visitor";
    await sendNotificationEmail(
      settings.notifyEmail,
      `New message from ${from}`,
      `${from} sent a message while no agent was online:\n\n"${customerText || "(attachment)"}"\n\nReply from the dashboard.`
    );
  }

  // Returns the visitor's most recent conversation (if any), so a returning
  // visitor picks up where they left off instead of starting a new thread.
  router.get("/conversations/mine", async (req, res) => {
    const visitorId = z.string().min(1).safeParse(req.query.visitorId);
    if (!visitorId.success) {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const conversation = await prisma.conversation.findFirst({
      where: { accountId: res.locals.accountId as string, visitorId: visitorId.data },
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
    const accountId = res.locals.accountId as string;
    const { visitorId, visitorName, visitorEmail, text } = parsed.data;

    const created = await prisma.conversation.create({
      data: {
        accountId,
        visitorId,
        visitorName,
        visitorEmail,
        messages: { create: { senderType: "CUSTOMER", text } },
      },
    });

    io.to(`agents:${accountId}`).emit("conversation:new", { conversationId: created.id });
    await maybeSendAwayMessage(accountId, created.id);
    await maybeNotifyOffline(accountId, created.id, text);
    triggerWebhooks(accountId, "conversation.created", { conversationId: created.id, visitorName, visitorEmail, text });

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
    const accountId = res.locals.accountId as string;
    const conversation = await assertOwnsConversation(accountId, req.params.id, parsed.data.visitorId);
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
    io.to(`agents:${accountId}`).emit("conversation:updated", { conversationId: conversation.id });
    await maybeSendAwayMessage(accountId, conversation.id);
    await maybeNotifyOffline(accountId, conversation.id, parsed.data.text);
    triggerWebhooks(accountId, "message.new", { conversationId: conversation.id, senderType: "CUSTOMER", text: parsed.data.text });

    res.status(201).json({ message });
  });

  router.get("/conversations/:id/messages", async (req, res) => {
    const visitorId = z.string().min(1).safeParse(req.query.visitorId);
    if (!visitorId.success) {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const conversation = await assertOwnsConversation(res.locals.accountId as string, req.params.id, visitorId.data);
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

  const ratingSchema = z.object({
    visitorId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  });

  // Customer Satisfaction (CSAT): the widget shows a 1-5 rating prompt once
  // a conversation is closed; this records it. One rating per conversation.
  router.post("/conversations/:id/rating", async (req, res) => {
    const parsed = ratingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const accountId = res.locals.accountId as string;
    const conversation = await assertOwnsConversation(accountId, req.params.id, parsed.data.visitorId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (conversation.rating != null) {
      return res.status(409).json({ error: "This conversation has already been rated" });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { rating: parsed.data.rating, ratingComment: parsed.data.comment },
    });
    io.to(`agents:${accountId}`).emit("conversation:updated", { conversationId: conversation.id });

    res.json({ conversation: updated });
  });

  return router;
}
