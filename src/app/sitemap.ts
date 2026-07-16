import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const publicRoutes = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/editor", priority: 0.9, changeFrequency: "weekly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-19");

  return publicRoutes.map((route) => ({
    url: route.path ? absoluteUrl(route.path) : SITE_URL,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
