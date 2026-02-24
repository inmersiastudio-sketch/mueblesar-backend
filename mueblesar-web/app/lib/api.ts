const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3001";

export type ProductImage = {
  id: number;
  url: string;
  altText?: string;
  position?: number;
  type?: string;
};

export type Store = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  whatsapp?: string;
  address?: string;
};

export type Product = {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  room: string;
  style: string;
  imageUrl?: string;
  arUrl?: string;
  images?: ProductImage[];
  store?: Store;
  featured?: boolean;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  material?: string;
  color?: string;
};

type ProductsResponse = {
  items: Product[];
  total: number;
  page?: number;
  pageSize?: number;
  source?: string;
};

type StoresResponse = {
  items: Store[];
  total: number;
  source?: string;
};

type ProductResponse = Product & { source?: string };

type ProductFilters = {
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
};

type StoreFilters = {
  q?: string;
};

type StoreDetailResponse = {
  store: Store;
  products: Product[];
  source?: string;
};

const buildQuery = (filters: ProductFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === null) return;
    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      return; // omit false to let backend default apply
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
    const res = await fetch(`${API_BASE}/api/stores${qs}`, filters.q ? { cache: "no-store" } : { next: { revalidate: 60 } });
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
