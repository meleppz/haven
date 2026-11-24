import cors from "cors";
import express from "express";
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

  return app;
}
