"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "../components/admin/Sidebar";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type SessionUser = {
    id: number;
    email: string;
    name?: string | null;
    role: "ADMIN" | "STORE";
    storeId?: number | null;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001", []);

    useEffect(() => {
        const fetchSession = async () => {
            setAuthLoading(true);
            try {
                const res = await fetch(`${apiBase}/api/auth/me`, { credentials: "include" });
                if (!res.ok) {
                    setUser(null);
                    return;
                }
                const data = await res.json();
                const nextUser = (data as { user?: SessionUser })?.user ?? (data as SessionUser | null);
                setUser(nextUser);
            } catch (err) {
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };

        fetchSession();
    }, [apiBase]);

    const handleLogout = async () => {
        try {
            await fetch(`${apiBase}/api/auth/logout`, { credentials: "include" });
            setUser(null);
            router.push("/admin"); // Redirect to login
        } catch (err) {
            console.error(err);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    // Si no hay user, asumimos que app/admin/page.tsx renderizará el formulario de Login que estaba ahí.
    // En ese caso, no renderizamos el Sidebar.
    if (!user) {
        return <div className="min-h-screen bg-slate-50">{children}</div>;
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar storeName={user.name || user.email} onLogout={handleLogout} />
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
