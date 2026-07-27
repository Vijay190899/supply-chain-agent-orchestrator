// Real current weather at the lane ports, fetched in the browser from
// Open-Meteo (free, keyless, permissive CORS). Mirrors the Python thresholds in
// live.py. Read-only: it annotates the page with the actual current world, it
// does not run the graph. Fails loudly (returns an error marker) rather than
// silently showing stale data as live.

export type PortCondition = {
  port: string;
  gusts_kmh: number;
  severity: "calm" | "low" | "moderate" | "severe";
  as_of: string;
};

export type LiveConditions = {
  ports: PortCondition[];
  fetchedAt: string;
  ok: boolean;
};

const PORTS = [
  { name: "Hamburg", lat: 53.55, lon: 9.99 },
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "Rotterdam", lat: 51.95, lon: 4.14 },
  { name: "Singapore", lat: 1.26, lon: 103.82 },
];

const CACHE_KEY = "live-conditions-v1";
const TTL_MS = 15 * 60 * 1000;

function severity(gusts: number, precip: number): PortCondition["severity"] {
  if (gusts >= 75 || precip >= 10) return "severe";
  if (gusts >= 50 || precip >= 4) return "moderate";
  if (gusts >= 38) return "low";
  return "calm";
}

export async function fetchConditions(): Promise<LiveConditions> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as LiveConditions;
      if (Date.now() - Date.parse(parsed.fetchedAt) < TTL_MS) return parsed;
    }
  } catch {
    // ignore cache errors
  }

  const lat = PORTS.map((p) => p.lat).join(",");
  const lon = PORTS.map((p) => p.lon).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=wind_gusts_10m,precipitation&wind_speed_unit=kmh&timezone=UTC`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    const ports: PortCondition[] = PORTS.map((p, i) => {
      const cur = items[i]?.current ?? {};
      const gusts = cur.wind_gusts_10m ?? 0;
      return {
        port: p.name,
        gusts_kmh: Math.round(gusts),
        severity: severity(gusts, cur.precipitation ?? 0),
        as_of: cur.time ?? "",
      };
    });
    const out: LiveConditions = { ports, fetchedAt: new Date().toISOString(), ok: true };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch {
      // ignore
    }
    return out;
  } catch {
    return { ports: [], fetchedAt: new Date().toISOString(), ok: false };
  }
}
