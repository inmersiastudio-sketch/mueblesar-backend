"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { FileUpload } from "../../components/ui/FileUpload";
import { Container } from "../../components/layout/Container";
import { AI3DGenerator } from "../../components/admin/AI3DGenerator";
import { ARPreview } from "../../components/products/ARPreview";
import { fetchProducts } from "../../lib/api";
import { ProductLogModal } from "../../components/admin/inventory/ProductLogModal";

import {
  Product,
  ValidationResult,
  Store,
  SessionUser,
  LoginState,
  StatsSummary,
  FormState,
  emptyForm,
  isValidUrl,
  slugify,
} from "../../lib/admin.types";

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
      loadProducts(user);
    } else {
      setStats(null);
      setSettings({});
      setProducts([]);
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

  const showProductLogs = (prodId: number) => {
    setLogProductId(prodId);
    setShowLogModal(true);
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
        {showLogModal && logProductId && (
          <ProductLogModal
            productId={logProductId}
            apiBase={apiBase}
            onClose={() => setShowLogModal(false)}
          />
        )}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
              <p className="text-sm text-slate-600">Gestión de productos, modelos 3D y stock.</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Taxonomías</h2>
            <p className="text-sm text-slate-600">Administrar categorías, ambientes y estilos usados en productos</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-800">Categorías</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {categories.map((c) => (
                  <span key={c} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {c}
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => clearTaxonomy("category", c)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Nuevo..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const v = newCategory.trim();
                    if (v && !categories.includes(v)) {
                      setExtraCategories((prev) => [...prev, v]);
                    }
                    setNewCategory("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Ambientes</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {rooms.map((c) => (
                  <span key={c} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {c}
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => clearTaxonomy("room", c)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Nuevo..."
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const v = newRoom.trim();
                    if (v && !rooms.includes(v)) {
                      setExtraRooms((prev) => [...prev, v]);
                    }
                    setNewRoom("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Estilos</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {styles.map((c) => (
                  <span key={c} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {c}
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => clearTaxonomy("style", c)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Nuevo..."
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const v = newStyle.trim();
                    if (v && !styles.includes(v)) {
                      setExtraStyles((prev) => [...prev, v]);
                    }
                    setNewStyle("");
                  }}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Crear / editar producto</div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Tienda</p>
              <select
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.storeId ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-primary"}`}
                value={form.storeId ?? ""}
                disabled={user?.role === "STORE"}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  setForm((f) => ({ ...f, storeId: value }));
                  clearFieldError("storeId");
                }}
              >
                <option value="">Seleccionar</option>
                {(user?.role === "STORE" && user.storeId ? stores.filter((s) => s.id === user.storeId) : stores).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {formErrors.storeId && <p className="mt-1 text-xs text-red-600">{formErrors.storeId}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Nombre</p>
              <Input
                className={formErrors.name ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setForm((f) => {
                    const next = { ...f, name: newName };
                    // auto-generate slug when field is empty or matches previous slugified name
                    if (!f.slug || slugify(f.slug) === slugify(f.name)) {
                      next.slug = slugify(newName);
                    }
                    return next;
                  });
                  clearFieldError("name");
                }}
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Slug</p>
              <Input
                className={formErrors.slug ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.slug}
                onChange={(e) => {
                  setForm((f) => ({ ...f, slug: e.target.value }));
                  clearFieldError("slug");
                }}
              />
              {formErrors.slug && <p className="mt-1 text-xs text-red-600">{formErrors.slug}</p>}
            </div>
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold text-slate-700">Descripción</p>
              <textarea
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.description ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 focus:border-primary"}`}
                rows={2}
                value={form.description}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  clearFieldError("description");
                }}
              />
              {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Precio</p>
              <Input
                type="number"
                className={formErrors.price ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.price}
                onChange={(e) => {
                  setForm((f) => ({ ...f, price: e.target.value }));
                  clearFieldError("price");
                }}
              />
              {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Categoría</p>
              <Input list="categories-list" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              <datalist id="categories-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Ambiente</p>
              <Input list="rooms-list" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} />
              <datalist id="rooms-list">
                {rooms.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Estilo</p>
              <Input list="styles-list" value={form.style} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))} />
              <datalist id="styles-list">
                {styles.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Color (CSS, puede ser varios separados por coma)</p>
              <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">AR URL (GLB/USDZ)</p>
              <div className="flex gap-2">
                <Input
                  className={`flex-1 ${formErrors.arUrl ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                  value={form.arUrl}
                  placeholder="https://...modelo.glb"
                  onChange={(e) => {
                    setForm((f) => ({ ...f, arUrl: e.target.value }));
                    clearFieldError("arUrl");
                  }}
                />
                <FileUpload
                  apiBase={apiBase}
                  endpoint="/api/upload/model"
                  accept=".glb,.usdz"
                  buttonText="Subir Modelo"
                  onUploadSuccess={(url) => {
                    setForm((f) => ({ ...f, arUrl: url }));
                    clearFieldError("arUrl");
                  }}
                />
              </div>
              {formErrors.arUrl && <p className="mt-1 text-xs text-red-600">{formErrors.arUrl}</p>}
            </div>

            {/* AI 3D Generation */}
            {form.id && (
              <div className="sm:col-span-2 lg:col-span-3">
                <AI3DGenerator
                  productId={form.id}
                  productName={form.name || "Product"}
                  currentImageUrl={form.imageUrl}
                  currentArUrl={form.arUrl}
                  onSuccess={(glbUrl) => {
                    setForm((f) => ({ ...f, arUrl: glbUrl }));
                    // Refresh products list
                    fetchProducts();
                  }}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Imagen principal (URL)</p>
              <div className="flex gap-2">
                <Input
                  className={`flex-1 ${formErrors.imageUrl ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
                  value={form.imageUrl}
                  placeholder="https://..."
                  onChange={(e) => {
                    setForm((f) => ({ ...f, imageUrl: e.target.value }));
                    clearFieldError("imageUrl");
                  }}
                />
                <FileUpload
                  apiBase={apiBase}
                  endpoint="/api/upload/image"
                  accept="image/*"
                  buttonText="Subir Imagen"
                  onUploadSuccess={(url) => {
                    setForm((f) => ({ ...f, imageUrl: url }));
                    clearFieldError("imageUrl");
                  }}
                />
              </div>
              {formErrors.imageUrl && <p className="mt-1 text-xs text-red-600">{formErrors.imageUrl}</p>}
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold text-slate-700">Galería (uno por línea con color opcional)</p>
              {(form.images ?? []).map((img, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <Input
                    placeholder="URL"
                    value={img.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm((f) => {
                        const imgs = [...f.images];
                        imgs[idx] = { ...imgs[idx], url };
                        return { ...f, images: imgs };
                      });
                    }}
                  />
                  <Input
                    placeholder="Color (ej. rojo)"
                    value={img.type || ""}
                    onChange={(e) => {
                      const type = e.target.value;
                      setForm((f) => {
                        const imgs = [...f.images];
                        imgs[idx] = { ...imgs[idx], type };
                        return { ...f, images: imgs };
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        images: f.images.filter((_, i) => i !== idx),
                      }));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button size="md" onClick={() => setForm((f) => ({ ...f, images: [...f.images, { url: "", type: "" }] }))}>
                Agregar imagen
              </Button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Ancho (cm)</p>
              <Input
                type="number"
                className={formErrors.widthCm ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.widthCm}
                onChange={(e) => {
                  setForm((f) => ({ ...f, widthCm: e.target.value }));
                  clearFieldError("widthCm");
                }}
              />
              {formErrors.widthCm && <p className="mt-1 text-xs text-red-600">{formErrors.widthCm}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Profundidad (cm)</p>
              <Input
                type="number"
                className={formErrors.depthCm ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.depthCm}
                onChange={(e) => {
                  setForm((f) => ({ ...f, depthCm: e.target.value }));
                  clearFieldError("depthCm");
                }}
              />
              {formErrors.depthCm && <p className="mt-1 text-xs text-red-600">{formErrors.depthCm}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Altura (cm)</p>
              <Input
                type="number"
                className={formErrors.heightCm ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.heightCm}
                onChange={(e) => {
                  setForm((f) => ({ ...f, heightCm: e.target.value }));
                  clearFieldError("heightCm");
                }}
              />
              {formErrors.heightCm && <p className="mt-1 text-xs text-red-600">{formErrors.heightCm}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              Destacado
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
              />
              Disponible
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-700">Cantidad en stock</p>
              <Input
                type="number"
                value={form.stockQty}
                onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={submitForm}
                disabled={!user || saving || !form.storeId || !form.name || !form.slug || !form.description || !form.price}
              >
                {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear"}
              </Button>
              {form.id && (
                <Button variant="ghost" onClick={resetForm} disabled={saving}>
                  Cancelar
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={validateFormScale}
                disabled={!user || formValidating || !form.arUrl || (!form.widthCm && !form.depthCm && !form.heightCm)}
              >
                {formValidating ? "Validando..." : "Probar escala"}
              </Button>
            </div>
            {formValidation && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {"error" in formValidation ? (
                  <p className="font-semibold text-red-600">{formValidation.error}</p>
                ) : formValidation.ok ? (
                  <p className="font-semibold text-emerald-700">Escala OK</p>
                ) : (
                  <p className="font-semibold text-amber-700">Escala NO coincide</p>
                )}
                {"error" in formValidation ? null : (
                  <div className="mt-1 flex flex-wrap gap-3 text-slate-700">
                    <span>GLB: {formValidation.sizeCm.width}×{formValidation.sizeCm.depth}×{formValidation.sizeCm.height} cm</span>
                    <span>Esperado: {formValidation.expected.width ?? "?"}×{formValidation.expected.depth ?? "?"}×{formValidation.expected.height ?? "?"} cm</span>
                    {formValidation.suggestion && (
                      <span className="font-semibold">Sugerido factor: {formValidation.suggestion.factor.toFixed(3)}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Categoría</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
              >
                <option value="">Ambiente</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={filterFeatured}
                onChange={(e) => setFilterFeatured(e.target.value as any)}
              >
                <option value="">Destacado</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={filterInStock}
                onChange={(e) => setFilterInStock(e.target.value as any)}
              >
                <option value="">Stock</option>
                <option value="yes">En stock</option>
                <option value="no">Agotado</option>
              </select>
              <Button variant="secondary" onClick={exportCsv} disabled={!products.length}>
                Exportar CSV
              </Button>
              <input
                type="file"
                accept="text/csv"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Importar CSV
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap mt-2 items-center">
              {selectedIds.size > 0 && (
                <span className="font-semibold text-emerald-700 text-sm mr-2">
                  {selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}
                </span>
              )}
              <Button variant="ghost" onClick={() => applyBulkAction("featured")} disabled={!selectedIds.size}>
                Marcar destacados
              </Button>
              <Button variant="ghost" onClick={() => applyBulkAction("unfeatured")} disabled={!selectedIds.size}>
                Quitar destacado
              </Button>
              <Button variant="ghost" onClick={() => applyBulkAction("inStock")} disabled={!selectedIds.size}>
                Marcar en stock
              </Button>
              <Button variant="ghost" onClick={() => applyBulkAction("outStock")} disabled={!selectedIds.size}>
                Marcar sin stock
              </Button>
              <Button variant="secondary" onClick={() => applyBulkAction("delete")} disabled={!selectedIds.size}>
                Borrar seleccionados
              </Button>
            </div>
            {importErrors.length > 0 && (
              <div className="text-xs text-red-600">
                <p>Errores durante importación:</p>
                <ul className="list-disc ml-5">
                  {importErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {showConfirmImport && (
              <div className="border-t border-slate-200 pt-2">
                <p className="text-sm font-semibold">Vista previa de importación</p>
                <div className="overflow-x-auto mt-1 text-xs">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        {previewHeaders.map((h) => (
                          <th key={h} className="px-2 py-1 bg-slate-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((v, ci) => (
                            <td key={ci} className="px-2 py-1">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      setShowConfirmImport(false);
                      const hdr = previewHeaders;
                      const itemsPayload = pendingImportRows.map((vals) => {
                        const obj: any = {};
                        hdr.forEach((h, idx) => {
                          obj[h] = vals[idx] ?? "";
                        });
                        return {
                          id: obj.id ? Number(obj.id) : undefined,
                          storeId: obj.storeId ? Number(obj.storeId) : undefined,
                          name: obj.name,
                          slug: obj.slug,
                          description: obj.description || undefined,
                          category: obj.category || undefined,
                          room: obj.room || undefined,
                          style: obj.style || undefined,
                          color: obj.color || undefined,
                          price: obj.price ? Number(obj.price) : 0,
                          arUrl: obj.arUrl || undefined,
                          widthCm: obj.widthCm ? Number(obj.widthCm) : undefined,
                          depthCm: obj.depthCm ? Number(obj.depthCm) : undefined,
                          heightCm: obj.heightCm ? Number(obj.heightCm) : undefined,
                          imageUrl: obj.imageUrl || undefined,
                          stockQty: obj.stockQty ? Number(obj.stockQty) : undefined,
                          inStock: obj.inStock === "1" || obj.inStock === "true",
                        };
                      });

                      try {
                        const res = await fetch(`${apiBase}/api/admin/products/bulk`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify(itemsPayload),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setImportErrors([data.error || "Falla en importar", data.detail || ""]);
                        } else {
                          setImportErrors([]);
                        }
                      } catch (err) {
                        setImportErrors([(err as Error).message]);
                      }

                      await loadProducts();
                    }}
                  >
                    Confirmar importación
                  </Button>
                  <Button variant="ghost" onClick={() => setShowConfirmImport(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={pagedProducts.length > 0 && pagedProducts.every((p) => selectedIds.has(p.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) => {
                          const nxt = new Set(prev);
                          pagedProducts.forEach((p) => {
                            if (checked) nxt.add(p.id);
                            else nxt.delete(p.id);
                          });
                          return nxt;
                        });
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 cursor-pointer" onClick={() => {
                    const field: any = "name";
                    if (sortField === field) {
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    } else {
                      setSortField(field);
                      setSortDir("asc");
                    }
                  }}>
                    Nombre {sortField === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-4 py-3">Tienda</th>
                  <th className="px-4 py-3 cursor-pointer" onClick={() => {
                    const field: any = "price";
                    if (sortField === field) {
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    } else {
                      setSortField(field);
                      setSortDir("asc");
                    }
                  }}>
                    Precio {sortField === "price" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-4 py-3">Media</th>
                  <th className="px-4 py-3">Dimensiones</th>
                  <th className="px-4 py-3">Meta</th>
                  <th className="px-4 py-3">Validación</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={8}>
                      {loading ? "Cargando..." : "Sin productos"}
                    </td>
                  </tr>
                )}
                {pagedProducts.map((p) => {
                  const val = validation[p.id];
                  const valText = val
                    ? "error" in val
                      ? val.error
                      : val.ok
                        ? "Escala OK"
                        : "Escala NO"
                    : "-";
                  return (
                    <tr key={p.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.has(p.id) ? "bg-blue-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedIds((prev) => {
                              const nxt = new Set(prev);
                              if (checked) nxt.add(p.id);
                              else nxt.delete(p.id);
                              return nxt;
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{p.name}</span>
                            {p.featured ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Destacado</span>
                            ) : null}
                          </div>
                          {p.description ? <p className="text-xs text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">{p.description}</p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">{p.store?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700 align-top">${typeof p.price === "string" ? p.price : p.price.toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-10 w-10 object-cover rounded cursor-pointer"
                              onClick={() => setPreviewImageUrl(p.imageUrl ?? null)}
                            />
                          ) : null}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full px-2 py-1 ${p.arUrl ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {p.arUrl ? "AR" : "Sin AR"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        {p.widthCm ?? "?"}×{p.depthCm ?? "?"}×{p.heightCm ?? "?"} cm
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {p.category && <span className="rounded-full bg-slate-100 px-2 py-1">Cat: {p.category}</span>}
                          {p.room && <span className="rounded-full bg-slate-100 px-2 py-1">Amb: {p.room}</span>}
                          {p.style && <span className="rounded-full bg-slate-100 px-2 py-1">Est: {p.style}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className={
                            "font-semibold " +
                            (valText.includes("OK")
                              ? "text-emerald-700"
                              : valText.includes("NO")
                                ? "text-amber-700"
                                : valText.includes("error")
                                  ? "text-red-600"
                                  : "text-slate-700")
                          }>
                            {valText.includes("OK") && "✅ "}
                            {valText.includes("NO") && "⚠️ "}
                            {valText.includes("error") && "❌ "}
                            {valText}
                          </span>
                          {rowError[p.id] && <span className="text-amber-700">{rowError[p.id]}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button size="md" variant="secondary" onClick={() => validate(p)} disabled={!user || loading}>
                            Validar
                          </Button>
                          <Button variant="ghost" onClick={() => showProductLogs(p.id)}>
                            Logs
                          </Button>
                          {p.arUrl && (
                            <ARPreview
                              arUrl={p.arUrl}
                              productId={p.id}
                              productName={p.name}
                              widthCm={p.widthCm ?? undefined}
                              depthCm={p.depthCm ?? undefined}
                              heightCm={p.heightCm ?? undefined}
                            />
                          )}
                          <Button size="md" variant="ghost" onClick={() => onEdit(p)} disabled={!user || loading}>
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            title={p.featured ? "Quitar destacado" : "Marcar como destacado"}
                            onClick={() => updateProductField(p.id, { featured: !p.featured })}
                            disabled={!user || loading}
                          >
                            {p.featured ? "★" : "☆"}
                          </Button>
                          <Button
                            variant="ghost"
                            title={p.inStock ? "Marcar como sin stock" : "Marcar en stock"}
                            onClick={() => updateProductField(p.id, { inStock: !p.inStock })}
                            disabled={!user || loading}
                          >
                            {p.inStock ? "✓" : "✗"}
                          </Button>
                          <Button
                            variant="ghost"
                            title="Actualizar stock"
                            onClick={async () => {
                              const ans = prompt("Nueva cantidad en stock", String(p.stockQty ?? ""));
                              if (ans === null) return;
                              const qty = Number(ans);
                              if (Number.isNaN(qty)) {
                                alert("Cantidad inválida");
                                return;
                              }
                              await updateProductField(p.id, { stockQty: qty });
                            }}
                            disabled={!user || loading}
                          >
                            🧾
                          </Button>
                          <Button
                            size="md"
                            variant="ghost"
                            onClick={async () => {
                              if (!user) {
                                setError("Debes iniciar sesión");
                                return;
                              }
                              if (!confirm("¿Borrar producto?")) return;
                              try {
                                const res = await fetch(`${apiBase}/api/admin/products/${p.id}`, {
                                  method: "DELETE",
                                  credentials: "include",
                                });
                                if (res.status === 401) {
                                  setUser(null);
                                  setError("Sesión expirada");
                                  return;
                                }
                                if (!res.ok) throw new Error(`Error ${res.status}`);
                                await loadProducts();
                              } catch (err) {
                                setRowError((prev) => ({ ...prev, [p.id]: (err as Error).message }));
                              }
                            }}
                            disabled={!user || loading}
                          >
                            Borrar
                          </Button>
                        </div>
                        {rowError[p.id] && <p className="text-xs font-semibold text-amber-700">{rowError[p.id]}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-600">
            <div>
              Página {page} de {Math.max(1, Math.ceil(sortedProducts.length / pageSize))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ← Anterior
              </Button>
              <Button variant="ghost" disabled={page * pageSize >= sortedProducts.length} onClick={() => setPage((p) => p + 1)}>
                Siguiente →
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}