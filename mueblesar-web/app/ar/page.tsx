"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const uaIsIOS = (ua: string) => /iphone|ipad|ipod/.test(ua.toLowerCase());

export default function ARRedirectPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-center">Redirigiendo…</div>}>
      <ARRedirectContent />
    </Suspense>
  );
}

function ARRedirectContent() {
  const params = useSearchParams();
  const glb = params.get("glb") ?? "";
  const usdz = params.get("usdz") ?? "";
  const title = params.get("title") ?? "Modelo AR";

  const track = (name: string, props?: Record<string, unknown>) => {
    console.info("[ar-event]", name, props ?? {});
    try {
      window.dispatchEvent(new CustomEvent("ar-event", { detail: { name, props } }));
    } catch (e) {
      // ignore
    }
  };

  const sceneViewerHttps = useMemo(() => {
    if (!glb) {
      console.log("[AR Page] No GLB URL provided");
      return "";
    }
    const url = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glb)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
    console.log("[AR Page] GLB URL:", glb);
    console.log("[AR Page] Scene Viewer URL:", url);
    return url;
  }, [glb, title]);

  useEffect(() => {
    console.log("[AR Page] Params:", { glb, usdz, title });
    track("ar_qr_open", { glb, usdz: Boolean(usdz) });
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = uaIsIOS(ua);
    if (isIOS && usdz) {
      track("ar_qr_success", { target: "ios_usdz", url: usdz });
      track("ar_launch", { target: "ios_usdz", url: usdz });
      window.location.replace(usdz);
      return;
    }
    if (isIOS && !usdz) {
      track("ar_qr_fail", { reason: "missing_usdz", glb: Boolean(glb) });
    }
    if (sceneViewerHttps) {
      track("ar_qr_success", { target: "android_scene_viewer", url: sceneViewerHttps });
      track("ar_launch", { target: "android_scene_viewer", url: sceneViewerHttps });
      window.location.replace(sceneViewerHttps);
      return;
    }
    if (glb) {
      track("ar_qr_success", { target: "fallback_glb", url: glb });
      track("ar_launch", { target: "fallback_glb", url: glb });
      window.location.replace(glb);
    }
  }, [glb, sceneViewerHttps, usdz]);

  const fallbackAndroid = sceneViewerHttps || glb;
  const fallbackIOS = usdz || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-center">
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-lg font-semibold text-slate-900">Abriendo experiencia AR…</h1>
        <p className="text-sm text-slate-600">
          Detectamos tu dispositivo y te redirigimos al visor nativo. Si no pasa nada en unos segundos, usa los botones de abajo.
        </p>
        
        {/* Debug info */}
        <div className="rounded-lg bg-slate-100 p-3 text-left text-xs">
          <div className="font-semibold text-slate-700 mb-1">Debug Info:</div>
          <div className="text-slate-600 break-all">
            <div><strong>GLB:</strong> {glb || "No GLB"}</div>
            <div><strong>USDZ:</strong> {usdz || "No USDZ"}</div>
            <div><strong>Scene Viewer URL:</strong> {sceneViewerHttps || "No URL"}</div>
          </div>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={fallbackAndroid || "#"}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:border-primary"
          >
            Abrir en Android (Scene Viewer)
          </a>
          <a
            href={fallbackIOS || "#"}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm ${fallbackIOS ? "border-slate-200 text-primary hover:border-primary" : "border-slate-100 text-slate-400 cursor-not-allowed"}`}
          >
            Abrir en iPhone (Quick Look)
          </a>
        </div>
        <p className="text-xs text-slate-500">
          iPhone necesita USDZ para AR; Android usa GLB con Scene Viewer. Si ves descarga en iPhone, el modelo no tiene USDZ.
        </p>
      </div>
    </div>
  );
}
