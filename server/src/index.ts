import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import keysRouter from "./routes/keys.js";
import { messagesRouter } from "./routes/messages.js";
import filesRouter from "./routes/files.js";
import { createSocketServer } from "./socket/index.js";

const app = express();
const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "*" }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/keys", keysRouter);
app.use("/api/messages", messagesRouter(io));
app.use("/api/files", filesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 4000);
httpServer.listen(PORT, () => {
  console.log(`river server listening on :${PORT}`);
});
