"use client";

import { useState, useMemo } from "react";
import { ImageCarousel } from "./ImageCarousel";

export type ImageWithType = {
  url: string;
  type?: string | null; // we will interpret type as color name
};

type Props = {
  images: ImageWithType[];
  alt: string;
  initialColor?: string | null;
  fallbackColor?: string | null;
  arUrl?: string;
};

export function ColorImageCarousel({ images, alt, initialColor, fallbackColor, arUrl }: Props) {
  // group images by type/color; untyped images go into "__default" group
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    images.forEach((img) => {
      const key = img.type && img.type.trim() !== "" ? img.type.trim() : "__default";
      const arr = map.get(key) || [];
      arr.push(img.url);
      map.set(key, arr);
    });
    return map;
  }, [images]);

  const availableColors = useMemo(() => {
    const cols: string[] = [];
    groups.forEach((_urls, key) => {
      if (key !== "__default") cols.push(key);
    });
    return cols;
  }, [groups]);

  const defaultColor = initialColor && availableColors.includes(initialColor) ? initialColor : fallbackColor && availableColors.includes(fallbackColor) ? fallbackColor : null;
  const [selectedColor, setSelectedColor] = useState<string | null>(defaultColor);

  const carouselImages = useMemo(() => {
    if (selectedColor && groups.has(selectedColor)) {
      return groups.get(selectedColor)!;
    }
    // if no color selected or group missing, show all images
    return images.map((i) => i.url);
  }, [selectedColor, groups, images]);

  return (
    <div>
      {availableColors.length > 0 && (
        <div className="flex gap-2 mb-2">
          {availableColors.map((col) => (
            <button
              key={col}
              type="button"
              className={`h-6 w-6 rounded-full border-2 ${selectedColor === col ? "border-primary" : "border-transparent"}`}
              style={{ backgroundColor: col }}
              title={col}
              onClick={() => setSelectedColor(col)}
            />
          ))}
        </div>
      )}
      <ImageCarousel images={carouselImages} alt={alt} arUrl={arUrl} />
    </div>
  );
}
