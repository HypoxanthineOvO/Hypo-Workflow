import express from "express";

export function createServer() {
  const app = express();
  app.get("/health", (_request, response) => response.json({ ok: true }));
  return app;
}
