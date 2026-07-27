"use client";

import { useEffect, useRef } from "react";

/** A cinematic, cursor-reactive fragment shader: domain-warped fractal flow
 *  with a moody palette, drifting light, grain and vignette. Raw WebGL, no
 *  libraries. Falls back to a static frame under reduced-motion, and to a CSS
 *  gradient if WebGL is unavailable. */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // 0..1, eased
uniform float uEnergy;  // 0..1, rises while a run is active

// --- value noise + fbm ---
float hash(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<6;i++){ v += a*noise(p); p = p*2.02 + vec2(37.1,17.3); a *= 0.5; }
  return v;
}

// IQ cosine palette, tuned deep indigo -> teal -> warm rim
vec3 palette(float t){
  vec3 a = vec3(0.10, 0.11, 0.18);
  vec3 b = vec3(0.32, 0.28, 0.45);
  vec3 c = vec3(1.00, 1.00, 1.00);
  vec3 d = vec3(0.10, 0.42, 0.72);
  return a + b*cos(6.28318*(c*t + d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*uRes.xy) / uRes.y;

  float t = uTime * 0.045;
  vec2 m = (uMouse - 0.5);

  // domain warp: fold the field through itself, nudged by the cursor
  vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(4.2,1.3) - t));
  vec2 r = vec2(fbm(p*1.6 + 1.7*q + m*0.6 + t*0.6),
                fbm(p*1.6 + 1.7*q + vec2(8.3,2.8) - m*0.6));
  float f = fbm(p*1.6 + 2.4*r);

  vec3 col = palette(f*0.9 + length(r)*0.35 + t*0.4);
  // deepen to a cinematic near-black base, keep it a backdrop
  col = mix(vec3(0.015, 0.02, 0.035), col, smoothstep(0.1, 0.95, f));
  col *= 0.42 + 0.5*uEnergy;

  // warm rim light following flow crests
  float rim = smoothstep(0.62, 0.98, f);
  col += rim * vec3(0.9, 0.55, 0.28) * (0.10 + 0.18*uEnergy);

  // soft light bloom trailing the cursor
  float d = length(p - m*vec2(uRes.x/uRes.y, 1.0));
  col += (0.05 + 0.12*uEnergy) * exp(-d*2.2) * vec3(0.35, 0.6, 1.0);

  // vignette
  col *= smoothstep(1.25, 0.35, length((uv-0.5)*vec2(1.15,1.0)));

  // grain
  float g = hash(gl_FragCoord.xy + uTime);
  col += (g - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function ShaderBackground({ energy = 0 }: { energy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(energy);
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return; // CSS fallback handles it

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uEnergy = gl.getUniformLocation(prog, "uEnergy");

    let w = 0;
    let h = 0;
    const resize = () => {
      w = Math.floor(canvas.clientWidth * dpr);
      h = Math.floor(canvas.clientHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    // eased cursor
    const mouse = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    let energyCur = 0;
    const start = performance.now();
    const frame = (now: number) => {
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      energyCur += (energyRef.current - energyCur) * 0.04;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, reduce ? 8.0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uEnergy, energyCur);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ background: "radial-gradient(120% 120% at 70% 0%, #0a0f1e, #04050a 70%)" }}
    />
  );
}
