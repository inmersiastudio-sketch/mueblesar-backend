"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Container } from "../components/layout/Container";
import { AI3DGenerator } from "../components/admin/AI3DGenerator";

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
  stockQty?: number | null;
  featured?: boolean | null;
  store?: { name?: string | null };
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
  featured: boolean;
  price: string;
  arUrl: string;
  widthCm: string;
  depthCm: string;
  heightCm: string;
  imageUrl: string;
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
  featured: false,
  price: "",
  arUrl: "",
  widthCm: "",
  depthCm: "",
  heightCm: "",
  imageUrl: "",
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
  const [statsLoading, setStatsLoading] = useState(false);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001", []);

  useEffect(() => {
    if (user?.storeId) {
      setForm((prev) => ({ ...prev, storeId: user.storeId ?? undefined }));
    }
  }, [user?.storeId]);

  useEffect(() => {
    if (user) {
      loadStats(user);
    } else {
      setStats(null);
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
      const res = await fetch(`${apiBase}/api/ar/validate-scale`, {
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
      featured: Boolean(p.featured),
      price: String(p.price ?? ""),
      arUrl: p.arUrl ?? "",
      widthCm: p.widthCm ? String(p.widthCm) : "",
      depthCm: p.depthCm ? String(p.depthCm) : "",
      heightCm: p.heightCm ? String(p.heightCm) : "",
      imageUrl: p.imageUrl ?? "",
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
      const res = await fetch(`${apiBase}/api/ar/validate-scale`, {
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
        featured: form.featured,
        price: form.price ? Number(form.price) : 0,
        arUrl: form.arUrl || undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        depthCm: form.depthCm ? Number(form.depthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        imageUrl: form.imageUrl || undefined,
      };
      const isEdit = Boolean(form.id);
      const url = isEdit ? `${apiBase}/api/admin/products/${form.id}` : `${apiBase}/api/admin/products`;
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
        setError(data?.error || `Error ${res.status}`);
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

        {!user ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <p>Inicia sesión para crear, editar o validar productos.</p>
          </div>
        ) : (
          <>
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
                  setForm((f) => ({ ...f, name: e.target.value }));
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
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Ambiente</p>
              <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Estilo</p>
              <Input value={form.style} onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">AR URL (GLB/USDZ)</p>
              <Input
                className={formErrors.arUrl ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.arUrl}
                onChange={(e) => {
                  setForm((f) => ({ ...f, arUrl: e.target.value }));
                  clearFieldError("arUrl");
                }}
              />
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
              <p className="text-xs font-semibold text-slate-700">Imagen principal (URL)</p>
              <Input
                className={formErrors.imageUrl ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}
                value={form.imageUrl}
                onChange={(e) => {
                  setForm((f) => ({ ...f, imageUrl: e.target.value }));
                  clearFieldError("imageUrl");
                }}
              />
              {formErrors.imageUrl && <p className="mt-1 text-xs text-red-600">{formErrors.imageUrl}</p>}
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Tienda</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Dimensiones</th>
                      <th className="px-4 py-3">Meta</th>
                      <th className="px-4 py-3">Validación</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-slate-500" colSpan={8}>
                          {loading ? "Cargando..." : "Sin productos"}
                        </td>
                      </tr>
                    )}
                    {products.map((p) => {
                  const val = validation[p.id];
                  const valText = val
                    ? "error" in val
                      ? val.error
                      : val.ok
                        ? "Escala OK"
                        : "Escala NO"
                    : "-";
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
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
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`rounded-full px-2 py-1 ${p.arUrl ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {p.arUrl ? "AR" : "Sin AR"}
                          </span>
                          <span className={`rounded-full px-2 py-1 ${p.imageUrl ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            {p.imageUrl ? "Imagen" : "Sin imagen"}
                          </span>
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
                          <span className={valText.includes("OK") ? "font-semibold text-emerald-700" : valText.includes("NO") ? "font-semibold text-amber-700" : "text-slate-700"}>{valText}</span>
                          {rowError[p.id] && <span className="text-amber-700">{rowError[p.id]}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button size="md" variant="secondary" onClick={() => validate(p)} disabled={!user || loading}>
                            Validar
                          </Button>
                          <Button size="md" variant="ghost" onClick={() => onEdit(p)} disabled={!user || loading}>
                            Editar
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
            </div>
          </>
        )}
      </Container>
    </div>
  );
}