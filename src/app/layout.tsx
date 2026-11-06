import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "VERAZ — Seu esforço. Sua evolução.",
    template: "%s | VERAZ",
  },
  description:
    "Acompanhamento nutricional pessoal, simples e preciso. Transforme seu esforço em evolução visível.",
  applicationName: "VERAZ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VERAZ",
  },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "VERAZ — Seu esforço. Sua evolução.",
    description: "Acompanhamento nutricional pessoal, simples e preciso.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "VERAZ — Seu esforço. Sua evolução." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VERAZ — Seu esforço. Sua evolução.",
    description: "Acompanhamento nutricional pessoal, simples e preciso.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
