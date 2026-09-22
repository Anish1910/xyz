import { motion } from 'framer-motion';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, showHeading = true }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${showHeading ? 'py-16 md:py-24' : 'pt-6 pb-16 md:pt-8 md:pb-24'}`}>
      {showHeading && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-dark mb-4 md:mb-6">
            all available pieces
          </h2>
          <p className="text-text-medium text-lg max-w-2xl mx-auto">
            limited. unique. yours to own.
          </p>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-4 md:gap-x-6 md:gap-y-8 lg:gap-y-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {products.map((product, i) => (
          <ProductCard key={product._id} product={product} priority={i < 4} />
        ))}
      </motion.div>
    </section>
  );
}
