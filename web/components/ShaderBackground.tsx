"use client";

import { useEffect, useRef } from "react";

/** Cinematic, cursor-reactive fragment shader: a fast domain-warped flow field
 *  with a vivid moody palette, drifting light and grain. Raw WebGL, no libs.
 *  Always animates (the immersive background is the point); falls back to a CSS
 *  gradient only if WebGL is unavailable. */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // 0..1, eased
uniform float uEnergy;  // 0..1, rises during a run

float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.03+vec2(37.1,17.3); a*=0.5;} return v; }

vec3 palette(float t){
  vec3 a=vec3(0.14,0.13,0.22), b=vec3(0.42,0.36,0.55),
       c=vec3(1.0,1.0,1.0),   d=vec3(0.10,0.42,0.72);
  return a + b*cos(6.28318*(c*t+d));
}

void main(){
  vec2 uv = gl_FragCoord.xy/uRes.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*uRes.xy)/uRes.y;
  float t = uTime*0.16;
  vec2 m = (uMouse-0.5);

  // advect the field so the whole cloud drifts, and fold it through itself
  p += vec2(t*0.10, -t*0.06);
  vec2 q = vec2(fbm(p*1.5 + t*0.6), fbm(p*1.5 + vec2(5.2,1.3) - t*0.5));
  vec2 r = vec2(fbm(p*1.5 + 1.9*q + m*1.2 + t*0.8),
                fbm(p*1.5 + 1.9*q + vec2(8.3,2.8) - m*1.2 - t*0.4));
  float f = fbm(p*1.5 + 2.6*r);

  vec3 col = palette(f*0.9 + length(r)*0.5 + t*0.5);
  col = mix(vec3(0.02,0.03,0.06), col, smoothstep(0.02,0.9,f));
  col *= 0.62 + 0.45*uEnergy;

  float rim = smoothstep(0.58,0.98,f);
  col += rim * vec3(0.95,0.55,0.28) * (0.18 + 0.22*uEnergy);

  // bright light bloom following the cursor
  float d = length(p - m*vec2(uRes.x/uRes.y,1.0));
  col += (0.14 + 0.16*uEnergy) * exp(-d*1.7) * vec3(0.42,0.72,1.15);

  col *= smoothstep(1.35,0.35, length((uv-0.5)*vec2(1.1,1.0)));   // vignette
  col += (hash(gl_FragCoord.xy + uTime)-0.5)*0.03;                 // grain
  gl_FragColor = vec4(col,1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("shader compile:", gl.getShaderInfoLog(s));
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
    if (!gl) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = reduce ? 0.3 : 1; // gentler, but never frozen
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
      const cw = canvas.clientWidth || window.innerWidth;
      const ch = canvas.clientHeight || window.innerHeight;
      w = Math.max(2, Math.floor(cw * dpr));
      h = Math.max(2, Math.floor(ch * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

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
      if (w < 3) resize(); // guard against a 0-size first paint
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      energyCur += (energyRef.current - energyCur) * 0.04;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uEnergy, energyCur);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
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
