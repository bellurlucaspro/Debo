"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

import type { GemDesign } from "@/lib/gem-studio/model/design";
import {
  PARAM_SAB_BYTES,
  type MainToWorker,
  type WorkerToMain,
} from "@/lib/gem-studio/worker/protocol";
import type { GemCut } from "@/lib/custom-config";

/**
 * <GemStudioCanvas/> — aperçu WebGPU ray-tracé d'une gemme, piloté par un worker.
 * Si WebGPU est indisponible (ou en cas d'erreur), bascule automatiquement sur
 * l'aperçu R3F existant (<ConfigGem/>) — robustesse e-commerce avant tout.
 */

const ConfigGem = dynamic(
  () => import("@/components/storefront/ConfigGem").then((m) => m.ConfigGem),
  { ssr: false, loading: () => null },
);

type PreviewProps = {
  design: GemDesign;
  fallbackColor?: string;
  fallbackCut?: GemCut;
  className?: string;
};

/**
 * Garde-fou : tout throw dans le canvas WebGPU (worker, GPU, hydratation) est
 * capté ici et bascule sur le rendu R3F au lieu de vider la page.
 */
class GemErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[GemStudio] bascule sur le fallback R3F :", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GemStudioCanvas(props: PreviewProps) {
  const fallback = (
    <ConfigGem
      color={props.fallbackColor ?? "#2E4E9B"}
      cut={props.fallbackCut ?? "round"}
      refractive
      className={props.className}
    />
  );
  return (
    <GemErrorBoundary fallback={fallback}>
      <GemStudioCanvasInner {...props} />
    </GemErrorBoundary>
  );
}

// Détachement de l'OffscreenCanvas = irréversible. Pour survivre au double-mount
// de React StrictMode (dev), on diffère la destruction et on l'annule si le
// composant se re-monte aussitôt sur le même élément <canvas>.
type Attached = { worker: Worker; disposeTimer?: ReturnType<typeof setTimeout> };

function GemStudioCanvasInner({
  design,
  fallbackColor = "#2E4E9B",
  fallbackCut = "round",
  className,
}: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const designRef = useRef(design);
  designRef.current = design;
  const [fallback, setFallback] = useState(false);
  const [stats, setStats] = useState<{ fps: number; carats: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // ── Init du worker : UNE seule fois (indépendant de `species`) ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      setFallback(true);
      return;
    }

    // Réutilise le worker déjà attaché à cet élément (re-mount StrictMode).
    const existing = (canvas as unknown as { __gem?: Attached }).__gem;
    if (existing?.disposeTimer) {
      clearTimeout(existing.disposeTimer);
      existing.disposeTimer = undefined;
    }

    let attached = existing;
    if (!attached) {
      let offscreen: OffscreenCanvas;
      let worker: Worker;
      try {
        offscreen = canvas.transferControlToOffscreen();
        worker = new Worker(
          new URL("../../lib/gem-studio/worker/render.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch (err) {
        console.error("[GemStudio] init impossible, fallback R3F :", err);
        setFallback(true);
        return;
      }
      attached = { worker };
      (canvas as unknown as { __gem?: Attached }).__gem = attached;

      worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
        const m = e.data;
        if (m.type === "fallback" || m.type === "error") setFallback(true);
        else if (m.type === "stats") setStats({ fps: m.fps, carats: m.caratsExact });
      };
      worker.onerror = (e) => {
        console.error("[GemStudio] erreur worker, fallback R3F :", e.message);
        setFallback(true);
      };

      // SharedArrayBuffer pour le drag des sliders : seulement si la page est
      // cross-origin isolated (headers COOP/COEP). Sinon on passera par postMessage.
      const params =
        typeof crossOriginIsolated !== "undefined" && crossOriginIsolated
          ? new SharedArrayBuffer(PARAM_SAB_BYTES)
          : null;

      const init: MainToWorker = {
        type: "init",
        canvas: offscreen,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        params,
        design: designRef.current,
      };
      worker.postMessage(init, [offscreen]);
    }

    const worker = attached.worker;
    workerRef.current = worker;

    // Dimensionnement réactif.
    const sendResize = () => {
      const r = canvas.getBoundingClientRect();
      worker.postMessage({
        type: "resize",
        width: r.width,
        height: r.height,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      } satisfies MainToWorker);
    };
    sendResize();
    const ro = new ResizeObserver(sendResize);
    ro.observe(canvas);

    // Orbite à la souris.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0.6;
    let pitch = 0.45;
    const distance = 4.6;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * 0.01;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX;
      lastY = e.clientY;
      worker.postMessage({ type: "camera", yaw, pitch, distance } satisfies MainToWorker);
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      // Destruction différée : annulée si StrictMode re-monte aussitôt.
      attached!.disposeTimer = setTimeout(() => {
        worker.postMessage({ type: "dispose" } satisfies MainToWorker);
        worker.terminate();
        delete (canvas as unknown as { __gem?: Attached }).__gem;
        workerRef.current = null;
      }, 150);
    };
    // Init unique : ne dépend pas de `species` (géré par l'effet ci-dessous).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tout changement de réglage → recharge le design dans le worker ──────────
  useEffect(() => {
    workerRef.current?.postMessage({ type: "set-design", design } satisfies MainToWorker);
  }, [design]);

  if (fallback) {
    return <ConfigGem color={fallbackColor} cut={fallbackCut} refractive className={className} />;
  }

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }} />
      {stats && (
        <span
          style={{ position: "absolute", top: 8, right: 10 }}
          className="text-[10px] uppercase tracking-luxe text-muted-foreground"
        >
          {stats.fps} fps · ~{stats.carats.toFixed(2)} ct
        </span>
      )}
    </div>
  );
}
