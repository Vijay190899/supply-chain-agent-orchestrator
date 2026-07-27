"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchConditions, type LiveConditions } from "@/lib/live";

const SEV: Record<string, string> = {
  calm: "var(--color-faint)",
  low: "var(--color-ok)",
  moderate: "var(--color-warm)",
  severe: "var(--color-rose)",
};

/** A read-only strip of REAL current weather at the lane ports (Open-Meteo).
 *  Additive: it makes the static site genuinely current without running the
 *  graph. Loud about its state (live timestamp, or "unavailable"). */
export function LiveConditions() {
  const [data, setData] = useState<LiveConditions | null>(null);

  useEffect(() => {
    let alive = true;
    fetchConditions().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="glass px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="kicker">live port conditions</span>
        <span className="mono text-[10px] text-[var(--color-faint)]">
          {!data
            ? "fetching…"
            : data.ok
              ? `open-meteo · ${new Date(data.fetchedAt).toUTCString().slice(17, 22)} UTC`
              : "unavailable"}
        </span>
      </div>
      {data && !data.ok ? (
        <p className="mono text-[11px] text-[var(--color-faint)]">
          live feed unavailable; the scenarios above still run.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
          {(data?.ports ?? [{}, {}, {}, {}]).map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between"
            >
              <span className="mono text-[11px] text-[var(--color-muted)]">
                {"port" in c ? c.port : "··"}
              </span>
              <span className="mono flex items-center gap-1.5 text-[11px] text-[var(--color-ink)]">
                {"gusts_kmh" in c ? `${c.gusts_kmh}km/h` : "··"}
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "severity" in c ? SEV[c.severity] : "var(--color-faint)" }}
                />
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
