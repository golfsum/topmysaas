import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-21T00:00:00.000Z");
  return [
    {
      url: "https://topmysaas.com",
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://topmysaas.com/terms",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://topmysaas.com/privacy",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
