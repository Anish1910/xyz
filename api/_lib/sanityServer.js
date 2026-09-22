// Server-side Sanity client with write access.
//
// Env vars:
//   SANITY_WRITE_TOKEN   Sanity → manage → API → Tokens → "Editor" token
//   VITE_SANITY_PROJECT_ID / VITE_SANITY_DATASET (optional, same as the site)
import { createClient } from '@sanity/client';

export const sanityConfigured = () => Boolean(process.env.SANITY_WRITE_TOKEN);

let client;
export function sanity() {
  if (!client) {
    client = createClient({
      projectId: process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || 'ac8qp2rd',
      dataset: process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_WRITE_TOKEN,
      useCdn: false, // stock checks must never read a cached answer
      ...(process.env.SANITY_API_HOST ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false } : {}), // local tests only
    });
  }
  return client;
}

// "order.<id>": a dot in the _id makes the document private in Sanity — it is
// invisible to the public (token-less) API the website reads products with.
export const orderDocId = (orderId) => `order.${orderId}`;
