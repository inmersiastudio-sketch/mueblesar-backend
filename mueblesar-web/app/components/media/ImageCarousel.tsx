"use client";

import { useMemo, useState } from "react";

type Props = {
  images: string[];
  alt: string;
};

export function ImageCarousel({ images, alt }: Props) {
  const safeImages = useMemo(() => (images.length > 0 ? images : []), [images]);
  const [index, setIndex] = useState(0);

  if (safeImages.length === 0) {
    return <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">Sin imagen</div>;
  }

  const prev = () => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-sm">
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
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.slice(0, 8).map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setIndex(i)}
              className={`aspect-[4/3] overflow-hidden rounded-lg border ${index === i ? "border-primary" : "border-transparent"}`}
            >
              <img src={img} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
