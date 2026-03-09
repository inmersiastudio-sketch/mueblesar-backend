// ============================================
// Core Domain Types - Strict TypeScript
// ============================================

export interface ProductImage {
  id: number;
  url: string;
  altText?: string | null;
  position?: number | null;
  type?: string | null;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socialInstagram?: string | null;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  category: string | null;
  room: string | null;
  style: string | null;
  imageUrl?: string | null;
  /** @deprecated Use glbUrl instead - kept for backward compatibility */
  arUrl?: string | null;
  /** GLB model URL for Android/Web AR */
  glbUrl?: string | null;
  /** USDZ model URL for iOS AR Quick Look */
  usdzUrl?: string | null;
  images?: ProductImage[];
  store?: Store;
  featured?: boolean;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  weightKg?: number | null;
  material?: string | null;
  color?: string | null;
  inStock?: boolean;
  stockQty?: number | null;
}

// ============================================
// API Response Types
// ============================================

export interface ProductsResponse {
  items: Product[];
  total: number;
  page?: number;
  pageSize?: number;
  source?: string;
}

export interface StoresResponse {
  items: Store[];
  total: number;
  source?: string;
}

export type ProductResponse = Product & { source?: string };

export interface StoreDetailResponse {
  store: Store;
  products: Product[];
  source?: string;
}

// ============================================
// Filter Types
// ============================================

export interface ProductFilters {
  q?: string;
  category?: string;
  room?: string;
  style?: string;
  store?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
  sort?: "price" | "createdAt";
  direction?: "asc" | "desc";
  arOnly?: boolean;
}

export interface StoreFilters {
  q?: string;
}

// ============================================
// UI/Component Types
// ============================================

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  storeId?: number | null;
  storeName?: string | null;
}

export interface FavoriteItem {
  id: number;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  category?: string | null;
  room?: string | null;
  style?: string | null;
  description?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
}
