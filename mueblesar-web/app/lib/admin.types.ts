export type Product = {
    id: number;
    storeId: number;
    name: string;
    slug: string;
    price: string | number;
    description?: string | null;
    category?: string | null;
    room?: string | null;
    style?: string | null;
    arUrl?: string | null;
    glbUrl?: string | null;
    usdzUrl?: string | null;
    imageUrl?: string | null;
    widthCm?: number | null;
    depthCm?: number | null;
    heightCm?: number | null;
    color?: string | null;
    inStock?: boolean | null;
    stockQty?: number | null;
    featured?: boolean | null;
    store?: { name?: string | null };
    images?: { url: string; type?: string }[];
};

export type ValidationResult = {
    ok: boolean;
    sizeCm: { width: number; depth: number; height: number };
    expected: { width?: number; depth?: number; height?: number };
    diffs: { width: number | null; depth: number | null; height: number | null };
    suggestion?: {
        dimension: "width" | "depth" | "height";
        factor: number;
        projectedSizeCm: { width: number; depth: number; height: number };
    } | null;
};

export type Store = { id: number; name: string };

export type SessionUser = {
    id: number;
    email: string;
    name?: string | null;
    role: "ADMIN" | "STORE";
    storeId?: number | null;
};

export type LoginState = {
    email: string;
    password: string;
};

export type StatsSummary = {
    totalSales: number;
    totalOrders: number;
    avgOrder: number;
    last30Sales: number;
    topProducts: { productId: number; name: string; storeName: string; totalSold: number; units: number }[];
    arTotal: number;
    arLast30: number;
    topArProducts: { productId: number; name: string; storeName: string; views: number }[];
    lowStock: { productId: number; name: string; stockQty: number; storeName: string }[];
};

export type FormState = {
    id?: number;
    storeId?: number;
    name: string;
    slug: string;
    description: string;
    category: string;
    room: string;
    style: string;
    color: string;
    featured: boolean;
    price: string;
    arUrl: string;
    glbUrl: string;
    usdzUrl: string;
    widthCm: string;
    depthCm: string;
    heightCm: string;
    imageUrl: string;
    images: { url: string; type?: string }[];
    inStock: boolean;
    stockQty: string;
};

export const emptyForm: FormState = {
    id: undefined,
    storeId: undefined,
    name: "",
    slug: "",
    description: "",
    category: "",
    room: "",
    style: "",
    color: "",
    featured: false,
    price: "",
    arUrl: "",
    glbUrl: "",
    usdzUrl: "",
    widthCm: "",
    depthCm: "",
    heightCm: "",
    imageUrl: "",
    images: [],
    inStock: true,
    stockQty: "",
};

export const isValidUrl = (value: string) => {
    if (!value) return false;

    // Check if it's our new JSON payload format { glb: "...url...", usdz: "...url..." }
    try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null && parsed.glb) {
            new URL(parsed.glb); // strictly validate the inner URL
            if (parsed.usdz) new URL(parsed.usdz);
            return true;
        }
    } catch {
        // Not a JSON string, fallback to standard plain string check
    }

    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

export const slugify = (input: string) => {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
};
