import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://lulutales.in";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Only pages anyone can open. Everything else needs sign-in and is marked "don't list".
const entries: SitemapEntry[] = [
  // Update the dates when a page's words change. Fixed dates keep this file identical on every build.
  { path: "/", lastmod: "2026-10-14", changefreq: "weekly", priority: "1.0" },
  { path: "/privacy", lastmod: "2026-10-12", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", lastmod: "2026-10-12", changefreq: "yearly", priority: "0.3" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
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
