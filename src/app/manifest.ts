import type { MetadataRoute } from "next";

/**
 * Makes ExpenseIt installable on a phone's home screen. An installed copy
 * opens straight into the app (signed-out visitors land on sign-in).
 * The icons are generated from the brand mark by `pnpm icons`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/home",
    name: "ExpenseIt",
    short_name: "ExpenseIt",
    description: "Snap a receipt, see where your money goes.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan a receipt", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Add an expense", url: "/expenses/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
