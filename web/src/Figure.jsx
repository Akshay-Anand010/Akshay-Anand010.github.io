import { useEffect, useRef } from "react";

function drawRings(ctx, w, h, time, pull) {
  const cx = w * 0.5 + pull.x * 18;
  const cy = h * 0.52 + pull.y * 12;
  for (let i = 0; i < 16; i += 1) {
    const z = (i / 16 + time * 0.06) % 1;
    const scale = 0.08 + z * z * 1.35;
    const rx = Math.min(w, h) * 0.55 * scale;
    const ry = rx * (0.62 + 0.08 * Math.sin(time + i));
    ctx.globalAlpha = 0.28 + z * 0.62;
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = z > 0.75 ? 1.25 : 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.sin(time * 0.25) * 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawField(ctx, w, h, time, pull) {
  const gap = 11;
  for (let y = gap * 0.6; y < h; y += gap) {
    for (let x = gap * 0.6; x < w; x += gap) {
      const wave = Math.sin(x * 0.045 + time * 0.9) + Math.cos(y * 0.05 - time * 0.7);
      const dx = Math.sin(time * 0.8 + y * 0.03) * 3.2 + pull.x * 8;
      const dy = Math.cos(time * 0.6 + x * 0.03) * 2.4 + pull.y * 6;
      const hot = wave > 1.35;
      ctx.fillStyle = hot ? "#1e1e1e" : "rgba(30, 30, 30, 0.45)";
      ctx.globalAlpha = hot ? 0.9 : 0.35 + (wave + 2) * 0.12;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, hot ? 1.7 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export default function Figure({ variant }) {
  const ref = useRef(null);
  const pull = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;

    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(now) {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const time = reduced ? 0.4 : now * 0.001;
      if (variant === "rings") drawRings(ctx, w, h, time, pull.current);
      else drawField(ctx, w, h, time, pull.current);
      if (!reduced) raf = requestAnimationFrame(frame);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    raf = requestAnimationFrame(frame);

    function onMove(event) {
      const box = canvas.getBoundingClientRect();
      pull.current = {
        x: (event.clientX - box.left) / box.width - 0.5,
        y: (event.clientY - box.top) / box.height - 0.5,
      };
    }
    function onLeave() {
      pull.current = { x: 0, y: 0 };
    }
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [variant]);

  return <canvas ref={ref} className="win-canvas" />;
}
