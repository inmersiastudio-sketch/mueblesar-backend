"use client";

import { ReactNode } from "react";
import { CartProvider } from "../../context/CartContext";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
