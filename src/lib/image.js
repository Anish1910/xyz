import { urlFor } from './sanity';

/**
 * Returns an appropriate image width based on viewport size.
 * Avoids serving desktop-sized images to mobile devices.
 *
 * @param {number} desktopWidth - Desired width for desktop (default 800)
 * @returns {number} - Width appropriate for current viewport
 */
const _isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const _isTablet = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;

export const getResponsiveWidth = (desktopWidth = 1200) => {
  // Use higher resolution for retina displays on mobile
  if (_isMobile) return Math.min(800, desktopWidth);
  if (_isTablet) return Math.min(1000, desktopWidth);
  return desktopWidth;
};

/**
 * Safe image handler that supports both Sanity image objects and string URLs
 * Prevents crashes from mixed image data types
 *
 * @param {object|string|undefined} img - Image input
 * @param {object} options - { width, height, quality, autoFormat, responsive }
 * @returns {string} - Safe URL string or empty string
 *
 * Examples:
 * - getImage(sanityImageObject) -> uses urlFor()
 * - getImage('https://example.com/image.jpg') -> returns URL directly
 * - getImage('IMG_1829.PNG') -> returns filename directly
 * - getImage(undefined) -> returns ''
 */
export const getImage = (img, options = {}) => {
  // Handle undefined or null
  if (!img) return '';

  // Handle Sanity image objects
  if (typeof img === 'object') {
    // If we have a dereferenced asset URL directly, we use it as fallback
    if (img.asset?.url && !img.asset?._ref) {
      return img.asset.url;
    }
    
    if (img.asset || img._ref) {
      try {
        let builderInstance = urlFor(img);
        // Use responsive width if enabled (default: true)
        const useResponsive = options.responsive !== false;
        const width = useResponsive && options.width
          ? getResponsiveWidth(options.width)
          : options.width;
        if (width) builderInstance = builderInstance.width(width);
        if (options.height) builderInstance = builderInstance.height(options.height);
        builderInstance = builderInstance.quality(options.quality || 85);
        if (options.autoFormat !== false) builderInstance = builderInstance.auto('format');
        return builderInstance.url();
      } catch (error) {
        console.warn('Failed to process Sanity image:', img, error);
        // Fallback to asset url if available
        if (img.asset?.url) return img.asset.url;
      }
    }
  }

  // Handle string URLs or filenames
  if (typeof img === 'string') {
    return img;
  }

  // Fallback for unknown types
  return '';
};

/**
 * srcset for a Sanity image at fixed widths, so the browser downloads the
 * smallest file that is still sharp on this screen.
 *
 * Keep the widths below in sync with scripts/warm-images.mjs — the CDN caches
 * each exact URL, and the warm-up script pre-builds these ones.
 */
export const IMAGE_WIDTHS = {
  card: [400, 600, 800],
  gallery: [600, 900, 1200],
};
export const IMAGE_QUALITY = { card: 75, gallery: 80, viewer: 80, thumb: 70 };

export const getSrcSet = (img, widths, quality) =>
  widths
    .map((w) => {
      const url = getImage(img, { width: w, quality, responsive: false });
      return url ? `${url} ${w}w` : '';
    })
    .filter(Boolean)
    .join(', ');
