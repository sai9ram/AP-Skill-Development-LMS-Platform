import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AP Skill Development LMS",
    short_name: "AP Skill LMS",
    description:
      "Learning Management System for Andhra Pradesh Colleges & Institutions",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFFFF",
    theme_color: "#0F3D2E",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
