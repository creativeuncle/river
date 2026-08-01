import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAgentToken } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export type IoServer = Server;

// How many live sockets each agent currently has open (they might have
// multiple tabs), plus which account they belong to. An agent is "online"
// while their count is > 0.
const onlineAgents = new Map<string, { accountId: string; count: number }>();

export function getOnlineAgentIds(accountId?: string): string[] {
  const entries = [...onlineAgents.entries()];
  return (accountId ? entries.filter(([, v]) => v.accountId === accountId) : entries).map(([id]) => id);
}

export function isAnyAgentOnline(accountId: string): boolean {
  return [...onlineAgents.values()].some((v) => v.accountId === accountId);
}

// Two kinds of clients connect here: agents (authenticated with their JWT,
// auto-joined to the shared "agents" room for inbox notifications, plus
// their own "agent:<id>" room for targeted events like @mentions) and
// anonymous widget visitors (no login — they only ever ask to join the one
// conversation room they own, proven by visitorId matching the DB row).
export function createSocketServer(httpServer: HttpServer): IoServer {
  const io = new Server(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN ?? "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.agentToken as string | undefined;
    if (token) {
      try {
        socket.data.agent = verifyAgentToken(token);
      } catch {
        return next(new Error("Invalid agent token"));
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    const agentId: string | undefined = socket.data.agent?.agentId;
    const accountId: string | undefined = socket.data.agent?.accountId;

    if (agentId && accountId) {
      socket.join(`agents:${accountId}`);
      socket.join(`agent:${agentId}`);

      const prev = onlineAgents.get(agentId);
      onlineAgents.set(agentId, { accountId, count: (prev?.count ?? 0) + 1 });
      if (!prev) {
        io.to(`agents:${accountId}`).emit("presence:update", { agentId, online: true });
      }
      socket.emit("presence:list", { onlineAgentIds: getOnlineAgentIds(accountId) });
    }

    socket.on("conversation:join", async ({ conversationId, visitorId }: { conversationId: string; visitorId?: string }) => {
      if (typeof conversationId !== "string") return;

      if (agentId && accountId) {
        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conversation?.accountId !== accountId) return;
        // The plain "conversation:<id>" room is shared with the customer's
        // own socket (for message:new/typing) — internal-only events like
        // notes must go to this agent-only room instead, or they'd leak
        // straight into the customer's widget.
        socket.join(`conversation:${conversationId}`);
        socket.join(`conversation-agents:${conversationId}`);
        return;
      }
      if (typeof visitorId !== "string") return;
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (conversation?.visitorId === visitorId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("typing", ({ conversationId, from }: { conversationId: string; from: "agent" | "customer" }) => {
      if (typeof conversationId !== "string") return;
      socket.to(`conversation:${conversationId}`).emit("typing", { conversationId, from });
    });

    socket.on("disconnect", async () => {
      if (!agentId || !accountId) return;
      const prev = onlineAgents.get(agentId);
      const count = (prev?.count ?? 1) - 1;
      if (count <= 0) {
        onlineAgents.delete(agentId);
        await prisma.agent.update({ where: { id: agentId }, data: { lastSeenAt: new Date() } }).catch(() => {});
        io.to(`agents:${accountId}`).emit("presence:update", { agentId, online: false });
      } else {
        onlineAgents.set(agentId, { accountId, count });
      }
    });
  });

  return io;
}
