import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ClientProviders } from "./components/providers/ClientProviders";
import { PublicWrapper } from "./components/layout/PublicWrapper";
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
  title: "Amobly",
  description: "Catálogo de mueblerías de Córdoba con realidad aumentada",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${robotoMono.variable} bg-slate-50 text-slate-900 antialiased`}>
        <ClientProviders>
          <PublicWrapper>{children}</PublicWrapper>
        </ClientProviders>
      </body>
    </html>
  );
}
