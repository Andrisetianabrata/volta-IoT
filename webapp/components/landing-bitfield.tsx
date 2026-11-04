"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Box, Program, Mesh, Vec3 } from "ogl";

/* Medan kubus Bit 3D: akselerasi hardware, perspektif nyata.
   Tinggi mengikuti waktu + pointer + scroll. Emas di atas hijau botol. */

const VERT = `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
varying vec3 vNormal;
varying float vY;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vY = wp.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec3 uTop;
uniform vec3 uSide;
uniform vec3 uBase;
varying vec3 vNormal;
varying float vY;
void main() {
  float up = clamp(vNormal.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uSide, uTop, up * up);
  col = mix(uBase, col, smoothstep(-0.6, 0.4, vY));
  gl_FragColor = vec4(col, 1.0);
}
`;

function hex(v: string): [number, number, number] {
  const n = parseInt(v.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function LandingBitfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let renderer: Renderer | null = null;
    let visible = true;
    let scroll = 0;
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;

    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      scroll = window.scrollY / max;
    };
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      tpx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      tpy = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    };

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));

    try {
      renderer = new Renderer({
        canvas,
        antialias: true,
        alpha: true,
        dpr: Math.min(window.devicePixelRatio || 1, 1.75),
      });
      const gl = renderer.gl;
      const camera = new Camera(gl, { fov: 34, near: 0.1, far: 100 });
      camera.position.set(0, 9.2, 17);
      camera.lookAt(new Vec3(0, -0.2, 0));

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTop: { value: hex("#edeff5") },
          uSide: { value: hex("#2e4bff") },
          uBase: { value: hex("#0a0a12") },
        },
      });
      const geometry = new Box(gl, { width: 0.94, height: 1, depth: 0.94 });
      const scene = new Transform();
      const cubes: Mesh[] = [];
      const COLS = 20;
      const ROWS = 12;
      for (let ix = 0; ix < COLS; ix++) {
        for (let iz = 0; iz < ROWS; iz++) {
          const m = new Mesh(gl, { geometry, program });
          m.position.set((ix - (COLS - 1) / 2) * 1.02, 0, (iz - (ROWS - 1) / 2) * 1.02);
          m.setParent(scene);
          cubes.push(m);
        }
      }

      const resize = () => {
        if (!renderer) return;
        const w = Math.max(1, Math.floor(canvas.clientWidth));
        const h = Math.max(1, Math.floor(canvas.clientHeight));
        renderer.setSize(w, h);
        // OGL setSize menulis ulang inline style; kembalikan ke utility Tailwind.
        renderer.gl.canvas.style.width = "";
        renderer.gl.canvas.style.height = "";
        camera.perspective({ aspect: w / Math.max(1, h) });
      };
      resize();
      requestAnimationFrame(resize);
      const ro = new ResizeObserver(resize);
      if (canvas.parentElement) ro.observe(canvas.parentElement);

      const onTheme = () => {};
      window.addEventListener("volta-theme", onTheme);

      io.observe(canvas);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("resize", resize);
      onScroll();

      let t = Math.random() * 100;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || !renderer) return;
        t += 0.016;
        px += (tpx - px) * 0.05;
        py += (tpy - py) * 0.05;
        const scr = scroll * Math.PI * 2;
        let k = 0;
        for (let ix = 0; ix < COLS; ix++) {
          for (let iz = 0; iz < ROWS; iz++) {
            const dx = ix - COLS / 2 - px * 4;
            const dz = iz - ROWS / 2 - py * 3;
            const d = Math.sqrt(dx * dx + dz * dz);
            const h =
              0.35 +
              1.5 * Math.max(0, Math.sin(d * 0.7 - t * 2.2)) +
              0.8 * Math.max(0, Math.sin(ix * 0.5 + scr + t * 0.9) * Math.sin(iz * 0.5 - scr * 0.7));
            const m = cubes[k++];
            m.scale.y = Math.max(0.12, h);
            m.position.y = m.scale.y / 2 - 1.1;
          }
        }
        camera.position.x += (px * 2.2 - camera.position.x) * 0.04;
        camera.lookAt(new Vec3(0, -0.2, 0));
        renderer.render({ scene, camera });
      };
      frame();

      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", resize);
        window.removeEventListener("volta-theme", onTheme);
        try {
          geometry.remove();
          program.remove();
        } catch {
          /* abaikan */
        }
      };
    } catch {
      return () => io.disconnect();
    }
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
