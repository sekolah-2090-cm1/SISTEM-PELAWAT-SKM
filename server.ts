import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data directory for persistent server-side settings
const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "server-config.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface ServerConfig {
  googleSheetApiUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  updatedAt?: string;
}

function readServerConfig(): ServerConfig {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read server config:", err);
  }
  return {
    googleSheetApiUrl: process.env.VITE_GOOGLE_SHEET_API_URL || "",
    supabaseUrl: process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function writeServerConfig(config: ServerConfig): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Could not write server config:", err);
  }
}

// ==========================================
// 1. API: HEALTH CHECK
// ==========================================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// 2. API: CENTRAL CONFIGURATION (GOOGLE SHEET & SUPABASE)
// ==========================================
app.get("/api/config", (_req, res) => {
  const config = readServerConfig();
  res.json({
    googleSheetApiUrl: config.googleSheetApiUrl || process.env.VITE_GOOGLE_SHEET_API_URL || "",
    supabaseUrl: config.supabaseUrl || process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: config.supabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY || "",
    updatedAt: config.updatedAt,
  });
});

app.post("/api/config", (req, res) => {
  const { googleSheetApiUrl, supabaseUrl, supabaseAnonKey } = req.body;
  const current = readServerConfig();
  const updated: ServerConfig = {
    ...current,
    googleSheetApiUrl: typeof googleSheetApiUrl === "string" ? googleSheetApiUrl.trim() : current.googleSheetApiUrl,
    supabaseUrl: typeof supabaseUrl === "string" ? supabaseUrl.trim() : (current.supabaseUrl || ""),
    supabaseAnonKey: typeof supabaseAnonKey === "string" ? supabaseAnonKey.trim() : (current.supabaseAnonKey || ""),
    updatedAt: new Date().toISOString(),
  };
  writeServerConfig(updated);
  res.json({ success: true, config: updated });
});

// ==========================================
// 3. API: PROXY TO GOOGLE APPS SCRIPT (CORS-FREE & RESILIENT)
// ==========================================

let cachedSheetVisitors: any[] = [];
let lastSheetFetchTimestamp = 0;
let inFlightSheetFetch: Promise<any[]> | null = null;
const SHEET_CACHE_TTL_MS = 20000; // 20s cache window to avoid slamming Apps Script

async function queryGoogleAppsScript(apiUrl: string): Promise<any[]> {
  const fetchUrl = `${apiUrl}?t=${Date.now()}`;
  const controller = new AbortController();
  // 30 seconds timeout to accommodate Google Apps Script cold-starts
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const sheetResponse = await fetch(fetchUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!sheetResponse.ok) {
      throw new Error(`Google Sheets responded with HTTP status ${sheetResponse.status}`);
    }

    const data = await sheetResponse.json();
    if (Array.isArray(data)) {
      cachedSheetVisitors = data;
      lastSheetFetchTimestamp = Date.now();
      return data;
    }
    return cachedSheetVisitors;
  } finally {
    clearTimeout(timeout);
  }
}

// GET all visitors through server (bypasses all mobile browser CORS & 302 restrictions)
app.get("/api/sheet/visitors", async (_req, res) => {
  const config = readServerConfig();
  const apiUrl = config.googleSheetApiUrl || process.env.VITE_GOOGLE_SHEET_API_URL || "";

  if (!apiUrl) {
    return res.status(400).json({ error: "Google Apps Script URL belum disetkan dalam sistem." });
  }

  // 1. Serve fresh cache if within TTL
  const now = Date.now();
  if (cachedSheetVisitors.length > 0 && now - lastSheetFetchTimestamp < SHEET_CACHE_TTL_MS) {
    return res.json(cachedSheetVisitors);
  }

  // 2. Coalesce in-flight requests (prevent duplicate concurrent calls to Apps Script)
  if (!inFlightSheetFetch) {
    inFlightSheetFetch = queryGoogleAppsScript(apiUrl)
      .finally(() => {
        inFlightSheetFetch = null;
      });
  }

  try {
    const data = await inFlightSheetFetch;
    return res.json(data);
  } catch (err: any) {
    // 3. Resilient fallback: if fetch timed out or aborted, return cached data if available
    if (cachedSheetVisitors.length > 0) {
      console.info("Returning cached Google Sheet records due to temporary upstream delay:", err?.message || err);
      return res.json(cachedSheetVisitors);
    }

    const isAbort = err?.name === "AbortError" || String(err?.message).includes("aborted");
    if (!isAbort) {
      console.warn("Server proxy fetch to Google Sheet failed:", err?.message || err);
    }
    return res.status(502).json({
      error: "Gagal berhubung dengan Google Sheets.",
      details: isAbort ? "Google Apps Script mengambil masa terlalu lama untuk membalas." : err?.message
    });
  }
});

