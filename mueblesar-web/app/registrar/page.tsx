"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export default function RegistrarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    ownerName: "",
    whatsapp: "",
    address: "",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          ownerName: formData.ownerName,
          whatsapp: formData.whatsapp,
          address: formData.address,
          description: formData.description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrar la mueblería");
        setLoading(false);
        return;
      }

      // Redirect to admin panel on success
      router.push("/admin");
    } catch (err) {
      setError("Error de conexión. Intentá nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Registrar mueblería</h1>
            <p className="mt-2 text-sm text-slate-600">
              Completá el formulario para unirte a Amobly y empezar a vender tus productos.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Información de la mueblería</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la mueblería *</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Muebles del Sur"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp *</label>
                <Input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+5493512345678"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Incluí el código de país (ej: +549...)</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dirección *</label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Av. Colón 1234, Córdoba"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Descripción (opcional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Breve descripción de tu mueblería..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h2 className="text-lg font-semibold text-slate-900">Datos del responsable</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del responsable *</label>
                <Input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan@mueblesdelsur.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña *</label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Debe incluir mayúscula, minúscula y número
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar contraseña *</label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repetí tu contraseña"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 border-t pt-6">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Registrando..." : "Crear cuenta"}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin">Cancelar</Link>
              </Button>
            </div>

            <p className="text-center text-sm text-slate-600">
              ¿Ya tenés cuenta?{" "}
              <Link href="/admin" className="font-semibold text-primary hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </form>
        </div>
      </Container>
    </div>
  );
}
