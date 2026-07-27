"""Live-feed mappers: pure, deterministic, tested against captured API JSON.

No network. The fixtures in tests/fixtures/ are real-shaped Open-Meteo and
EONET payloads with values chosen to exercise every severity path.
"""

import json
import pathlib

from supplyagents.live import (
    conditions_from,
    map_eonet,
    map_open_meteo,
    merge_disruptions,
    weather_severity,
)

FIX = pathlib.Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIX / name).read_text())


def test_weather_severity_thresholds():
    assert weather_severity(80, 0) == "severe"
    assert weather_severity(0, 12) == "severe"
    assert weather_severity(55, 0) == "moderate"
    assert weather_severity(0, 5) == "moderate"
    assert weather_severity(40, 0) == "low"
    assert weather_severity(20, 0) is None


def test_open_meteo_maps_to_affected_routes():
    ds = {d["route_id"]: d for d in map_open_meteo(_load("open_meteo.json"))}
    # Hamburg gusts 82 -> R-201 severe; Rotterdam 54 -> R-330 moderate.
    assert ds["R-201"]["severity"] == "severe"
    assert ds["R-201"]["kind"] == "weather"
    assert ds["R-330"]["severity"] == "moderate"
    # Oslo (18) and Singapore (40, only 'low') do not emit.
    assert "Hamburg" in ds["R-201"]["description"]


def test_eonet_maps_nearby_events_and_discards_far_ones():
    ds = {d["route_id"]: d for d in map_eonet(_load("eonet.json"))}
    # Storm ~52 km from Suez (mag 70 kts) -> R-330 severe.
    assert ds["R-330"]["severity"] == "severe"
    # Iceberg near the Skagerrak -> R-201 severe blockage.
    assert ds["R-201"]["kind"] == "blockage"
    # The Pacific hurricane (EONET_9002) is >600 km from any lane -> discarded.
    assert all("Genevieve" not in d["description"] for d in ds.values())


def test_merge_keeps_highest_severity_per_route():
    weather = map_open_meteo(_load("open_meteo.json"))  # R-330 moderate
    events = map_eonet(_load("eonet.json"))  # R-330 severe
    merged = {d["route_id"]: d for d in merge_disruptions(weather, events)}
    assert merged["R-330"]["severity"] == "severe"  # event beats weather
    assert merged["R-201"]["severity"] == "severe"


def test_conditions_include_calm_and_low():
    conds = {c["port"]: c for c in conditions_from(_load("open_meteo.json"))}
    assert conds["Oslo"]["severity"] == "calm"
    assert conds["Singapore"]["severity"] == "low"
    assert conds["Hamburg"]["severity"] == "severe"
    assert conds["Hamburg"]["as_of"].endswith("10:15")
