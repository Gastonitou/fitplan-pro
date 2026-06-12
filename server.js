// FitPlan Pro - Combined Server
// Serves static Expo build + Registration API (no email verification needed)
const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const path = require("path");

const PORT = 8082;
const DIST = path.join(__dirname, "dist");
const SUPABASE_URL = "https://hrbnigtxfezgqbtrrzrt.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYm5pZ3R4ZmV6Z3FidHJyenJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyNTM0NywiZXhwIjoyMDk2NzAxMzQ3fQ.AaMpdOOi_a5a0hCwjYN1vwZII2zgG-AkS3inlwbKm0c";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // SPA fallback: serve index.html for unknown routes
        fs.readFile(path.join(DIST, "index.html"), (e2, indexData) => {
          if (e2) { res.writeHead(500); res.end("Server error"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(500);
      res.end("Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

function apiRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const u = new url.URL(SUPABASE_URL + apiPath);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ---- Health Check ----
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "1.0.0" }));
    return;
  }

  // ---- API: Login ----
  if (req.method === "POST" && req.url === "/api/login") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { email, password } = JSON.parse(body);
        if (!email || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Email und Passwort erforderlich" }));
          return;
        }
        console.log("Login:", email);
        const result = await apiRequest("POST", "/auth/v1/token?grant_type=password", {
          email: email.trim().toLowerCase(),
          password,
        });
        if (result.status >= 400) {
          res.writeHead(result.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: result.data?.error_description || result.data?.error || result.data?.msg || "Login fehlgeschlagen",
          }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, session: result.data }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
      }
    });
    return;
  }

  // ---- API: Registration ohne Email-Verifikation ----
  if (req.method === "POST" && req.url === "/api/register") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { email, password, name } = JSON.parse(body);
        if (!email || !password || !name) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "All fields required" }));
          return;
        }
        if (password.length < 6) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Password too short (min 6)" }));
          return;
        }

        console.log("Creating user:", email);
        const userResult = await apiRequest("POST", "/auth/v1/admin/users", {
          email,
          password,
          email_confirm: true, // <-- keine Bestätigungsmail nötig!
          user_metadata: { name },
        });

        if (userResult.status >= 400) {
          console.error("User creation failed:", userResult.data);
          res.writeHead(userResult.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: userResult.data?.msg || userResult.data?.error || "Registrierung fehlgeschlagen",
          }));
          return;
        }

        const userId = userResult.data.id;
        console.log("User created:", userId);

        // Auto-login
        const signInResult = await apiRequest("POST", "/auth/v1/token?grant_type=password", {
          email, password,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          session: signInResult.data || null,
          user: userResult.data,
        }));
      } catch (err) {
        console.error("Server error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ---- Static files ----
  if (req.method === "GET") {
    let filePath = path.join(DIST, req.url === "/" ? "index.html" : req.url);
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    serveFile(res, filePath);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`FitPlan Pro läuft auf http://localhost:${PORT}`);
  console.log(`API: POST http://localhost:${PORT}/api/register`);
});
