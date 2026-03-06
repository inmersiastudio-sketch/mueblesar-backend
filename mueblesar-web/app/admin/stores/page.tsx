"use client";

import { Store, Plus, Search } from "lucide-react";

export default function StoresPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Tiendas</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Gestioná las mueblerías registradas en la plataforma</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0058a3] text-white text-sm font-bold hover:bg-[#004f93] transition-colors shadow-sm">
                    <Plus size={14} /> Nueva tienda
                </button>
            </div>

            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0058a3]/10 to-emerald-500/10 flex items-center justify-center mb-6">
                    <Store size={36} className="text-[#0058a3]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Gestión Multi-tenant</h2>
                <p className="text-sm text-slate-500 max-w-md">
                    Próximamente: panel para administrar mueblerías, planes, límites de productos y onboarding de nuevos clientes B2B.
                </p>
            </div>
        </div>
    );
}
