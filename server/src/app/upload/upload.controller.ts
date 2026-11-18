import { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
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
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
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
