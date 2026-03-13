"use client";

import { useState, useEffect, useMemo } from "react";
import { Cuboid, ImageIcon, Maximize2, X, RotateCw, Box } from "lucide-react";

interface ProductViewerProps {
  images: string[];
  alt: string;
  arUrl?: string;
  glbUrl?: string;
  usdzUrl?: string;
  productDimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

export function ProductViewer({
  images,
  alt,
  arUrl,
  glbUrl: propGlbUrl,
  usdzUrl: propUsdzUrl,
  productDimensions,
}: ProductViewerProps) {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const hasAr = !!(propGlbUrl || propUsdzUrl || arUrl);

  // Load model-viewer script
  useEffect(() => {
    if (viewMode !== "3d" || !hasAr) return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-model-viewer]");
    if (existing) {
      setIsLoading(false);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
    script.dataset.modelViewer = "true";
    script.onload = () => setIsLoading(false);
    document.head.appendChild(script);
  }, [viewMode, hasAr]);

  // Parse URLs
  const { glbUrl, iosUrl } = useMemo(() => {
    let parsedGlb = propGlbUrl || arUrl || "";
    let parsedUsdz = propUsdzUrl;

    if (!propGlbUrl && arUrl) {
      try {
        const obj = JSON.parse(arUrl);
        if (typeof obj === "object" && obj !== null && obj.glb) {
          parsedGlb = obj.glb;
          if (obj.usdz) parsedUsdz = obj.usdz;
        }
      } catch {
        // Standard string
      }
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const lower = parsedGlb.toLowerCase();
    const glb = lower.includes(".glb") ? parsedGlb : undefined;
    const isMeshy = glb?.includes("meshy.ai");
    const proxiedGlb = glb && isMeshy
      ? `${apiBase}/api/proxy/glb?url=${encodeURIComponent(glb)}`
      : glb;

    let iosCandidate = parsedUsdz;
    if (!iosCandidate && glb) {
      iosCandidate = parsedGlb.replace(/\.glb(\?.*)?$/, ".usdz$1");
    }

    return {
      glbUrl: proxiedGlb ?? parsedGlb,
      iosUrl: iosCandidate,
    };
  }, [arUrl, propGlbUrl, propUsdzUrl]);

  const safeImages = images.length > 0 ? images : [];

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* View Mode Toggle - Floating */}
      {hasAr && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-[var(--gray-200)] p-1">
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "3d"
                  ? "bg-[var(--primary-600)] text-white shadow-md"
                  : "text-[var(--gray-600)] hover:text-[var(--gray-900)]"
              }`}
            >
              <Box className="w-4 h-4" />
              3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === "2d"
                  ? "bg-[var(--primary-600)] text-white shadow-md"
                  : "text-[var(--gray-600)] hover:text-[var(--gray-900)]"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Fotos
            </button>
          </div>
        </div>
      )}

      {/* Main Viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-[var(--gray-50)] to-white rounded-2xl overflow-hidden">
        {viewMode === "3d" && glbUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--gray-50)] z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-[var(--primary-200)] border-t-[var(--primary-600)] rounded-full animate-spin" />
                  <span className="text-sm text-[var(--gray-500)]">Cargando modelo 3D...</span>
                </div>
              </div>
            )}
            {/* @ts-expect-error model-viewer is a custom element */}
            <model-viewer
              src={glbUrl}
              ios-src={iosUrl}
              alt={`Modelo 3D de ${alt}`}
              camera-controls
              auto-rotate
              ar
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1"
              interaction-prompt="auto"
              interaction-prompt-threshold="500"
              camera-orbit="0deg 75deg 105%"
              min-camera-orbit="auto auto 50%"
              max-camera-orbit="auto auto 150%"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
              on-load={() => setIsLoading(false)}
            />

            {/* 3D Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2">
                {/* AR Button */}
                <button
                  type="button"
                  className="flex items-center gap-2 bg-white/95 backdrop-blur-sm text-[var(--gray-900)] px-4 py-2 rounded-full shadow-lg border border-[var(--gray-200)] text-sm font-medium hover:bg-white transition-colors"
                  onClick={() => {
                    const mv = document.querySelector("model-viewer") as { activateAR?: () => void } | null;
                    if (mv?.activateAR) mv.activateAR();
                  }}
                >
                  <Box className="w-4 h-4 text-[var(--primary-600)]" />
                  Ver en tu espacio
                </button>
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="pointer-events-auto p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors"
                aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Dimensions Badge */}
            {productDimensions && (productDimensions.width || productDimensions.height || productDimensions.depth) && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-[var(--gray-200)] text-xs text-[var(--gray-600)]">
                {productDimensions.width && `${productDimensions.width}cm`}
                {productDimensions.width && productDimensions.depth && " × "}
                {productDimensions.depth && `${productDimensions.depth}cm`}
                {(productDimensions.width || productDimensions.depth) && productDimensions.height && " × "}
                {productDimensions.height && `${productDimensions.height}cm`}
              </div>
            )}
          </>
        ) : (
          <div className="relative h-full">
            <img
              src={safeImages[imageIndex]}
              alt={alt}
              className="w-full h-full object-contain p-8"
            />

            {/* Image Navigation */}
            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i - 1 + safeImages.length) % safeImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 shadow-lg border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-white transition-colors"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i + 1) % safeImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 shadow-lg border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-white transition-colors"
                >
                  →
                </button>

                {/* Thumbnails */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {safeImages.map((img, i) => (
                    <button
                      key={img + i}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        imageIndex === i
                          ? "bg-[var(--primary-600)] w-6"
                          : "bg-[var(--gray-300)] hover:bg-[var(--gray-400)]"
                      }`}
                      aria-label={`Ver imagen ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
