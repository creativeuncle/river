import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });

const router = Router();

// Attachments in a support chat need to be readable by both the customer
// and the agent, so — unlike an E2E product — these are plain files on
// disk behind a random, unguessable filename.
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file" });
  }
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
  });
});

export default router;
export { UPLOAD_DIR };
