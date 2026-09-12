import { Router } from "express";
import { supabase } from "../supabase.js";
import { botManager } from "../bot-manager.js";
import { getBotStatus } from "../whatsapp.js";

const router = Router();
const startTime = Date.now();
let processUptime = 0;
setInterval(() => { processUptime = Math.floor((Date.now() - startTime) / 1000); }, 1000);

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

// GET /api/monitoring/health — Enhanced health check
router.get("/api/monitoring/health", async (_req, res) => {
  const checks: Record<string, { status: string; error?: string }> = {};

  // Check Supabase
  try {
    const { error } = await supabase.from("bot_instances").select("id", { count: "exact", head: true });
    checks.supabase = { status: error ? "error" : "ok", error: error?.message };
  } catch (e: any) {
    checks.supabase = { status: "error", error: e.message };
  }

  // Check bot instances
  const allInstances = botManager.getAllInstances();
  const instanceStatuses: Record<string, string> = {};
  for (const id of allInstances) {
    const s = botManager.getStatus(id);
    instanceStatuses[id] = s.bot || "unknown";
  }

  // Legacy bot check
  const legacy = getBotStatus();
  const legacyConnected = legacy.bot === "connected";

  const totalConnected = legacyConnected
    ? 1 + Object.values(instanceStatuses).filter((s) => s === "connected").length
    : Object.values(instanceStatuses).filter((s) => s === "connected").length;

  const overall = checks.supabase.status === "ok" ? "healthy" : "degraded";

  res.json({
    status: overall,
    uptime: {
      seconds: processUptime,
      formatted: formatUptime(processUptime),
      startedAt: new Date(startTime).toISOString(),
    },
    memory: getMemoryUsage(),
    services: {
      supabase: checks.supabase,
      bot: {
        legacyConnected,
        instances: {
          total: allInstances.length,
          connected: totalConnected,
          details: instanceStatuses,
        },
      },
    },
  });
});

// GET /api/monitoring/metrics — Performance metrics
router.get("/api/monitoring/metrics", (_req, res) => {
  res.json({
    uptime: {
      seconds: processUptime,
      formatted: formatUptime(processUptime),
    },
    memory: getMemoryUsage(),
    cpu: {
      ...(process.cpuUsage ? { user: process.cpuUsage().user, system: process.cpuUsage().system } : {}),
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    env: process.env.NODE_ENV || "development",
  });
});

export default router;
