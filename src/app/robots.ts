import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: ["/admin", "/api", "/bid/success"],
    },
    sitemap: "https://topmysaas.com/sitemap.xml",
    host: "https://topmysaas.com",
  };
}
