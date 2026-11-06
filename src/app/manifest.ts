import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VERAZ — Seu esforço. Sua evolução.",
    short_name: "VERAZ",
    description: "Acompanhamento nutricional pessoal, simples e preciso.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0e0d",
    theme_color: "#0b0e0d",
    orientation: "portrait-primary",
    lang: "pt-BR",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
