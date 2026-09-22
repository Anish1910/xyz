/**
 * Builds dist/sitemap.xml from live Sanity content.
 *
 * Run AFTER `vite build`, so it overwrites the static placeholder that Vite
 * copies out of public/. Every product and category gets a URL — without this
 * the sitemap listed five static pages and Google had no route to any product.
 *
 * Fails soft: if Sanity is unreachable the build still succeeds and ships the
 * static sitemap rather than breaking a deploy.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PROJECT_ID = process.env.VITE_SANITY_PROJECT_ID || 'ac8qp2rd';
const DATASET = process.env.VITE_SANITY_DATASET || 'production';
const API_VERSION = '2024-01-01';

// Must match the domain the site actually serves from — the apex redirects to
// www, so listing apex URLs made every entry in the sitemap a 301.
const SITE = 'https://www.thriftonyte.com';

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/learn', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/policies/refund', changefreq: 'yearly', priority: '0.3' },
  { path: '/policies/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/policies/privacy', changefreq: 'yearly', priority: '0.3' },
];

const QUERY = `{
  "products": *[_type == "product" && defined(slug.current)]{
    "slug": slug.current, _updatedAt, status
  },
  "categories": *[_type == "category" && defined(slug.current)]{
    "slug": slug.current, _updatedAt
  }
}`;

const escapeXml = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  );

const day = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

const urlEntry = ({ loc, lastmod, changefreq, priority }) =>
  `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

async function fetchContent() {
  const url =
    `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
  const { result } = await res.json();
  return result || { products: [], categories: [] };
}

async function main() {
  const today = day();
  let products = [];
  let categories = [];

  try {
    const content = await fetchContent();
    products = content.products || [];
    categories = content.categories || [];
    console.log(`[sitemap] fetched ${products.length} products, ${categories.length} categories`);
  } catch (err) {
    console.warn(`[sitemap] could not reach Sanity (${err.message}) — writing static routes only`);
  }

  const entries = [
    ...STATIC_ROUTES.map((r) => ({
      loc: `${SITE}${r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    })),
    ...categories.map((c) => ({
      loc: `${SITE}/shop?category=${encodeURIComponent(c.slug)}`,
      lastmod: day(c._updatedAt),
      changefreq: 'weekly',
      priority: '0.7',
    })),
    ...products.map((p) => ({
      loc: `${SITE}/product/${encodeURIComponent(p.slug)}`,
      lastmod: day(p._updatedAt),
      changefreq: 'weekly',
      // Sold pieces stay in the sitemap (the URL is still valid and still ranks)
      // but at lower priority than what's actually buyable.
      priority: p.status === 'sold_out' ? '0.4' : '0.8',
    })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(urlEntry).join('\n') +
    `\n</urlset>\n`;

  const out = resolve(process.cwd(), 'dist', 'sitemap.xml');
  await writeFile(out, xml, 'utf8');
  console.log(`[sitemap] wrote ${entries.length} URLs to dist/sitemap.xml`);
}

main().catch((err) => {
  console.error('[sitemap] failed:', err);
  // Never break the deploy over a sitemap.
  process.exit(0);
});
