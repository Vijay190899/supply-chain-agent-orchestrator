"use client";

import { useEffect, useRef } from "react";

/** A low-contrast vessel-traffic PPI substrate: range rings, a fine bearing
 *  grid, and a slow sweep with a faint wake. Diegetic, never a spectacle.
 *  Frozen (no sweep) under prefers-reduced-motion. */
export function RadarBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Sweep origin sits off the top-right, like a coastal station.
    const cx = () => w * 0.82;
    const cy = () => h * 0.12;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const ox = cx();
      const oy = cy();
      const maxR = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy));

      // range rings
      ctx.strokeStyle = "rgba(120, 160, 210, 0.05)";
      ctx.lineWidth = 1;
      for (let r = 120; r < maxR; r += 120) {
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // bearing spokes
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(ang) * maxR, oy + Math.sin(ang) * maxR);
        ctx.strokeStyle = "rgba(120, 160, 210, 0.028)";
        ctx.stroke();
      }

      if (!reduce) {
        // sweep + fading wake
        const sweep = (t / 9000) * Math.PI * 2;
        for (let i = 0; i < 22; i++) {
          const a = sweep - i * 0.03;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(a) * maxR, oy + Math.sin(a) * maxR);
          ctx.strokeStyle = `rgba(56, 214, 208, ${0.05 * (1 - i / 22)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    if (reduce) {
      draw(0);
    } else {
      const loop = (t: number) => {
        draw(t);
      };
      raf = requestAnimationFrame(loop);
    }

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
