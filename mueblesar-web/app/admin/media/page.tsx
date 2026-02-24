"use client";

import { Container } from "../../components/layout/Container";

export default function MediaPage() {
    return (
        <div className="py-10">
            <Container>
                <div className="mb-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Galería 3D</h1>
                            <p className="text-sm text-slate-600">Modelos 3D generados y subidos.</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">Próximamente: Visor centralizado de modelos GLB/USDZ.</p>
                </div>
            </Container>
        </div>
    );
}