// POST new visitor through server to Google Apps Script
app.post("/api/sheet/visitors", async (req, res) => {
  const config = readServerConfig();
  const apiUrl = config.googleSheetApiUrl || process.env.VITE_GOOGLE_SHEET_API_URL || "";

  if (!apiUrl) {
    return res.status(400).json({ error: "Google Apps Script URL belum disetkan." });
  }

  const visitor = req.body;
  try {
    // Optimistically update server cache
    if (visitor && visitor.name) {
      const exists = cachedSheetVisitors.some((v) => String(v.id) === String(visitor.id));
      if (!exists) {
        cachedSheetVisitors.push(visitor);
      }
    }

    const params = new URLSearchParams();
    params.set("action", "ADD");
    params.set("id", String(visitor.id || ""));
    params.set("name", String(visitor.name || ""));
    params.set("icOrPassport", String(visitor.icOrPassport || ""));
    params.set("phone", String(visitor.phone || ""));
    params.set("vehiclePlate", String(visitor.vehiclePlate || "-"));
    params.set("purpose", String(visitor.purpose || ""));
    params.set("checkInTime", String(visitor.checkInTime || new Date().toISOString()));
    params.set("checkOutTime", String(visitor.checkOutTime || ""));
    params.set("status", String(visitor.status || "ACTIVE"));
    params.set("data", JSON.stringify(visitor));
    params.set("_ts", String(Date.now()));

    const queryString = params.toString();
    const targetUrl = apiUrl.includes("?") ? `${apiUrl}&${queryString}` : `${apiUrl}?${queryString}`;

    // Send multi-channel GET & POST from Node.js with safe timeouts
    fetch(targetUrl, { method: "GET", signal: AbortSignal.timeout(25000) }).catch(() => {});
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: queryString,
      signal: AbortSignal.timeout(25000),
    }).catch(() => {});

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Gagal menghantar ke Google Sheet", details: err?.message });
  }
});

// POST checkout through server
app.post("/api/sheet/checkout", async (req, res) => {
  const config = readServerConfig();
  const apiUrl = config.googleSheetApiUrl || process.env.VITE_GOOGLE_SHEET_API_URL || "";

  if (!apiUrl) {
    return res.status(400).json({ error: "Google Apps Script URL belum disetkan." });
  }

  const { id, checkOutTime } = req.body;
  try {
    // Optimistically update server cache
    if (id) {
      cachedSheetVisitors = cachedSheetVisitors.map((v) =>
        String(v.id) === String(id)
          ? { ...v, status: "CHECKED_OUT", checkOutTime: checkOutTime || new Date().toISOString() }
          : v
      );
    }

    const params = new URLSearchParams();
    params.set("action", "CHECK_OUT");
    params.set("id", String(id || ""));
    params.set("checkOutTime", String(checkOutTime || new Date().toISOString()));
    params.set("_ts", String(Date.now()));

    const queryString = params.toString();
    const targetUrl = apiUrl.includes("?") ? `${apiUrl}&${queryString}` : `${apiUrl}?${queryString}`;

    fetch(targetUrl, { method: "GET", signal: AbortSignal.timeout(25000) }).catch(() => {});
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: queryString,
      signal: AbortSignal.timeout(25000),
    }).catch(() => {});

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Gagal checkout ke Google Sheet", details: err?.message });
  }
});

// ==========================================
// 4. VITE MIDDLEWARE (DEV) & STATIC (PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server SK Morib sedang berjalan di http://localhost:${PORT}`);
  });
}

startServer();
