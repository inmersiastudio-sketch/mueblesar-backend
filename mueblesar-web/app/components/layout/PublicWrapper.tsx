"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ARAnalyticsBridge } from "../analytics/ARAnalyticsBridge";
import { FloatingCartButton } from "../cart/FloatingCartButton";

export function PublicWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith("/admin");
    const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/registrar") || pathname?.startsWith("/verificar-email");

    if (isAdminRoute || isAuthRoute) {
        return <main>{children}</main>;
    }

    return (
        <>
            <Header />
            <ARAnalyticsBridge />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <FloatingCartButton />
        </>
    );
}
