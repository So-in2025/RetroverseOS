/**
 * Centralized CDN and Image Optimization Service.
 * Uses Cloudinary as the primary proxy for Archive.org and other external assets.
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dfrb7fkni';

export class CDNService {
  /**
   * Wraps a URL with Cloudinary's Fetch API for optimization.
   */
  public static optimize(url: string, options: { width?: number; height?: number; quality?: string; format?: string; crop?: string } = {}): string {
    if (!url) return '';
    
    // Don't optimize if it's already a Cloudinary URL or a local blob
    if (url.includes('cloudinary.com') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    const {
      width = 400,
      quality = 'auto',
      format = 'auto',
      crop = 'fill'
    } = options;

    // Cloudinary Fetch URL format:
    // https://res.cloudinary.com/<cloud_name>/image/fetch/<transformations>/<url>
    const transformations = [
      `w_${width}`,
      `q_${quality}`,
      `f_${format}`,
      `c_${crop}`
    ].join(',');

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(url)}`;
  }

  /**
   * Specifically optimizes game covers.
   */
  public static optimizeCover(url: string): string {
    return this.optimize(url, { width: 400, height: 600, crop: 'fill' });
  }

  /**
   * Specifically optimizes background artwork.
   */
  public static optimizeArtwork(url: string): string {
    return this.optimize(url, { width: 1280, quality: '80', format: 'webp' });
  }

  /**
   * Optimizes video previews if possible (Cloudinary supports video fetch too).
   */
  public static optimizeVideo(url: string): string {
    if (!url) return '';
    if (url.includes('cloudinary.com')) return url;
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/fetch/q_auto,f_auto/${encodeURIComponent(url)}`;
  }
}
