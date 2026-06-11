// FitPlan Pro - Registration Proxy Server
// Läuft auf Port 3001, used den service_role key zum Registrieren ohne Email
const http = require("http");
const https = require("https");
const url = require("url");

const SUPABASE_URL = "https://hrbnigtxfezgqbtrrzrt.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyYm5pZ3R4ZmV6Z3FidHJyenJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyNTM0NywiZXhwIjoyMDk2NzAxMzQ3fQ.AaMpdOOi_a5a0hCwjYN1vwZII2zgG-AkS3inlwbKm0c";

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new url.URL(SUPABASE_URL + path);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/register") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { email, password, name } = JSON.parse(body);

        if (!email || !password || !name) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "All fields required" }));
          return;
        }
        if (password.length < 6) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Password too short (min 6)" }));
          return;
        }

        // 1. Create user with email_confirm=true (no confirmation email!)
        console.log("Creating user:", email);
        const userResult = await apiRequest("POST", "/auth/v1/admin/users", {
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (userResult.status >= 400) {
          console.error("User creation failed:", userResult.data);
          res.writeHead(userResult.status);
          res.end(JSON.stringify({ error: userResult.data.msg || userResult.data.error || "User creation failed" }));
          return;
        }

        const userId = userResult.data.id;
        console.log("User created:", userId);

        // 2. Create profile with service key (bypasses RLS)
        const profileResult = await apiRequest("POST", "/rest/v1/profiles", {
          id: userId,
          email,
          name,
          age: 25,
          weight: 70,
          height: 175,
          gender: "männlich",
          goal: "erhalten",
          activity_level: "moderat",
        });

        if (profileResult.status >= 400) {
          console.error("Profile creation failed:", profileResult.data);
        }

        // 3. Sign them in to get tokens
        const signInResult = await apiRequest("POST", "/auth/v1/token?grant_type=password", {
          email,
          password,
        });

        if (signInResult.status >= 400) {
          console.error("Login failed:", signInResult.data);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          session: signInResult.data || null,
          user: userResult.data,
        }));
      } catch (err) {
        console.error("Server error:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log("Registration proxy running on port", PORT);
});
