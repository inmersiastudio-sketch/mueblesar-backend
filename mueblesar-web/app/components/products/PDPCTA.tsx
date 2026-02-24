"use client";

import { Button } from "../ui/Button";
import { ARPreview } from "./ARPreview";
import { AddToCartButton } from "../cart/AddToCartButton";

type Props = {
  productId: number;
  storeId?: number | null;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImage?: string | null;
  storeName?: string;
  storeSlug?: string;
  storeWhatsapp?: string | null;
  waLink?: string;
  arLink?: string;
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
};

export function PDPCTA({ 
  productId, 
  storeId, 
  productName, 
  productSlug,
  productPrice,
  productImage,
  storeName,
  storeSlug,
  storeWhatsapp,
  waLink, 
  arLink, 
  widthCm, 
  depthCm, 
  heightCm 
}: Props) {
  const track = (name: string, props?: Record<string, unknown>) => {
    try {
      window.dispatchEvent(new CustomEvent("ar-event", { detail: { name, props } }));
    } catch (e) {
      // ignore
    }
    console.info("[analytics]", name, props ?? {});
  };

  return (
    <div className="space-y-3">
      <AddToCartButton
        product={{
          id: productId,
          slug: productSlug,
          name: productName,
          price: productPrice,
          imageUrl: productImage ?? null,
          storeName: storeName ?? "Sin tienda",
          storeSlug: storeSlug ?? "",
          storeWhatsapp: storeWhatsapp ?? null,
        }}
        className="w-full"
      />
      
      <div className="flex flex-wrap gap-3">
        {waLink ? (
          <Button asChild variant="whatsapp" size="lg" className="flex-1">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("wa_click", { product: productName })}
            >
              Consultar por WhatsApp
            </a>
          </Button>
        ) : (
          <Button variant="secondary" size="lg" disabled className="flex-1">
            WhatsApp no disponible
          </Button>
        )}

        {arLink ? (
          <ARPreview
            arUrl={arLink}
            productId={productId}
            storeId={storeId}
            productName={productName}
            widthCm={widthCm}
            depthCm={depthCm}
            heightCm={heightCm}
          />
        ) : (
          <Button variant="ghost" size="lg" disabled title="Este producto aún no tiene modelo AR disponible">
            Ver en AR (no disponible)
          </Button>
        )}
      </div>
    </div>
  );
}
