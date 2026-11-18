import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { existsSync } from "fs";
import router from "./app/routes/routes";
import errorHandler from "./app/midddlewares/errorHandler";
import { apiLimiter } from "./app/midddlewares/rateLimit";
import { UPLOAD_DIR } from "./app/upload/upload.controller";

dotenv.config();

const app: Application = express();

// Allowed origins: the dev frontend plus the configured production URL.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send({ message: "Welcome to Campus RecovR services!" });
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/api", apiLimiter, router);

// Production: serve the built frontend (frontend/dist) with an SPA fallback,
// so the API and the site share one origin. Dev (no dist) keeps the JSON root.
const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^\/(?!api|uploads).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

app.use(errorHandler);

app.use((req: Request, res: Response) => {
  res.status(404).send({
    statusCode: 404,
    success: false,
    message: "Sorry, We can't find that!",
  });
});

export default app;
