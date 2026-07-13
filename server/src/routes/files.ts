import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { isConversationParticipant } from "../lib/conversation.js";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 250MB cap per encrypted blob (covers video/psd/ai style attachments).
// The content is opaque ciphertext to us regardless of the original file type
// (image, video, zip, pdf, psd, ai, eps, svg, ...) — we never inspect or
// convert it, so no type allowlist is needed server-side.
const MAX_FILE_BYTES = 250 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, randomUUID()),
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

const router = Router();
router.use(requireAuth);

const uploadMetaSchema = z.object({
  conversationId: z.string().min(1),
});

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file" });
  }
  const parsed = uploadMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { conversationId } = parsed.data;
  const userId = req.auth!.userId;

  if (!isConversationParticipant(conversationId, userId)) {
    fs.unlink(req.file.path, () => {});
    return res.status(403).json({ error: "Not a participant of this conversation" });
  }

  const blob = await prisma.fileBlob.create({
    data: {
      conversationId,
      ownerId: userId,
      storagePath: req.file.filename,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({ id: blob.id, sizeBytes: blob.sizeBytes });
});

router.get("/:id", async (req, res) => {
  const blob = await prisma.fileBlob.findUnique({ where: { id: req.params.id } });
  if (!blob) {
    return res.status(404).json({ error: "Not found" });
  }
  if (!isConversationParticipant(blob.conversationId, req.auth!.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.sendFile(path.join(UPLOAD_DIR, blob.storagePath));
});

export default router;
