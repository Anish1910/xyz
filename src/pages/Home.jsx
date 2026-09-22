import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import FeaturedProducts from '../components/FeaturedProducts';
import BrandSection from '../components/BrandSection';

import Footer from '../components/Footer';
import ScrollVelocity from '../components/ScrollVelocity';
import Newsletter from '../components/Newsletter';

import { client, urlFor, CARD_FIELDS } from '../lib/sanity';
import { useDocumentMeta, SITE_URL } from '../hooks/useDocumentMeta';

export default function Home() {
  useDocumentMeta({
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: 'Thriftonyte',
          url: SITE_URL,
          logo: `${SITE_URL}/apple-touch-icon.png`,
          description:
            'Curated pre-loved and vintage fashion in India. Every piece is one of one.',
          sameAs: ['https://instagram.com/thriftonyte'],
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: 'Thriftonyte',
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
      ],
    },
  });

  const [banner, setBanner] = useState(null);
  const [homepageSettings, setHomepageSettings] = useState(null);

  useEffect(() => {
    client
      .fetch(`*[_type == "banner" && active == true][0]`)
      .then(setBanner)
      .catch(console.error);
  }, []);

  useEffect(() => {
    client
      .fetch(`*[_type == "homepageSettings"][0]{
        heroImages,
        heroText,
        scrollingTexts,
        featuredProducts[]->{ ${CARD_FIELDS} },
        featuredCategories[]->{_id, name, slug, image, description},
        brandSections[]{image, link, text}
      }`)
      .then(setHomepageSettings)
      .catch(console.error);
  }, []);


  const featuredProducts = [...(homepageSettings?.featuredProducts || [])].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'available' ? -1 : 1;
  });
  const featuredCategories = homepageSettings?.featuredCategories || [];

  return (
    <main>
      <Hero settings={homepageSettings} />

      {homepageSettings?.scrollingTexts && homepageSettings.scrollingTexts.length > 0 && (
        <ScrollVelocity 
          texts={homepageSettings.scrollingTexts} 
          velocity={200} 
        />
      )}

      {featuredProducts.length > 0 && <FeaturedProducts products={featuredProducts} />}

      {banner && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-full bg-neutral-warm-beige/20 overflow-hidden py-6 md:py-16 shadow-sm md:shadow-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {banner.image && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="rounded-lg overflow-hidden"
                >
                  <img
                    src={urlFor(banner.image).width(1200).quality(85).auto('format').url()}
                    alt={banner.title}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                    decoding="async"
                  />
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {banner.title && (
                  <h2 className="text-3xl md:text-4xl font-extrabold text-text-dark mb-4 uppercase tracking-wide">
                    {banner.title}
                  </h2>
                )}
                {banner.subtitle && (
                  <p className="text-base md:text-lg text-text-medium mb-6">
                    {banner.subtitle}
                  </p>
                )}
                {banner.ctaLink && (
                  <a
                    href={banner.ctaLink}
                    className="inline-block px-8 py-3 bg-accent-brown text-white font-semibold rounded-minimal hover:bg-accent-green transition-colors duration-300 uppercase tracking-wide text-sm"
                  >
                    {banner.ctaText || 'Explore'}
                  </a>
                )}
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      {featuredCategories.length > 0 && <Categories categories={featuredCategories} />}

      <BrandSection sections={homepageSettings?.brandSections} />



      <Newsletter />
      <Footer />
    </main>
  );
}
