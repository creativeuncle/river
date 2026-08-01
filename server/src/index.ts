import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import agentsRouter from "./routes/agents.js";
import { conversationsRouter } from "./routes/conversations.js";
import { widgetRouter } from "./routes/widget.js";
import uploadsRouter, { UPLOAD_DIR } from "./routes/uploads.js";
import settingsRouter from "./routes/settings.js";
import groupsRouter from "./routes/groups.js";
import cannedRepliesRouter from "./routes/cannedReplies.js";
import reportsRouter from "./routes/reports.js";
import webhooksRouter from "./routes/webhooks.js";
import billingRouter from "./routes/billing.js";
import { createSocketServer } from "./socket/index.js";
import { ensureOwnerExists } from "./lib/ensureOwner.js";

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
app.use("/api/settings", settingsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/canned-replies", cannedRepliesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/billing", billingRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 4000);
ensureOwnerExists()
  .catch((err) => console.error("Failed to check/assign an Owner:", err))
  .finally(() => {
    httpServer.listen(PORT, () => {
      console.log(`river server listening on :${PORT}`);
    });
  });
