"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "../context/ToastContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable is required");
}

export default function LoginPage() {
    const router = useRouter();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showVerificationMsg, setShowVerificationMsg] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Check if already logged in
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
                const data = await res.json();
                if (data.user) {
                    router.push("/admin");
                    return;
                }
            } catch { }
            setCheckingAuth(false);
        };
        check();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setShowVerificationMsg(false);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === "EMAIL_NOT_VERIFIED") {
                    setShowVerificationMsg(true);
                    setError(data.message || "Verificá tu email antes de iniciar sesión.");
                    showError(data.message || "Verificá tu email antes de iniciar sesión.");
                } else {
                    setError(data.error || "Credenciales incorrectas");
                    showError(data.error || "Credenciales incorrectas");
                }
                setLoading(false);
                return;
            }

            success("¡Bienvenido! Iniciando sesión...");

            router.push("/admin");
        } catch {
            setError("Error de conexión. Intentá nuevamente.");
            showError("Error de conexión. Intentá nuevamente.");
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        try {
            await fetch(`${API_BASE}/api/auth/resend-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setError("✅ Email de verificación reenviado. Revisá tu bandeja.");
            success("Email de verificación reenviado. Revisá tu bandeja.");
            setShowVerificationMsg(false);
        } catch {
            setError("No se pudo reenviar. Intentá más tarde.");
            showError("No se pudo reenviar el email. Intentá más tarde.");
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#0058a3] flex items-center justify-center animate-pulse">
                    <span className="text-white font-black text-xl">A</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* ─── Left Side: Motivational Image ─── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#001d3d] via-[#003566] to-[#0058a3]">
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

                {/* Background image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/login-hero.webp"
                        alt="Showroom de muebles"
                        className="w-full h-full object-cover opacity-40"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                {/* Content */}
                <div className="relative z-20 flex flex-col justify-between p-12 w-full">
                    {/* Logo top */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <span className="text-white font-black text-lg">A</span>
                        </div>
                        <span className="text-white/80 font-bold text-lg">Amobly</span>
                    </div>

                    {/* Motivational text bottom */}
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-white/80 text-sm font-medium">+50 mueblerías ya confían en Amobly</span>
                        </div>

                        <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                            Vendé más con<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                                Realidad Aumentada
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 max-w-md leading-relaxed">
                            Tus clientes pueden ver los muebles en su casa antes de comprar.
                            Aumentá tus ventas y reducí las devoluciones con modelos 3D.
                        </p>

                        {/* Stats */}
                        <div className="flex gap-8 pt-4">
                            <div>
                                <p className="text-3xl font-extrabold text-white">3x</p>
                                <p className="text-sm text-slate-400">más conversión</p>
                            </div>
                            <div>
                                <p className="text-3xl font-extrabold text-white">-40%</p>
                                <p className="text-sm text-slate-400">devoluciones</p>
                            </div>
                            <div>
                                <p className="text-3xl font-extrabold text-white">5min</p>
                                <p className="text-sm text-slate-400">para empezar</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Right Side: Login Form ─── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-[#002f5e] p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#0058a3] items-center justify-center shadow-lg shadow-[#0058a3]/30 mb-3">
                            <span className="text-white font-black text-xl">A</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">Portal de Mueblerías</h1>
                    </div>

                    {/* Desktop title */}
                    <div className="hidden lg:block mb-8">
                        <h1 className="text-3xl font-extrabold text-white">Iniciar sesión</h1>
                        <p className="text-slate-400 text-sm mt-2">Ingresá a tu panel para gestionar tus productos</p>
                    </div>

                    {/* Login Card */}
                    <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-5 shadow-2xl">
                        {error && (
                            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${showVerificationMsg
                                ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300"
                                : error.startsWith("✅")
                                    ? "bg-green-500/10 border border-green-500/20 text-green-300"
                                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                                }`}>
                                {error}
                                {showVerificationMsg && (
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        className="block mt-2 text-yellow-400 hover:text-yellow-300 underline text-xs font-bold"
                                    >
                                        Reenviar email de verificación
                                    </button>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                placeholder="tu@muebleria.com"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#0058a3] focus:ring-2 focus:ring-[#0058a3]/20 transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                placeholder="••••••••"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#0058a3] focus:ring-2 focus:ring-[#0058a3]/20 transition-all text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-[#0058a3] hover:bg-[#004f93] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#0058a3]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Ingresando...
                                </span>
                            ) : "Iniciar sesión"}
                        </button>

                        <div className="flex items-center justify-between text-sm pt-2">
                            <Link href="/recuperar-contrasena" className="text-slate-400 hover:text-white transition-colors font-medium">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </form>

                    {/* Register CTA */}
                    <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
                        <p className="text-slate-400 text-sm mb-3">¿Todavía no tenés cuenta?</p>
                        <Link
                            href="/registrar"
                            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                            </svg>
                            Registrar mi mueblería
                        </Link>
                    </div>

                    {/* Back link */}
                    <div className="text-center mt-6">
                        <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                            ← Volver al sitio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
