import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TopMySaaS",
    short_name: "TopMySaaS",
    description: "The weekly Top 5 SaaS leaderboard, ranked by bid.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090b",
    theme_color: "#67e85f",
    categories: ["business", "marketing"],
  };
}
