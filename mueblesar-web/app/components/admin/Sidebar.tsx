"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Image as ImageIcon, Settings, LogOut } from "lucide-react";

type SidebarProps = {
    storeName?: string;
    onLogout: () => void;
};

export function Sidebar({ storeName, onLogout }: SidebarProps) {
    const pathname = usePathname();

    const links = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Inventario", href: "/admin/inventory", icon: Package },
        { name: "Modelos AR", href: "/admin/media", icon: ImageIcon },
        { name: "Configuración", href: "/admin/settings", icon: Settings },
    ];

    return (
        <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 h-screen sticky top-0">
            <div className="p-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Amobly<span className="text-amber-500">B2B</span></h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{storeName || "Cargando Tienda..."}</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon size={18} className={isActive ? "text-amber-500" : "text-slate-400"} />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
