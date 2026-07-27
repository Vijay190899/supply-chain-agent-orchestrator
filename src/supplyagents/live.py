"""Live data feed: real weather (Open-Meteo) and natural events (NASA EONET).

`LiveFeed` implements the same `Feed` protocol as `LocalFeed`, wrapping one as
its fallback. Only the "live" scenario touches the network; the three canned
scenarios delegate to fixtures, so the showcase stays deterministic and the
test suite never makes a network call (the mappers are pure and unit-tested
against captured JSON in tests/fixtures/).

Both APIs are free and keyless. Every network method degrades loudly to the
fallback scenario on error, so a run always tells its full story end to end.
"""

import logging
import math
import time
from typing import Any

import httpx

from supplyagents import providers
from supplyagents.feeds import Feed, LocalFeed
from supplyagents.state import Disruption, Route, RouteOption

log = logging.getLogger("supplyagents.live")

LIVE = "live"
_OM_URL = "https://api.open-meteo.com/v1/forecast"
_EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

# Ports on the active lanes, in the order the batched Open-Meteo call returns.
PORTS: list[tuple[str, float, float, str]] = [
    ("Hamburg", 53.55, 9.99, "R-201"),
    ("Oslo", 59.91, 10.75, "R-201"),
    ("Rotterdam", 51.95, 4.14, "R-330"),
    ("Singapore", 1.26, 103.82, "R-330"),
]

# Lane waypoints (ports + chokepoints) for EONET proximity, per route.
ROUTE_WAYPOINTS: dict[str, list[tuple[float, float]]] = {
    "R-201": [(53.55, 9.99), (57.7, 8.0), (59.91, 10.75)],
    "R-330": [(51.95, 4.14), (30.5, 32.3), (12.6, 43.4), (1.43, 102.9), (1.26, 103.82)],
}

# Reuse the deterministic option templates; live disruptions still get real,
# priced reroutes the optimizer can reason over.
LIVE_OPTION_TEMPLATES: dict[str, list[RouteOption]] = {
    "R-201": providers._SCENARIO_OPTIONS["storm-north-sea"],
    "R-330": providers._SCENARIO_OPTIONS["suez-blockage"],
}

_RANK = {"low": 1, "moderate": 2, "severe": 3}

_EONET_KIND: dict[str, tuple[str, str]] = {
    "severeStorms": ("weather", "moderate"),
    "floods": ("weather", "moderate"),
    "seaLakeIce": ("blockage", "severe"),
    "volcanoes": ("blockage", "severe"),
}


