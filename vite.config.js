/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "SRF — Luyện từ vựng",
        short_name: "SRF",
        description: "Học từ vựng tiếng Anh theo lịch SM-2 + luyện nói.",
        lang: "vi",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App tĩnh + localStorage; precache toàn bộ asset để chạy offline phần học từ.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
