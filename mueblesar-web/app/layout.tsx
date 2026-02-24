import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { ARAnalyticsBridge } from "./components/analytics/ARAnalyticsBridge";
import { ClientProviders } from "./components/providers/ClientProviders";
import { FloatingCartButton } from "./components/cart/FloatingCartButton";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MueblesAR",
  description: "Catálogo de mueblerías de Córdoba",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${robotoMono.variable} bg-slate-50 text-slate-900 antialiased`}>
        <ClientProviders>
          <Header />
          <ARAnalyticsBridge />
          <main>{children}</main>
          <Footer />
          <FloatingCartButton />
        </ClientProviders>
      </body>
    </html>
  );
}
