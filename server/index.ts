import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { analyzeMission } from "./services/analyzer";
import { buildBriefMarkdown, buildContinuePrompt } from "./services/exports";
import { store } from "./services/store";
import { runMission } from "./services/missionRunner";
import { missionModes } from "../shared/types";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../client");

app.use(express.json({ limit: "2mb" }));

const analyzeSchema = z.object({
  repoUrl: z.string().url(),
  mode: z.enum(missionModes),
  promptText: z.string().min(3),
  apiKey: z.string().optional()
});

const startMissionSchema = z.object({
  brief: z.any(),
  apiKey: z.string().optional()
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cascade", time: new Date().toISOString() });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const payload = analyzeSchema.parse(req.body);
    const brief = await analyzeMission(payload);
    res.json({ brief });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/missions", async (req, res) => {
  try {
    const payload = startMissionSchema.parse(req.body);

    if (store.hasActiveMission()) {
      res.status(409).json({
        error: "A mission is already active. Finish or refresh once the current run completes."
      });
      return;
    }

    const mission = store.createMission(payload.brief);
    void runMission(mission.id, payload.apiKey);
    res.status(202).json({ mission });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/missions/:id", (req, res) => {
  const missionId = String(req.params.id);
  const mission = store.getMission(missionId);

  if (!mission) {
    res.status(404).json({ error: "Mission not found." });
    return;
  }

  res.json({ mission });
});

app.get("/api/missions/:id/events", (req: Request, res: Response) => {
  const missionId = String(req.params.id);
  const mission = store.getMission(missionId);

  if (!mission) {
    res.status(404).json({ error: "Mission not found." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = () => {
    const current = store.getMission(missionId);
    if (current) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
    }
  };

  send();
  const unsubscribe = store.subscribe(missionId, send);
  req.on("close", () => unsubscribe());
});

app.get("/api/missions/:id/brief.md", (req, res) => {
  const missionId = String(req.params.id);
  const mission = store.getMission(missionId);

  if (!mission) {
    res.status(404).json({ error: "Mission not found." });
    return;
  }

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${mission.id}-brief.md"`);
  res.send(buildBriefMarkdown(mission));
});

app.get("/api/missions/:id/continue.txt", (req, res) => {
  const missionId = String(req.params.id);
  const mission = store.getMission(missionId);

  if (!mission) {
    res.status(404).json({ error: "Mission not found." });
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${mission.id}-continue.txt"`);
  res.send(buildContinuePrompt(mission));
});

app.use(express.static(clientDist));
app.use((_req, res) => res.sendFile(path.join(clientDist, "index.html")));

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`Cascade API listening on port ${port}`);
});

function handleError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Invalid request.", details: error.flatten() });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown server error.";
  const status = message.includes("GitHub") || message.includes("repository") ? 400 : 500;
  res.status(status).json({ error: message });
}
