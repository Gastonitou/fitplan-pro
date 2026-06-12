// API Base URL - uses env variable or falls back to same origin
// Set EXPO_PUBLIC_API_URL for production deployments (e.g., Vercel env vars)
// If empty, uses window.location.origin (static + API on same server)

export function getApiBase(): string {
  // Same-origin: API läuft auf demselben Server (Vercel Serverless)
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
