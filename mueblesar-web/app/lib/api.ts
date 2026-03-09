import type {
  Product,
  ProductsResponse,
  Store,
  StoresResponse,
  StoreDetailResponse,
  ProductResponse,
  ProductFilters,
  StoreFilters,
} from "@/types";

// API base URL - MUST be configured in production
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable is required");
}

// ============ Catalog Types ============

export type CatalogStore = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  whatsapp?: string | null;
  whatsappNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
};

export type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  category?: string | null;
  room?: string | null;
  style?: string | null;
  imageUrl?: string | null;
  images?: { url: string; altText?: string | null; position?: number; type?: string | null }[];
  arUrl?: string | null;
  glbUrl?: string | null;
  usdzUrl?: string | null;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  inStock?: boolean;
  featured?: boolean;
  material?: string | null;
  color?: string | null;
};

export type CatalogPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CatalogResponse = {
  store: CatalogStore;
  products: CatalogProduct[];
  pagination: CatalogPagination;
};

export type CatalogProductResponse = CatalogProduct & {
  store: CatalogStore;
};

const buildQuery = (filters: ProductFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === null) return;
    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      return;
    }
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/products${buildQuery(filters)}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Bad status ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error("Failed to fetch products", error);
    return { items: [], total: 0 };
  }
}

export async function fetchStores(filters: StoreFilters = {}): Promise<StoresResponse> {
  try {
    const qs = filters.q ? `?q=${encodeURIComponent(filters.q)}` : "";
    const res = await fetch(
      `${API_BASE}/api/stores${qs}`,
      filters.q ? { cache: "no-store" } : { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Failed to fetch stores", error);
    return { items: [], total: 0 };
  }
}

export async function fetchStoreBySlug(slug: string): Promise<StoreDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stores/${slug}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch store ${slug}`, error);
    return null;
  }
}

export async function fetchProductBySlug(slug: string): Promise<ProductResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products/${slug}`, { next: { revalidate: 0 } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch product ${slug}`, error);
    return null;
  }
}

// ============ Public Catalog API ============

export interface CatalogFilters {
  category?: string;
  room?: string;
  style?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  arOnly?: boolean;
  sort?: "price" | "createdAt";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchCatalogBySlug(
  slug: string,
  filters: CatalogFilters = {}
): Promise<{ data: CatalogResponse } | null> {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.room) params.append("room", filters.room);
    if (filters.style) params.append("style", filters.style);
    if (filters.search) params.append("search", filters.search);
    if (filters.priceMin !== undefined) params.append("priceMin", String(filters.priceMin));
    if (filters.priceMax !== undefined) params.append("priceMax", String(filters.priceMax));
    if (filters.arOnly) params.append("arOnly", "true");
    if (filters.sort) params.append("sort", filters.sort);
    if (filters.direction) params.append("direction", filters.direction);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.pageSize) params.append("pageSize", String(filters.pageSize));

    const queryString = params.toString();
    const url = `${API_BASE}/api/catalog/${slug}${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      next: { revalidate: 60 } // Cache for 1 minute
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch catalog ${slug}`, error);
    return null;
  }
}

export async function fetchCatalogProduct(storeSlug: string, productSlug: string): Promise<CatalogProductResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/catalog/${storeSlug}/${productSlug}`, {
      next: { revalidate: 60 }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch catalog product ${storeSlug}/${productSlug}`, error);
    return null;
  }
}


