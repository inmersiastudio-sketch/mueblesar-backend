"use client";

import { Users, Plus, Shield, UserPlus } from "lucide-react";

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Usuarios</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Administrá accesos y roles de tu equipo</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0058a3] text-white text-sm font-bold hover:bg-[#004f93] transition-colors shadow-sm">
                    <UserPlus size={14} /> Invitar usuario
                </button>
            </div>

            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-[#0058a3]/10 flex items-center justify-center mb-6">
                    <Users size={36} className="text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Roles y Permisos</h2>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                    Próximamente: invitá a tu equipo con roles diferenciados (Admin, Operador, Solo Lectura) para que gestionen los productos de tu mueblería.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <Shield size={18} className="text-[#0058a3] mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Super Admin</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <Users size={18} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Operador</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <Users size={18} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Solo Lectura</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