# --- pure geometry + severity -------------------------------------------------


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in km between (lat, lon) points."""
    r = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = (
        math.sin((la2 - la1) / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    )
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def weather_severity(gusts_kmh: float, precip_mm: float) -> str | None:
    """Map wind gusts / precipitation to a disruption severity (or None)."""
    if gusts_kmh >= 75 or precip_mm >= 10:
        return "severe"
    if gusts_kmh >= 50 or precip_mm >= 4:
        return "moderate"
    if gusts_kmh >= 38:
        return "low"
    return None


def _nearest_route(lat: float, lon: float) -> tuple[str, float]:
    """Route id of the nearest lane waypoint, and the distance in km."""
    best_route, best_km = "", math.inf
    for route_id, pts in ROUTE_WAYPOINTS.items():
        for p in pts:
            d = haversine_km((lat, lon), p)
            if d < best_km:
                best_route, best_km = route_id, d
    return best_route, best_km


# --- pure mappers (unit-tested against fixtures) ------------------------------


def map_open_meteo(payload: Any) -> list[Disruption]:
    """Weather disruptions (moderate+) per affected route, from an Open-Meteo batch."""
    items = payload if isinstance(payload, list) else [payload]
    by_route: dict[str, Disruption] = {}
    for (name, _, _, route_id), item in zip(PORTS, items, strict=False):
        cur = item.get("current", {})
        sev = weather_severity(cur.get("wind_gusts_10m", 0) or 0, cur.get("precipitation", 0) or 0)
        if sev is None or _RANK[sev] < _RANK["moderate"]:
            continue
        d: Disruption = {
            "route_id": route_id,
            "kind": "weather",
            "severity": sev,  # type: ignore[typeddict-item]
            "description": (
                f"Gusts {cur.get('wind_gusts_10m', 0):.0f} km/h at {name} "
                f"({cur.get('time', '')}Z), port operations degraded."
            ),
        }
        if route_id not in by_route or _RANK[sev] > _RANK[by_route[route_id]["severity"]]:
            by_route[route_id] = d
    return list(by_route.values())


def map_eonet(payload: dict) -> list[Disruption]:
    """Event disruptions (moderate+) near the lanes, from an EONET events payload."""
    by_route: dict[str, Disruption] = {}
    for ev in payload.get("events", []):
        cats = ev.get("categories") or []
        cat = cats[0].get("id") if cats else None
        if cat not in _EONET_KIND:
            continue
        geoms = [g for g in ev.get("geometry", []) if g.get("coordinates")]
        if not geoms:
            continue
        lon, lat = geoms[-1]["coordinates"][0], geoms[-1]["coordinates"][1]
        route_id, dist = _nearest_route(lat, lon)
        if dist > 600:
            continue
        kind, base = _EONET_KIND[cat]
        sev = base
        if cat == "severeStorms" and (geoms[-1].get("magnitudeValue") or 0) >= 64:
            sev = "severe"
        if dist > 300:
            sev = "low"  # reported by conditions, not emitted into a run
        if _RANK[sev] < _RANK["moderate"]:
            continue
        d: Disruption = {
            "route_id": route_id,
            "kind": kind,  # type: ignore[typeddict-item]
            "severity": sev,  # type: ignore[typeddict-item]
            "description": (
                f"{ev.get('title', 'event')} ({cat}) ~{dist:.0f} km from "
                f"lane {route_id}, EONET {ev.get('id')}."
            ),
        }
        if route_id not in by_route or _RANK[sev] > _RANK[by_route[route_id]["severity"]]:
            by_route[route_id] = d
    return list(by_route.values())


def merge_disruptions(*groups: list[Disruption]) -> list[Disruption]:
    """Union disruptions across sources, keeping the highest severity per route."""
    by_route: dict[str, Disruption] = {}
    for group in groups:
        for d in group:
            r = d["route_id"]
            if r not in by_route or _RANK[d["severity"]] > _RANK[by_route[r]["severity"]]:
                by_route[r] = d
    return list(by_route.values())


def conditions_from(payload: Any) -> list[dict]:
    """Read-only per-port current weather (includes calm/low), for a status panel."""
    items = payload if isinstance(payload, list) else [payload]
    out = []
    for (name, _, _, route_id), item in zip(PORTS, items, strict=False):
        cur = item.get("current", {})
        g, p = cur.get("wind_gusts_10m", 0) or 0, cur.get("precipitation", 0) or 0
        out.append(
            {
                "port": name,
                "route_id": route_id,
                "gusts_kmh": g,
                "precip_mm": p,
                "severity": weather_severity(g, p) or "calm",
                "as_of": cur.get("time", ""),
            }
        )
    return out


# --- the feed -----------------------------------------------------------------


class LiveFeed:
    """Feed backed by real weather + events, with a deterministic fallback."""

    def __init__(self, fallback: Feed | None = None, http: httpx.Client | None = None):
        self._fallback = fallback or LocalFeed()
        self._http = http or httpx.Client(timeout=httpx.Timeout(4.0, connect=2.0))
        self._cache: dict[str, tuple[float, Any]] = {}
        self._last_affected: list[str] = []
        self.fallback_scenario = "storm-north-sea"

    def active_routes(self) -> list[Route]:
        return self._fallback.active_routes()

    def poll_disruptions(self, scenario: str) -> list[Disruption]:
        if scenario != LIVE:
            return self._fallback.poll_disruptions(scenario)
        try:
            disruptions = merge_disruptions(
                map_open_meteo(self._get(_OM_URL, self._om_params(), "om", 900)),
                map_eonet(self._get(_EONET_URL, self._eonet_params(), "eonet", 600)),
            )
        except Exception as exc:  # loud, documented fallback
            log.warning("live feed unavailable (%s); using %s", exc, self.fallback_scenario)
            disruptions = self._fallback.poll_disruptions(self.fallback_scenario)
        self._last_affected = [d["route_id"] for d in disruptions]
        return disruptions

    def route_options(self, scenario: str) -> list[RouteOption]:
        if scenario != LIVE:
            return self._fallback.route_options(scenario)
        opts: list[RouteOption] = []
        for route_id in self._last_affected or ["R-201", "R-330"]:
            opts.extend(LIVE_OPTION_TEMPLATES.get(route_id, []))
        return opts

    # network helpers
    def _get(self, url: str, params: dict, key: str, ttl: int) -> Any:
        now = time.monotonic()
        hit = self._cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
        try:
            resp = self._http.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            self._cache[key] = (now + ttl, data)
            return data
        except httpx.HTTPError:
            if hit:  # serve stale on error, soft backoff
                self._cache[key] = (now + 60, hit[1])
                return hit[1]
            raise

    def _om_params(self) -> dict:
        return {
            "latitude": ",".join(str(p[1]) for p in PORTS),
            "longitude": ",".join(str(p[2]) for p in PORTS),
            "current": "wind_gusts_10m,precipitation,weather_code",
            "wind_speed_unit": "kmh",
            "timezone": "UTC",
        }

    def _eonet_params(self) -> dict:
        return {
            "status": "open",
            "days": 20,
            "category": "severeStorms,seaLakeIce,volcanoes,floods",
        }

    def conditions(self) -> list[dict]:
        """Current per-port weather; falls back to an empty list on error."""
        try:
            return conditions_from(self._get(_OM_URL, self._om_params(), "om", 900))
        except httpx.HTTPError:
            return []
