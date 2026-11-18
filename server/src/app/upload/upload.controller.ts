import { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { existsSync, mkdirSync } from "fs";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";

// Images uploaded through POST /api/upload land here and are served at /uploads.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  // Chat media — videos, voice notes
  "video/mp4",
  "video/webm",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only PNG, JPEG, WebP, GIF, MP4/WebM video or audio files are allowed"));
    }
  },
});

const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, "No image file provided");
    }

    // Preferred: Supabase Storage (survives redeploys). The multipart file
    // lands on local disk first (multer), then is pushed to the bucket.
    let url = "";
    const bucket = process.env.SUPABASE_BUCKET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (bucket && supabaseUrl && publishableKey) {
      try {
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const objectPath = `${Date.now()}-${req.file.filename}`;
        const up = await fetch(
          `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
          {
            method: "POST",
            headers: {
              apikey: publishableKey,
              Authorization: `Bearer ${publishableKey}`,
              "Content-Type": req.file.mimetype,
              "x-upsert": "true",
            },
            body: new Uint8Array(fileBuffer),
            signal: AbortSignal.timeout(20000),
          }
        );
        if (up.ok) {
          // Public bucket read needs no auth.
          url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
          // Local copy no longer needed once in the cloud.
          fs.promises.unlink(req.file.path).catch(() => {});
        } else {
          const errText = await up.text();
          console.warn(
            `[upload] Supabase Storage ${up.status}: ${errText.slice(0, 160)} — falling back to local disk`
          );
        }
      } catch (err: any) {
        console.warn(
          `[upload] Supabase Storage unreachable (${err?.message || err}) — falling back to local disk`
        );
      }
    }

    // Fallback: local disk (also the dev default when the bucket isn't set).
    if (!url) {
      url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    res.status(StatusCodes.CREATED).send({
      success: true,
      statusCode: StatusCodes.CREATED,
      message: "Image uploaded successfully",
      data: { url },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadController = { uploadImage };
