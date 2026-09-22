#!/usr/bin/env node
/**
 * Pre-builds every product photo size the website uses, so shoppers never wait
 * for Sanity to resize a photo on first view.
 *
 * Why: product photos are stored as very large PNGs (median ~11 MB, some over
 * 100 MB). The first time any size of a photo is requested, Sanity's CDN has
 * to shrink the original — measured ~0.7–1.2 s per photo. After that the same
 * URL is served from cache in ~0.1–0.3 s. This script makes those first
 * requests for you.
 *
 * Run it after adding or changing products (from the project folder):
 *   npm run warm-images              → every product
 *   npm run warm-images -- --days 3  → only products edited in the last 3 days
 *
 * The URLs must match the site's exactly — widths and quality below mirror
 * IMAGE_WIDTHS / IMAGE_QUALITY in src/lib/image.js. Change both together.
 */
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const client = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID || 'ac8qp2rd',
  dataset: process.env.VITE_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});
const builder = imageUrlBuilder(client);

const VARIANTS = [
  ...[400, 600, 800].map((w) => ({ w, q: 75 })), // shop cards
  ...[600, 900, 1200].map((w) => ({ w, q: 80 })), // product page gallery
  { w: 1600, q: 80 }, // full-screen viewer
  { w: 160, q: 70 }, // thumbnails
  { w: 1200, q: 85 }, // social / Google preview image
];
// Browsers get AVIF or WebP depending on what they accept — warm both.
const ACCEPTS = ['image/avif,image/webp,*/*', 'image/webp,*/*'];
const CONCURRENCY = 8;

const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? Number(process.argv[daysArg + 1]) : null;
const since = days ? new Date(Date.now() - days * 864e5).toISOString() : null;

// Must match getImage() in src/lib/image.js: width → quality → auto=format.
const urlFor = (img, w, q) => builder.image(img).width(w).quality(q).auto('format').url();

const products = await client.fetch(
  `*[_type == "product" ${since ? '&& _updatedAt > $since' : ''}]{ title, images }`,
  since ? { since } : {},
);

const jobs = [];
for (const p of products) {
  for (const img of p.images || []) {
    if (!img?.asset?._ref) continue;
    for (const { w, q } of VARIANTS) {
      for (const accept of ACCEPTS) jobs.push({ url: urlFor(img, w, q), accept });
    }
  }
}

console.log(`Warming ${jobs.length} image variants for ${products.length} products…`);
let done = 0;
let slow = 0;
let failed = 0;
const started = Date.now();

async function worker() {
  while (jobs.length) {
    const { url, accept } = jobs.shift();
    const t = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: accept } });
      await res.arrayBuffer();
      if (!res.ok) failed += 1;
      if (Date.now() - t > 500) slow += 1; // was not cached yet — now it is
    } catch {
      failed += 1;
    }
    done += 1;
    if (done % 100 === 0) process.stdout.write(`  ${done} done…\n`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(
  `Done in ${Math.round((Date.now() - started) / 1000)}s — ${done} variants, ` +
  `${slow} were newly built, ${failed} failed.`,
);
