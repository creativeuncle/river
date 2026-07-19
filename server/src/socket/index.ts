import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAgentToken } from "../middleware/auth.js";
import { prisma } from "../prisma.js";

export type IoServer = Server;

// Two kinds of clients connect here: agents (authenticated with their JWT,
// auto-joined to the shared "agents" room for inbox notifications) and
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
    if (socket.data.agent) {
      socket.join("agents");
    }

    socket.on("conversation:join", async ({ conversationId, visitorId }: { conversationId: string; visitorId?: string }) => {
      if (typeof conversationId !== "string") return;

      if (socket.data.agent) {
        socket.join(`conversation:${conversationId}`);
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
  });

  return io;
}
