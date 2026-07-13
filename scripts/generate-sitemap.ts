import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://lulutales.in";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/auth", changefreq: "monthly", priority: "0.6" },
  { path: "/reset-password", changefreq: "monthly", priority: "0.5" },
  { path: "/onboarding", changefreq: "monthly", priority: "0.6" },
  { path: "/select-profile", changefreq: "monthly", priority: "0.6" },
  { path: "/happy-place", changefreq: "weekly", priority: "0.9" },
  { path: "/library", changefreq: "weekly", priority: "0.8" },
  { path: "/profile", changefreq: "monthly", priority: "0.6" },
  { path: "/profiles", changefreq: "monthly", priority: "0.6" },
  { path: "/insights", changefreq: "weekly", priority: "0.7" },
  { path: "/magic-hub", changefreq: "weekly", priority: "0.8" },
  { path: "/magic-hub/audio", changefreq: "weekly", priority: "0.7" },
  { path: "/magic-hub/bedtime", changefreq: "weekly", priority: "0.7" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const today = new Date().toISOString().split("T")[0];
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      `    <lastmod>${e.lastmod ?? today}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
