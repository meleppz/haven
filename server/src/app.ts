import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { AppError } from "./lib/errors.js";
import { api } from "./routes/index.js";
import { sweepExpired } from "./services/sweeper.js";
import { clock } from "./sim/clock.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // BR-22: every response carries the simulated server time.
  app.use((_req, res, next) => {
    res.setHeader("x-server-now", clock.now().toISOString());
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, serverNow: clock.now().toISOString() });
  });

  // BR-09 / BR-16: expired holds and overdue sessions are settled on every request.
  app.use("/api", async (_req, _res, next) => {
    try {
      await sweepExpired();
    } catch (e) {
      console.warn("[sweeper]", (e as Error).message);
    }
    next();
  });

  app.use("/api", api);

  app.use("/api", (_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Halaman tidak ditemukan.")));

  // Errors: { error: { code, message, fields? } }
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } });
      return;
    }
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      res.status(422).json({
        error: {
          code: tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
          message: tooLarge ? "Ukuran dokumen maksimal 10 MB ya." : "Dokumen belum bisa diunggah, coba lagi ya.",
          fields: { proof: tooLarge ? "Maksimal 10 MB" : "Unggah 1 dokumen" },
        },
      });
      return;
    }
    if ((err as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "BAD_JSON", message: "Data yang dikirim belum terbaca." } });
      return;
    }
    console.error("[error]", err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Ada yang tidak beres di sisi kami. Coba lagi sebentar ya." } });
  });

  return app;
}
