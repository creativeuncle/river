import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import agentsRouter from "./routes/agents.js";
import { conversationsRouter } from "./routes/conversations.js";
import { widgetRouter } from "./routes/widget.js";
import uploadsRouter, { UPLOAD_DIR } from "./routes/uploads.js";
import { createSocketServer } from "./socket/index.js";

const app = express();
const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "*" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/agents", agentsRouter);
app.use("/api/conversations", conversationsRouter(io));
app.use("/api/widget", widgetRouter(io));
app.use("/api/uploads", uploadsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 4000);
httpServer.listen(PORT, () => {
  console.log(`river server listening on :${PORT}`);
});
