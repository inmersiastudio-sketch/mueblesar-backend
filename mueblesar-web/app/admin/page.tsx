"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Container } from "../components/layout/Container";
import { AI3DGenerator } from "../components/admin/AI3DGenerator";
import { ARPreview } from "../components/products/ARPreview";
import { fetchProducts } from "../lib/api";

type Product = {
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
  imageUrl?: string | null;
  widthCm?: number | null;
  depthCm?: number | null;
  heightCm?: number | null;
  color?: string | null;
  inStock?: boolean | null;
  stockQty?: number | null;
  featured?: boolean | null;
  store?: { name?: string | null };
  images?: { url: string; type?: string }[]; // include gallery images with color/type
};

type ValidationResult = {
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

type Store = { id: number; name: string };

type SessionUser = {
  id: number;
  email: string;
  name?: string | null;
  role: "ADMIN" | "STORE";
  storeId?: number | null;
};

type LoginState = {
  email: string;
  password: string;
};

type StatsSummary = {
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

type FormState = {
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
  widthCm: string;
  depthCm: string;
  heightCm: string;
  imageUrl: string;
  images: { url: string; type?: string }[]; // extra gallery with types/colors
  inStock: boolean;
  stockQty: string;
};

const emptyForm: FormState = {
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
  widthCm: "",
  depthCm: "",
  heightCm: "",
  imageUrl: "",
  images: [],
  inStock: true,
  stockQty: "",
};

const isValidUrl = (value: string) => {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const slugify = (input: string) => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export default function AdminPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [login, setLogin] = useState<LoginState>({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<number, ValidationResult | { error: string }>>({});
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formValidation, setFormValidation] = useState<ValidationResult | { error: string } | null>(null);
  const [formValidating, setFormValidating] = useState(false);
  const [stats, setStats] = useState<StatsSummary | null>(null);

  // taxonomy management
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [extraRooms, setExtraRooms] = useState<string[]>([]);
  const [extraStyles, setExtraStyles] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newStyle, setNewStyle] = useState("");
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // texto para filtrar productos
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterFeatured, setFilterFeatured] = useState<"" | "yes" | "no">("");
  const [filterInStock, setFilterInStock] = useState<"" | "yes" | "no">("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [pendingImportRows, setPendingImportRows] = useState<string[][]>([]);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showLogModal, setShowLogModal] = useState(false);
  const [logProductId, setLogProductId] = useState<number | null>(null);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logActionFilter, setLogActionFilter] = useState("");
  const [logFromFilter, setLogFromFilter] = useState("");
  const [logToFilter, setLogToFilter] = useState("");

  const exportCsv = () => {
    const items = sortedProducts; // export sorted/filtered list
    if (!items.length) return;
    const fields = [
      "id",
      "storeId",
      "name",
      "slug",
      "price",
      "category",
      "room",
      "style",
      "color",
      "widthCm",
      "depthCm",
      "heightCm",
      "arUrl",
      "imageUrl",
      "inStock",
      "stockQty",
    ];
    const header = fields.join(",");
    const rows = items.map((p) =>
      fields
        .map((f) => {
          const v = (p as any)[f];
          if (v == null) return "";
          return String(v).replace(/"/g, '""');
        })
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const hdr = lines[0].split(",").map((c) => c.replace(/"/g, "").trim());
      const rows = lines.slice(1).map((l) => l.split(",").map((v) => v.replace(/^"|"$/g, "").trim()));
      setPreviewHeaders(hdr);
      setPreviewRows(rows.slice(0, 10));
      setPendingImportRows(rows);
      setShowConfirmImport(true);
    };
    reader.readAsText(file);
  };

  const [sortField, setSortField] = useState<"" | "name" | "price" | "id">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001", []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/settings`, { credentials: "include" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Error loading settings", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error("Error saving setting", err);
    }
  };

  const categories = useMemo(() => {
    const derived = products.map((p) => p.category).filter((v): v is string => Boolean(v));
    return Array.from(new Set([...derived, ...extraCategories])).sort();
  }, [products, extraCategories]);

  const rooms = useMemo(() => {
    const derived = products.map((p) => p.room).filter((v): v is string => Boolean(v));
    return Array.from(new Set([...derived, ...extraRooms])).sort();
  }, [products, extraRooms]);

  const styles = useMemo(() => {
    const derived = products.map((p) => p.style).filter((v): v is string => Boolean(v));
    return Array.from(new Set([...derived, ...extraStyles])).sort();
  }, [products, extraStyles]);

  const clearTaxonomy = async (
    field: "category" | "room" | "style",
    value: string
  ) => {
    if (!confirm(`Eliminar \"${value}\" y limpiar los productos asociados?`)) return;
    const affected = products.filter((p) => (p as any)[field] === value);
    for (const p of affected) {
      await updateProductField(p.id, { [field]: undefined });
    }
    await loadProducts();
  };

  const filteredProducts = useMemo(() => {
    let arr = products;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      arr = arr.filter((p) => {
        return (
          p.name.toLowerCase().includes(term) ||
          String(p.id).includes(term) ||
          (p.slug && p.slug.toLowerCase().includes(term)) ||
          (p.category && p.category.toLowerCase().includes(term)) ||
          (p.room && p.room.toLowerCase().includes(term)) ||
          (p.store?.name && p.store.name.toLowerCase().includes(term))
        );
      });
    }
    if (filterCategory) {
      arr = arr.filter((p) => p.category === filterCategory);
    }
    if (filterRoom) {
      arr = arr.filter((p) => p.room === filterRoom);
    }
    if (filterFeatured) {
      arr = arr.filter((p) => (filterFeatured === "yes" ? p.featured : !p.featured));
    }
    if (filterInStock) {
      arr = arr.filter((p) => (filterInStock === "yes" ? p.inStock : !p.inStock));
    }
    return arr;
  }, [products, searchTerm, filterCategory, filterRoom, filterFeatured, filterInStock]);

  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts;
    const arr = [...filteredProducts];
    arr.sort((a, b) => {
      let va: any = a[sortField as keyof Product];
      let vb: any = b[sortField as keyof Product];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredProducts, sortField, sortDir]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, page]);

  useEffect(() => {
    // reset paging when filter/sort changes
    setPage(1);
  }, [searchTerm, sortField, sortDir, sortedProducts.length]);

  useEffect(() => {
    if (user?.storeId) {
      setForm((prev) => ({ ...prev, storeId: user.storeId ?? undefined }));
    }
  }, [user?.storeId]);

  useEffect(() => {
    if (user) {
      loadStats(user);
      loadSettings();
    } else {
      setStats(null);
      setSettings({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    // cargar tiendas públicas para selector
    fetch(`${apiBase}/api/stores`)
      .then((res) => res.json())
      .then((data) => setStores(data?.items ?? []))
      .catch(() => setStores([]));
  }, [apiBase]);

  useEffect(() => {
    const fetchSession = async () => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, { credentials: "include" });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        const nextUser = (data as { user?: SessionUser })?.user ?? (data as SessionUser | null);
        setUser(nextUser);
        if (nextUser?.storeId) {
          setForm((prev) => ({ ...prev, storeId: nextUser.storeId ?? undefined }));
        }
      } catch (err) {
        setAuthError((err as Error).message);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    fetchSession();
  }, [apiBase]);

  const loadStats = async (session?: SessionUser | null) => {
    const activeUser = session ?? user;
    if (!activeUser) {
      setError("Debes iniciar sesión");
      return;
    }
    setStatsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/stats`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        setError((data as { error?: string })?.error || `Error ${res.status}`);
        return;
      }
      setStats(data as StatsSummary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadProducts = async (session?: SessionUser | null) => {
    const activeUser = session ?? user;
    if (!activeUser) {
      setError("Debes iniciar sesión");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/products`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        setError((data as { error?: string })?.error || `Error ${res.status}`);
        return;
      }
      setProducts(data);
      setRowError({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    setError(null);
    setAuthLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(login),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError((data as { error?: string })?.error || "No se pudo iniciar sesión");
        setUser(null);
        return;
      }
      const nextUser = (data as { user?: SessionUser })?.user ?? (data as SessionUser | null);
      setUser(nextUser);
      if (nextUser?.storeId) {
        setForm((prev) => ({ ...prev, storeId: nextUser.storeId ?? undefined }));
      }
      setLogin({ email: "", password: "" });
      await loadStats(nextUser);
      await loadProducts(nextUser);
    } catch (err) {
      setAuthError((err as Error).message);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await fetch(`${apiBase}/api/auth/logout`, { credentials: "include" });
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setUser(null);
      setProducts([]);
      setValidation({});
      setRowError({});
      setForm(emptyForm);
      setFormValidation(null);
      setError(null);
      setStats(null);
      setAuthLoading(false);
    }
  };

  const clearFieldError = (field: keyof FormState) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validate = async (product: Product) => {
    if (!user) {
      setError("Debes iniciar sesión");
      return;
    }
    if (!product.arUrl) {
      setValidation((prev) => ({ ...prev, [product.id]: { error: "Sin arUrl" } }));
      return;
    }
    setValidation((prev) => ({ ...prev, [product.id]: { error: "Validando..." } }));
    setRowError((prev) => ({ ...prev, [product.id]: "" }));
    try {
      const tol = Number(settings.tolerance ?? "0.05") || 0.05;
      const res = await fetch(`${apiBase}/api/ar/validate-scale?tolerance=${tol}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          file: product.arUrl,
          widthCm: product.widthCm ?? undefined,
          depthCm: product.depthCm ?? undefined,
          heightCm: product.heightCm ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        setValidation((prev) => ({ ...prev, [product.id]: { error: data?.error || `Error ${res.status}` } }));
        if (data?.validation?.suggestion?.factor) {
          setRowError((prev) => ({ ...prev, [product.id]: `Sugiere factor ${data.validation.suggestion.factor.toFixed(3)}` }));
        }
        return;
      }
      setValidation((prev) => ({ ...prev, [product.id]: data }));
    } catch (err) {
      setValidation((prev) => ({ ...prev, [product.id]: { error: (err as Error).message } }));
    }
  };

  const onEdit = (p: Product) => {
    setForm({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      category: p.category ?? "",
      room: p.room ?? "",
      style: p.style ?? "",
      color: p.color ?? "",
      featured: Boolean(p.featured),
      price: String(p.price ?? ""),
      arUrl: p.arUrl ?? "",
      widthCm: p.widthCm ? String(p.widthCm) : "",
      depthCm: p.depthCm ? String(p.depthCm) : "",
      heightCm: p.heightCm ? String(p.heightCm) : "",
      imageUrl: p.imageUrl ?? "",
      images: p.images ? p.images.map((i) => ({ url: i.url, type: i.type || undefined })) : [],
      inStock: Boolean(p.inStock),
      stockQty: p.stockQty ? String(p.stockQty) : "",
    });
    setFormErrors({});
    setFormValidation(null);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setFormValidation(null);
  };

  const validateFormFields = () => {
    const errors: Record<string, string> = {};
    if (!form.storeId) errors.storeId = "Requerido";
    if (!form.name.trim()) errors.name = "Requerido";
    if (!form.slug.trim()) errors.slug = "Requerido";
    if (!form.description.trim()) errors.description = "Requerido";
    const priceVal = Number(form.price);
    if (!form.price || Number.isNaN(priceVal) || priceVal <= 0) errors.price = "Precio inválido";
    const checkPositive = (value: string, field: keyof FormState) => {
      if (!value) return;
      const num = Number(value);
      if (Number.isNaN(num) || num <= 0) errors[field] = "Debe ser mayor a 0";
    };
    checkPositive(form.widthCm, "widthCm");
    checkPositive(form.depthCm, "depthCm");
    checkPositive(form.heightCm, "heightCm");
    if (form.arUrl && !isValidUrl(form.arUrl)) errors.arUrl = "URL inválida";
    if (form.imageUrl && !isValidUrl(form.imageUrl)) errors.imageUrl = "URL inválida";
    form.images.forEach((img, idx) => {
      if (img.url && !isValidUrl(img.url)) {
        errors[`images.${idx}.url`] = "URL inválida";
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateFormScale = async () => {
    if (!user) {
      setError("Debes iniciar sesión");
      return;
    }
    if (!form.arUrl || (!form.widthCm && !form.depthCm && !form.heightCm)) {
      setFormValidation({ error: "Necesita AR URL y al menos una dimensión" });
      return;
    }
    setFormValidating(true);
    setFormValidation(null);
    try {
      const tol = Number(settings.tolerance ?? "0.05") || 0.05;
      const res = await fetch(`${apiBase}/api/ar/validate-scale?tolerance=${tol}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          file: form.arUrl,
          widthCm: form.widthCm ? Number(form.widthCm) : undefined,
          depthCm: form.depthCm ? Number(form.depthCm) : undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        setFormValidation({ error: data?.error || `Error ${res.status}` });
        return;
      }
      setFormValidation(data);
    } catch (err) {
      setFormValidation({ error: (err as Error).message });
    } finally {
      setFormValidating(false);
    }
  };

  const updateProductField = async (id: number, patch: Partial<Product>) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      await loadProducts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const loadProductLogs = async (prodId: number) => {
    setLogLoading(true);
    setLogEntries([]);
    setLogProductId(prodId);
    try {
      const params = new URLSearchParams();
      if (logActionFilter) params.set("action", logActionFilter);
      if (logFromFilter) params.set("from", `${logFromFilter}T00:00:00.000Z`);
      if (logToFilter) params.set("to", `${logToFilter}T23:59:59.999Z`);
      const q = params.toString();
      const res = await fetch(`${apiBase}/api/admin/products/${prodId}/logs${q ? `?${q}` : ""}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLogEntries(data);
        setShowLogModal(true);
      } else {
        console.error("failed loading logs", res.status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogLoading(false);
    }
  };

  const applyBulkAction = async (action: "delete" | "featured" | "unfeatured" | "inStock" | "outStock") => {
    if (!selectedIds.size) return;
    if (action === "delete" && !confirm(`¿Borrar ${selectedIds.size} productos?`)) return;
    for (const id of Array.from(selectedIds)) {
      if (action === "delete") {
        await fetch(`${apiBase}/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
      } else if (action === "featured") {
        await updateProductField(id, { featured: true });
      } else if (action === "unfeatured") {
        await updateProductField(id, { featured: false });
      } else if (action === "inStock") {
        await updateProductField(id, { inStock: true });
      } else if (action === "outStock") {
        await updateProductField(id, { inStock: false });
      }
    }
    setSelectedIds(new Set());
  };

  const submitForm = async () => {
    if (!user) {
      setError("Debes iniciar sesión");
      return;
    }
    if (!validateFormFields()) {
      setError("Revisa los campos marcados en rojo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        storeId: form.storeId ? Number(form.storeId) : undefined,
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        category: form.category || undefined,
        room: form.room || undefined,
        style: form.style || undefined,
        color: form.color || undefined,
        featured: form.featured,
        price: form.price ? Number(form.price) : 0,
        arUrl: form.arUrl || undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        depthCm: form.depthCm ? Number(form.depthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        imageUrl: form.imageUrl || undefined,
        images: form.images
          .filter((i) => i.url)
          .map((i) => ({ url: i.url, type: i.type || undefined })),
        inStock: form.inStock,
        stockQty: form.stockQty ? Number(form.stockQty) : undefined,
      };
      const isEdit = Boolean(form.id);
      const tol = Number(settings.tolerance ?? "0.05") || 0.05;
      const baseUrl = isEdit ? `${apiBase}/api/admin/products/${form.id}` : `${apiBase}/api/admin/products`;
      const url = `${baseUrl}?tolerance=${tol}`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setUser(null);
        setError("Sesión expirada");
        return;
      }
      if (!res.ok) {
        let msg = data?.error || `Error ${res.status}`;
        if (data?.details) {
          msg += " " + JSON.stringify(data.details);
        }
        setError(msg);
        // mostrar sugerencia por fila si es validación de escala
        if (data?.validation?.suggestion?.factor && form.id) {
          setRowError((prev) => ({ ...prev, [form.id!]: `Sugiere factor ${data.validation.suggestion.factor.toFixed(3)}` }));
        }
        return;
      }
      await loadProducts();
      resetForm();
      setFormValidation(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-10">
      <Container>
        {previewImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setPreviewImageUrl(null)}
          >
            <img src={previewImageUrl} className="max-h-[90%] max-w-[90%]" />
          </div>
        )}
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Historial producto #{logProductId}</h3>
                <button className="text-gray-600" onClick={() => setShowLogModal(false)}>×</button>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                >
                  <option value="">Acción</option>
                  <option value="create">create</option>
                  <option value="update">update</option>
                  <option value="delete">delete</option>
                </select>
                <Input type="date" value={logFromFilter} onChange={(e) => setLogFromFilter(e.target.value)} />
                <Input type="date" value={logToFilter} onChange={(e) => setLogToFilter(e.target.value)} />
                <Button variant="secondary" onClick={() => logProductId && loadProductLogs(logProductId)}>
                  Filtrar
                </Button>
              </div>
              {logLoading ? (
                <p>Cargando...</p>
              ) : logEntries.length === 0 ? (
                <p className="text-sm text-slate-600">No hay registros</p>
              ) : (
                <ul className="text-sm space-y-2 max-h-80 overflow-y-auto">
                  {logEntries.map((entry: any) => (
                    <li key={entry.id} className="border-b pb-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">{entry.action}</span>
                        <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-600">por {entry.actor ?? entry.userName ?? entry.userEmail ?? "desconocido"}</div>
                      {entry.data?.summary && <div className="text-xs mt-1">{entry.data.summary}</div>}
                      {entry.data?.changedFields?.length ? (
                        <div className="text-xs mt-1">Campos: {entry.data.changedFields.join(", ")}</div>
                      ) : null}
                      {entry.data && <pre className="text-xs bg-slate-100 p-1 mt-1 overflow-x-auto">{JSON.stringify(entry.data, null, 2)}</pre>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin productos</h1>
              <p className="text-sm text-slate-600">Inicia sesión para listar y validar modelos.</p>
            </div>
            {user ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => loadProducts(user)} disabled={loading || authLoading}>
                  {loading ? "Cargando..." : "Actualizar"}
                </Button>
                <Button variant="ghost" onClick={handleLogout} disabled={authLoading}>
                  Cerrar sesión
                </Button>
              </div>
            ) : null}
          </div>

          {authLoading ? (
            <p className="text-sm text-slate-600">Verificando sesión...</p>
          ) : user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900">{user.email}</span>
                <span className="text-xs text-slate-600">Rol: {user.role}{user.storeId ? ` · Tienda ${user.storeId}` : ""}</span>
              </div>
              <Button variant="secondary" onClick={() => loadProducts(user)} disabled={loading}>
                {loading ? "Cargando..." : products.length ? "Actualizar" : "Cargar productos"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">Email</p>
                <Input
                  value={login.email}
                  onChange={(e) => setLogin((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">Contraseña</p>
                <Input
                  type="password"
                  value={login.password}
                  onChange={(e) => setLogin((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleLogin} disabled={authLoading || !login.email || !login.password}>
                  {authLoading ? "Ingresando..." : "Entrar"}
                </Button>
              </div>
            </div>
          )}

          {!user && (
            <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
              <Link href="/recuperar-contrasena" className="font-semibold text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
              <span>
                ¿Nueva mueblería?{" "}
                <Link href="/registrar" className="font-semibold text-primary hover:underline">
                  Registrate aquí
                </Link>
              </span>
            </div>
          )}

          {authError && <p className="text-sm font-semibold text-red-600">{authError}</p>}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>

        {user && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
                <p className="text-sm text-slate-600">Ventas y stock recientes</p>
              </div>
              <Button variant="secondary" onClick={() => loadStats(user)} disabled={statsLoading}>
                {statsLoading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>

            {stats ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">Ventas totales</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">${stats.totalSales.toLocaleString("es-AR")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">Pedidos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">Ticket promedio</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">${stats.avgOrder.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">Ventas últimos 30 días</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">${stats.last30Sales.toLocaleString("es-AR")}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Top productos</p>
                      <span className="text-xs text-slate-500">({stats.topProducts.length || 0})</span>
                    </div>
                    {stats.topProducts.length === 0 ? (
                      <p className="text-sm text-slate-600">Sin datos de ventas</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm text-slate-800">
                        {stats.topProducts.map((p) => (
                          <li key={p.productId} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-semibold text-slate-900">{p.name}</p>
                              <p className="text-xs text-slate-600">{p.storeName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">${p.totalSold.toLocaleString("es-AR")}</p>
                              <p className="text-xs text-slate-600">{p.units} uds</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Vistas AR</p>
                      <span className="text-xs text-slate-500">{stats.arLast30} (30d)</span>
                    </div>
                    <div className="mb-3 text-sm text-slate-600">Total: {stats.arTotal}</div>
                    {stats.topArProducts.length === 0 ? (
                      <p className="text-sm text-slate-600">Sin vistas AR registradas</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm text-slate-800">
                        {stats.topArProducts.map((p) => (
                          <li key={p.productId} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-semibold text-slate-900">{p.name}</p>
                              <p className="text-xs text-slate-600">{p.storeName}</p>
                            </div>
                            <p className="text-xs font-semibold text-emerald-700">{p.views} vistas</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">Stock bajo</p>
                      <span className="text-xs text-slate-500">({stats.lowStock.length || 0})</span>
                    </div>
                    {stats.lowStock.length === 0 ? (
                      <p className="text-sm text-slate-600">Sin alertas</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-sm text-slate-800">
                        {stats.lowStock.map((p) => (
                          <li key={p.productId} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-semibold text-slate-900">{p.name}</p>
                              <p className="text-xs text-slate-600">{p.storeName}</p>
                            </div>
                            <p className="text-xs font-semibold text-amber-700">{p.stockQty} uds</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">{statsLoading ? "Cargando resumen..." : "Sin datos todavía"}</p>
            )}
          </div>
        )}

        {user && (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Configuración global</h2>
                {loadingSettings && <span className="text-xs text-slate-500">Cargando...</span>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Tolerancia AR (0‑1)</p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.tolerance ?? "0.05"}
                    onChange={(e) => setSettings((s) => ({ ...s, tolerance: e.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    className="mt-2"
                    onClick={() => saveSetting("tolerance", settings.tolerance ?? "0.05")}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {!user ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <p>Inicia sesión para crear, editar o validar productos.</p>
          </div>
        ) : (
          <>
            {/* Additional Dashboard Widgets can go here in the future */}
          </>
        )}
      </Container>
    </div>
  );
}