import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || 'ac8qp2rd';
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';
const apiVersion = '2024-01-01';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: import.meta.env.PROD,
});

const builder = imageUrlBuilder(client);

export const urlFor = (source) => {
  if (!source || (typeof source === 'object' && !source.asset && !source._ref)) {
    const dummy = {
      width: () => dummy,
      height: () => dummy,
      quality: () => dummy,
      fit: () => dummy,
      ignoreImageParams: () => dummy,
      url: () => '',
    };
    return dummy;
  }
  try {
    return builder.image(source);
  } catch (err) {
    console.error('Error creating image URL builder:', err);
    const dummy = {
      width: () => dummy,
      height: () => dummy,
      quality: () => dummy,
      fit: () => dummy,
      ignoreImageParams: () => dummy,
      url: () => '',
    };
    return dummy;
  }
};

// Fields every product card needs (grid, home picks, related pieces). All
// images are fetched — they're only references until the carousel shows them.
export const CARD_FIELDS = `
  _id,
  _createdAt,
  title,
  slug,
  price,
  status,
  gender,
  images,
  "lqip": images[0].asset->metadata.lqip,
  badges[]->{ name },
  category->{ name, slug },
  tagSize,
  brand,
  era,
  fabric,
  tags
`;

// PRODUCT QUERIES
export const fetchProducts = async () => {
  const query = `*[_type == "product"] | order(status asc, _createdAt desc) {
    _id,
    title,
    slug,
    price,
    description,
    longDescription,
    images,
    hoverGif,
    badges[]->{ name },
    category -> { name, slug },
    status,
    tags,
    whyThisPiece,
    gender,
    tagSize,
    measurements,
    condition,
    flaws,
    brand,
    fabric,
    era
  }`;

  try {
    const products = await client.fetch(query);
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const fetchProductBySlug = async (slug) => {
  const query = `*[_type == "product" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    price,
    description,
    longDescription,
    images,
    hoverGif,
    badges[]->{ name },
    category -> { name, slug },
    status,
    tags,
    whyThisPiece,
    gender,
    tagSize,
    measurements,
    condition,
    flaws,
    brand,
    fabric,
    era
  }`;

  try {
    const product = await client.fetch(query, { slug });
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

export const fetchProductsByCategory = async (categorySlug) => {
  const query = `*[_type == "product" && category->slug.current == $categorySlug] | order(status asc, _createdAt desc) {
    _id,
    title,
    slug,
    price,
    description,
    longDescription,
    images,
    hoverGif,
    badges[]->{ name },
    category -> { name, slug },
    status,
    tags,
    whyThisPiece,
    gender,
    tagSize,
    measurements,
    condition,
    flaws,
    brand,
    fabric,
    era
  }`;

  try {
    const products = await client.fetch(query, { categorySlug });
    return products;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
};

// CATEGORY QUERIES
export const fetchCategories = async () => {
  const query = `*[_type == "category"] | order(name asc) {
    _id,
    name,
    slug,
    description,
    image
  }`;

  try {
    const categories = await client.fetch(query);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// BANNER QUERIES
export const fetchActiveBanners = async () => {
  const query = `*[_type == "banner" && active == true] | order(_createdAt desc) {
    _id,
    title,
    subtitle,
    image,
    ctaText,
    ctaLink,
    active
  }`;

  try {
    const banners = await client.fetch(query);
    return banners;
  } catch (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
};

// SHOP SETTINGS QUERIES
export const fetchShopSettings = async () => {
  const query = `*[_type == "shopSettings"][0] {
    _id,
    title,
    subtitle,
    backgroundImage,
    backgroundVideo { asset -> { url } }
  }`;

  try {
    const settings = await client.fetch(query);
    return settings;
  } catch (error) {
    console.error('Error fetching shop settings:', error);
    return null;
  }
};
