"use client";

import { useEffect, useRef } from "react";
import { Renderer, Geometry, Program, Mesh } from "ogl";

/* Latar medan sinyal Bit Pair. Dekoratif murni, aria-hidden. */

const VERT = `
attribute vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_scroll;
uniform vec3 u_ground;
uniform vec3 u_line;
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float rows = 28.0;
  float row = floor(uv.y * rows) / rows;
  float wave = step(0.5, fract(row * 7.0 + u_scroll * 0.6 + uv.x * 3.0));
  float gridX = smoothstep(0.985, 1.0, fract(uv.x * 48.0));
  float gridY = smoothstep(0.96, 1.0, fract(uv.y * rows));
  float bit = wave * 0.10 + gridX * 0.05 + gridY * 0.05;
  gl_FragColor = vec4(mix(u_ground, u_line, bit), 1.0);
}
`;

function cssRGB(varName: string, fallback: [number, number, number]): [number, number, number] {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function SignalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let renderer: Renderer | null = null;
    let program: Program | null = null;
    let mesh: Mesh | null = null;
    let visible = true;
    let scroll = 0;

    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      scroll = window.scrollY / max;
    };
    onScroll();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });

    try {
      renderer = new Renderer({
        canvas,
        antialias: false,
        alpha: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.75),
      });
      const gl = renderer.gl;
      const geometry = new Geometry(gl, {
        position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      });
      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          u_res: { value: [gl.canvas.width, gl.canvas.height] },
          u_scroll: { value: 0 },
          u_ground: { value: cssRGB("--color-ground", [0.06, 0.06, 0.07]) },
          u_line: { value: cssRGB("--color-accent", [0.75, 0.48, 0.14]) },
        },
      });
      mesh = new Mesh(gl, { geometry, program });

      const resize = () => {
        if (!renderer || !program) return;
        const w = Math.max(1, Math.floor(canvas.clientWidth));
        const h = Math.max(1, Math.floor(canvas.clientHeight));
        renderer.setSize(w, h);
        const g = renderer.gl;
        // OGL setSize menulis ulang inline style; kembalikan ke utility Tailwind.
        g.canvas.style.width = "";
        g.canvas.style.height = "";
        program.uniforms.u_res.value = [g.canvas.width, g.canvas.height];
      };
      const onTheme = () => {
        if (!program) return;
        program.uniforms.u_ground.value = cssRGB("--color-ground", [0.06, 0.06, 0.07]);
      };

      resize();
      requestAnimationFrame(resize);
      const ro = new ResizeObserver(resize);
      if (canvas.parentElement) ro.observe(canvas.parentElement);
      io.observe(canvas);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", resize);
      window.addEventListener("volta-theme", onTheme);

      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || !renderer || !program || !mesh) return;
        program.uniforms.u_scroll.value += (scroll - program.uniforms.u_scroll.value) * 0.08;
        renderer.render({ scene: mesh });
      };
      frame();

      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", resize);
        window.removeEventListener("volta-theme", onTheme);
      };
    } catch {
      return () => io.disconnect();
    }
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
