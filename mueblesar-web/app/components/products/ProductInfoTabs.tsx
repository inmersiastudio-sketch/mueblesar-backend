"use client";

import { useState } from "react";

export type ProductInfo = {
  description?: string | null;
  category?: string | null;
  room?: string | null;
  style?: string | null;
  material?: string | null;
  color?: string | null;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export function ProductInfoTabs({
  description,
  category,
  room,
  style,
  material,
  color,
  widthCm,
  depthCm,
  heightCm,
  weightKg,
}: ProductInfo) {
  const [active, setActive] = useState<"description" | "specs">("description");

  return (
    <div className="mt-6">
      <div className="flex border-b">
        <button
          className={`px-4 py-2 -mb-px ${
            active === "description" ? "border-b-2 border-primary font-semibold" : "text-slate-600"
          }`}
          onClick={() => setActive("description")}
        >
          Descripción
        </button>
        <button
          className={`px-4 py-2 -mb-px ${
            active === "specs" ? "border-b-2 border-primary font-semibold" : "text-slate-600"
          }`}
          onClick={() => setActive("specs")}
        >
          Ficha técnica
        </button>
      </div>
      <div className="mt-4 text-sm text-slate-700">
        {active === "description" ? (
          <p>{description}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {material && (
              <div>
                <div className="font-semibold text-slate-800">Material</div>
                <div>{material}</div>
              </div>
            )}
            {color && (
              <div>
                <div className="font-semibold text-slate-800">Color</div>
                <div className="flex items-center gap-1">
                  {color.split(",").map((c, i) => (
                    <span
                      key={i}
                      className="inline-block h-4 w-4 rounded-full border"
                      style={{ backgroundColor: c.trim() }}
                      title={c.trim()}
                    />
                  ))}
                </div>
              </div>
            )}
            {widthCm && (
              <div>
                <div className="font-semibold text-slate-800">Ancho</div>
                <div>{widthCm} cm</div>
              </div>
            )}
            {depthCm && (
              <div>
                <div className="font-semibold text-slate-800">Profundidad</div>
                <div>{depthCm} cm</div>
              </div>
            )}
            {heightCm && (
              <div>
                <div className="font-semibold text-slate-800">Altura</div>
                <div>{heightCm} cm</div>
              </div>
            )}
            {weightKg && (
              <div>
                <div className="font-semibold text-slate-800">Peso</div>
                <div>{weightKg} kg</div>
              </div>
            )}
            {category && (
              <div>
                <div className="font-semibold text-slate-800">Categoría</div>
                <div>{category}</div>
              </div>
            )}
            {room && (
              <div>
                <div className="font-semibold text-slate-800">Ambiente</div>
                <div>{room}</div>
              </div>
            )}
            {style && (
              <div>
                <div className="font-semibold text-slate-800">Estilo</div>
                <div>{style}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
