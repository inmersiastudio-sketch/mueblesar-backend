"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Cuboid, ImageIcon } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

type Props = {
  images: string[];
  alt: string;
  arUrl?: string;
  glbUrl?: string;
  usdzUrl?: string;
};

export function ImageCarousel({ images, alt, arUrl, glbUrl: propGlbUrl, usdzUrl: propUsdzUrl }: Props) {
  const safeImages = useMemo(() => (images.length > 0 ? images : []), [images]);
  const [index, setIndex] = useState(0);
  const hasAr = !!(propGlbUrl || propUsdzUrl || arUrl);
  const [viewMode, setViewMode] = useState<"2d" | "3d">(hasAr ? "3d" : "2d");

  // Load model-viewer script only when needed
  useEffect(() => {
    if (viewMode !== "3d") return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-model-viewer]");
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
    script.dataset.modelViewer = "true";
    document.head.appendChild(script);
  }, [viewMode]);

  // Derived URLs for model viewer
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001", []);
  const { glbUrl, iosUrl } = useMemo(() => {
    // Use new separate fields first, fallback to arUrl for backward compatibility
    let parsedGlb = propGlbUrl || arUrl || "";
    let parsedUsdz = propUsdzUrl;

    // Check if arUrl (legacy) is still in the old dual-format JSON string from the backend
    if (!propGlbUrl && arUrl) {
      try {
        const obj = JSON.parse(arUrl);
        if (typeof obj === "object" && obj !== null && obj.glb) {
          parsedGlb = obj.glb;
          if (obj.usdz) parsedUsdz = obj.usdz;
        }
      } catch {
        // It's a standard string, proceed normally
      }
    }

    const lower = parsedGlb.toLowerCase();
    const glb = lower.includes(".glb") ? parsedGlb : undefined;
    const isMeshy = glb?.includes("meshy.ai");
    const proxiedGlb = glb && isMeshy
      ? `${apiBase}/api/proxy/glb?url=${encodeURIComponent(glb)}`
      : glb;

    let iosCandidate = parsedUsdz;
    if (!iosCandidate) {
      iosCandidate = glb ? parsedGlb.replace(/\.glb(\?.*)?$/, ".usdz$1") : parsedGlb.endsWith(".usdz") ? parsedGlb : undefined;
    }

    return {
      glbUrl: proxiedGlb ?? parsedGlb,
      iosUrl: iosCandidate,
    };
  }, [arUrl, propGlbUrl, propUsdzUrl, apiBase]);

  if (safeImages.length === 0) {
    return <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">Sin imagen</div>;
  }

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="space-y-4">
      {hasAr && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${viewMode === "3d" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Cuboid size={16} /> 3D Interactivo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${viewMode === "2d" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <ImageIcon size={16} /> Fotos
            </button>
          </div>
        </div>
      )}

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
        {viewMode === "3d" && glbUrl ? (
          <div className="h-full w-full flex items-center justify-center cursor-move">
            {/* @ts-expect-error viewMode bounds it but typescript still complains on custom elements */}
            <model-viewer
              src={glbUrl}
              ios-src={iosUrl}
              alt={`Modelo 3D de ${alt}`}
              camera-controls
              auto-rotate
              ar
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1"
              interaction-prompt="auto"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
            />
          </div>
        ) : safeImages.length > 0 ? (
          <>
            <img src={safeImages[index]} alt={alt} className="h-full w-full object-cover" />
            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-white"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-white"
                >
                  →
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin imagen</div>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.slice(0, 8).map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => {
                setIndex(i);
                setViewMode("2d");
              }}
              className={`aspect-[4/3] overflow-hidden rounded-lg border ${index === i && viewMode === "2d" ? "border-primary" : "border-transparent"}`}
            >
              <img src={img} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
