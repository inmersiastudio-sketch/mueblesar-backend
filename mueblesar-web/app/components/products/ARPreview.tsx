"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QrCode, Ruler, Smartphone, X } from "lucide-react";
import { Button } from "../ui/Button";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

type Props = {
  arUrl: string;
  productId: number;
  storeId?: number | null;
  productName: string;
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
};

type Vec3 = { x: number; y: number; z: number };
export function ARPreview({ arUrl, productId, storeId, productName, widthCm, depthCm, heightCm }: Props) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canMeasure, setCanMeasure] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ a?: Vec3; b?: Vec3 }>({});
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const [measureMessage, setMeasureMessage] = useState<string | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const [arSessionActive, setArSessionActive] = useState(false);

  const modelRef = useRef<any>(null);
  const hitTestSourceRef = useRef<any>(null);
  const viewerSpaceRef = useRef<any>(null);
  const localSpaceRef = useRef<any>(null);
  const xrSessionRef = useRef<any>(null);
  const pendingMeasureRef = useRef(false);
  const selectHandlerRef = useRef<((event: any) => void) | null>(null);

  const track = (name: string, props?: Record<string, unknown>) => {
    const detailProps = { productId, storeId, product: productName, ...(props ?? {}) };
    console.info("[ar-event]", name, detailProps);
    try {
      window.dispatchEvent(new CustomEvent("ar-event", { detail: { name, props: detailProps } }));
    } catch (e) {
      // ignore
    }
  };

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001", []);
  const sentRef = useRef(false);

  const { glbUrl, glbUrlOriginal, iosUrl, androidIntent, sceneViewerHttps } = useMemo(() => {
    const lower = arUrl.toLowerCase();
    // Check if URL contains .glb (even with query params like ?Expires=...)
    const glb = lower.includes(".glb") ? arUrl : undefined;
    
    // Proxied GLB URL ONLY for web browser (to avoid CORS)
    const proxiedGlb = glb && glb.includes("meshy.ai") 
      ? `${apiBase}/api/proxy/glb?url=${encodeURIComponent(glb)}`
      : glb;
    
    console.log('[ARPreview] URL computation:', { 
      arUrl, 
      glb, 
      proxiedGlb, 
      apiBase,
      isMeshy: glb?.includes("meshy.ai") 
    });
    
    // iOS USDZ conversion (Scene Viewer doesn't work on iOS anyway)
    const iosCandidate = glb ? arUrl.replace(/\.glb(\?.*)?$/, ".usdz$1") : arUrl.endsWith(".usdz") ? arUrl : undefined;
    
    // For Scene Viewer: use DIRECT Meshy URL (Google servers can access it, no CORS)
    const urlForMobile = glb ?? arUrl; // Direct URL, no proxy
    const intent = glb
      ? `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(urlForMobile)}&mode=ar_preferred&title=${encodeURIComponent(productName)}#Intent;scheme=https;package=com.google.ar.core;end;`
      : undefined;
    const httpsViewer = glb
      ? `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(urlForMobile)}&mode=ar_preferred&title=${encodeURIComponent(productName)}`
      : undefined;
    return { 
      glbUrl: proxiedGlb ?? arUrl,           // For web model-viewer (proxied)
      glbUrlOriginal: urlForMobile,          // For QR/mobile (direct URL)
      iosUrl: iosCandidate, 
      androidIntent: intent ?? arUrl, 
      sceneViewerHttps: httpsViewer ?? arUrl 
    };
  }, [arUrl, productName, apiBase]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      const ua = window.navigator?.userAgent?.toLowerCase() ?? "";
      setIsMobile(/iphone|ipad|ipod|android/.test(ua));
      const isIOSDevice = /iphone|ipad|ipod/.test(ua);
      setIsIOS(isIOSDevice);
      const xr = (window.navigator as any).xr;
      if (!isIOSDevice && xr?.isSessionSupported) {
        xr
          .isSessionSupported("immersive-ar")
          .then((supported: boolean) => setCanMeasure(supported))
          .catch(() => setCanMeasure(false));
      }
    }
  }, []);

  const siteBase = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl;
    if (origin) return origin;
    return "";
  }, [origin]);

  const redirectUrl = useMemo(() => {
    if (!siteBase) return "";
    try {
      const url = new URL(siteBase);
      url.pathname = "/ar";
      url.searchParams.set("glb", glbUrlOriginal); // Use original URL for mobile
      url.searchParams.set("title", productName);
      if (iosUrl) url.searchParams.set("usdz", iosUrl);
      return url.toString();
    } catch (e) {
      return "";
    }
  }, [siteBase, glbUrlOriginal, iosUrl, productName]);

  const qrUnified = useMemo(() => {
    // Use short URL for QR code to make it less dense and easier to scan
    if (productId && apiBase) {
      const shortUrl = `${apiBase}/api/short/ar/${productId}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shortUrl)}`;
    }
    // Fallback to original logic
    const badOrigin = redirectUrl.includes("localhost");
    const target = !badOrigin && redirectUrl ? redirectUrl : iosUrl || sceneViewerHttps || glbUrlOriginal;
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(target)}`;
  }, [productId, apiBase, redirectUrl, iosUrl, sceneViewerHttps, glbUrlOriginal]);

  useEffect(() => {
    if (!open) return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-model-viewer]");
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
    script.dataset.modelViewer = "true";
    document.head.appendChild(script);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (widthCm || depthCm || heightCm) {
      track("ar_compare_view", { product: productName, widthCm, depthCm, heightCm });
    }
  }, [open, widthCm, depthCm, heightCm, productName]);

  useEffect(() => {
    if (!open || !productId) return;
    if (sentRef.current) return;
    sentRef.current = true;
    const source = isIOS ? "IOS" : isMobile ? "ANDROID" : "WEB";
    fetch(`${apiBase}/api/events/ar-view`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ productId, storeId, source }),
    }).catch(() => {
      // ignore tracking errors
    });
  }, [apiBase, isIOS, isMobile, open, productId, storeId]);

  useEffect(() => {
    if (!open) sentRef.current = false;
  }, [open]);

  useEffect(() => {
    if (open) return;
    // Al cerrar el modal, limpia cualquier sesión AR activa y estado de medición
    if (xrSessionRef.current) {
      xrSessionRef.current.end?.();
    }
    cleanupXRSession();
    resetMeasure();
  }, [open]);

  const resetMeasure = () => {
    setMeasurePoints({});
    setMeasureDistance(null);
    setMeasureMessage(null);
    setMeasureError(null);
    pendingMeasureRef.current = false;
  };

  const cleanupXRSession = () => {
    if (xrSessionRef.current && selectHandlerRef.current) {
      xrSessionRef.current.removeEventListener("select", selectHandlerRef.current);
    }
    if (xrSessionRef.current) {
      xrSessionRef.current.removeEventListener("end", cleanupXRSession);
    }
    try {
      hitTestSourceRef.current?.cancel?.();
    } catch (e) {
      // ignore
    }
    hitTestSourceRef.current = null;
    viewerSpaceRef.current = null;
    localSpaceRef.current = null;
    xrSessionRef.current = null;
    selectHandlerRef.current = null;
    setArSessionActive(false);
    setIsMeasuring(false);
  };

  const setupHitTest = async (session: any) => {
    if (!session?.requestReferenceSpace || !session?.requestHitTestSource) {
      setMeasureError("Este dispositivo no soporta medición AR");
      track("ar_measure_fail", { product: productName, reason: "no-hit-test" });
      setIsMeasuring(false);
      return;
    }

    try {
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const localSpace = await session.requestReferenceSpace("local");
      const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

      viewerSpaceRef.current = viewerSpace;
      localSpaceRef.current = localSpace;
      hitTestSourceRef.current = hitTestSource;
      xrSessionRef.current = session;

      const selectHandler = (event: any) => {
        if (!hitTestSourceRef.current || !localSpaceRef.current) return;
        const frame = event.frame;
        const results = frame?.getHitTestResults?.(hitTestSourceRef.current) ?? [];
        if (!results.length) {
          setMeasureError("No se detecta plano, mueve el dispositivo");
          track("ar_measure_fail", { product: productName, reason: "no-plane" });
          return;
        }
        const pose = results[0].getPose(localSpaceRef.current);
        if (!pose?.transform?.position) return;
        const p = pose.transform.position as DOMPointReadOnly;
        const nextPoint: Vec3 = { x: p.x, y: p.y, z: p.z };

        setMeasurePoints((prev) => {
          if (!prev.a) {
            track("ar_measure_point", { product: productName, index: 1 });
            setMeasureMessage("Primer punto listo, toca el segundo punto");
            return { a: nextPoint };
          }

          const a = prev.a;
          const dx = nextPoint.x - a.x;
          const dy = nextPoint.y - a.y;
          const dz = nextPoint.z - a.z;
          const meters = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const cm = Math.round(meters * 1000) / 10; // one decimal cm
          setMeasureDistance(cm);
          setMeasureMessage("Medición completa. Reinicia para medir otra vez");
          track("ar_measure_point", { product: productName, index: 2 });
          track("ar_measure_result", { product: productName, cm });
          return { a, b: nextPoint };
        });
      };

      selectHandlerRef.current = selectHandler;
      session.addEventListener("select", selectHandler);
      session.addEventListener("end", cleanupXRSession);
    } catch (err) {
      setMeasureError("No se pudo iniciar medición");
      track("ar_measure_fail", { product: productName, reason: "setup-error" });
      setIsMeasuring(false);
    }
  };

  const handleMeasureStart = async () => {
    resetMeasure();
    setIsMeasuring(true);
    setMeasureMessage("Apunta al piso y toca dos puntos");
    track("ar_measure_start", { product: productName });

    const mv = modelRef.current as any;
    if (!mv) {
      setMeasureError("No se encontró visor AR");
      setIsMeasuring(false);
      track("ar_measure_fail", { product: productName, reason: "no-viewer" });
      return;
    }

    pendingMeasureRef.current = true;

    // If already in an AR session, reuse it
    if (mv.xrSession) {
      await setupHitTest(mv.xrSession);
      return;
    }

    if (mv.activateAR) {
      try {
        await mv.activateAR();
      } catch (e) {
        setMeasureError("No se pudo abrir AR");
        setIsMeasuring(false);
        track("ar_measure_fail", { product: productName, reason: "activate-error" });
      }
    } else {
      setMeasureError("Este dispositivo no soporta WebXR");
      setIsMeasuring(false);
      track("ar_measure_fail", { product: productName, reason: "no-activate" });
    }
  };

  const handleArStatus = async (event: any) => {
    const status = event?.detail?.status;
    if (status === "session-started") {
      setArSessionActive(true);
      if (pendingMeasureRef.current && modelRef.current?.xrSession) {
        await setupHitTest(modelRef.current.xrSession);
        pendingMeasureRef.current = false;
      }
    }
    if (status === "not-presenting") {
      setArSessionActive(false);
      pendingMeasureRef.current = false;
      cleanupXRSession();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        onClick={() => {
          track("ar_click", { product: productName, hasIos: Boolean(iosUrl) });
          setOpen(true);
        }}
      >
        Ver en AR
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow hover:bg-white"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="grid gap-4 p-4 md:grid-cols-[1.7fr_1fr] md:p-6">
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                {/* @ts-expect-error Custom element provided by model-viewer script */}
                <model-viewer
                  ref={modelRef}
                  src={glbUrl}
                  alt={productName}
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  ar-hit-test
                  ios-src={iosUrl}
                  camera-controls
                  auto-rotate
                  style={{ width: "100%", height: "100%" }}
                  poster=""
                  exposure="1"
                  shadow-intensity="1"
                  onLoad={() => track("ar_modal_load", { product: productName })}
                  onArStatus={handleArStatus}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <QrCode size={16} /> Escaneá para abrir AR
                  </div>
                  <div className="flex justify-center">
                    <img src={qrUnified} alt="QR experiencia AR" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2" />
                  </div>
                  <p className="pt-3 text-xs text-slate-600">
                    Detecta el dispositivo: iPhone abre Quick Look (USDZ si existe), Android abre Scene Viewer (GLB).
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Smartphone size={16} /> Abrir en este dispositivo
                  </div>
                  <Button
                    asChild
                    className="w-full"
                    onClick={() => track("ar_launch", { product: productName, target: redirectUrl || androidIntent })}
                  >
                    <a href={redirectUrl || androidIntent} target="_blank" rel="noreferrer">
                      Abrir experiencia AR
                    </a>
                  </Button>
                  <p className="text-xs text-slate-600">
                    Si estás en iPhone y el modelo no tiene USDZ, Quick Look no funcionará y verás descarga/errores.
                  </p>
                </div>

                {isMobile && (
                  <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <Ruler size={16} /> Medir en AR (beta)
                    </div>

                    <Button
                      className="w-full"
                      disabled={isIOS || !canMeasure || isMeasuring}
                      onClick={handleMeasureStart}
                    >
                      {isIOS ? "No disponible en iPhone" : isMeasuring ? "Iniciando medición..." : "Medir espacio"}
                    </Button>

                    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-800">
                      <p>
                        Funciona en Android con WebXR. En iPhone/Quick Look no se puede medir; usa la app Regla del dispositivo y compara las
                        dimensiones.
                      </p>
                      {measureMessage && <p className="pt-1 font-semibold">{measureMessage}</p>}
                    </div>

                    {measureDistance !== null && (
                      <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900">
                        Distancia: {measureDistance.toFixed(1)} cm
                      </div>
                    )}

                    {measureError && <p className="text-xs font-semibold text-red-600">{measureError}</p>}

                    {(measurePoints.a || measurePoints.b || measureDistance !== null) && (
                      <div className="flex gap-2">
                        <Button variant="secondary" className="w-full" onClick={resetMeasure}>
                          Reiniciar medición
                        </Button>
                        {arSessionActive && (
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                              xrSessionRef.current?.end?.();
                              cleanupXRSession();
                            }}
                          >
                            Cerrar AR
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(widthCm || depthCm || heightCm) && (
                  <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-800">Comparar dimensiones</div>
                    <div className="text-sm text-slate-700">
                      {widthCm ? `${widthCm} cm` : "?"} (ancho) × {depthCm ? `${depthCm} cm` : "?"} (prof.) × {heightCm ? `${heightCm} cm` : "?"} (alto)
                    </div>
                    <p className="text-xs text-slate-600">
                      En iPhone, mide tu espacio con la app Regla y compáralo con estas dimensiones. En Android, podés usar el modo Medir para
                      ubicar dos puntos en el plano. El modelo está a escala real según estas medidas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
