import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyToken } from "../middleware/auth.js";

export type IoServer = Server;

export function createSocketServer(httpServer: HttpServer): IoServer {
  const io = new Server(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN ?? "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    // Personal room: every device this user has connected receives relayed messages.
    socket.join(`user:${userId}`);

    socket.on("typing", ({ toUserId }: { toUserId: string }) => {
      if (typeof toUserId !== "string") return;
      socket.to(`user:${toUserId}`).emit("typing", { fromUserId: userId });
    });
  });

  return io;
}
