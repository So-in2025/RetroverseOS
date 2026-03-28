export const ImageCache = {
  async getImage(url: string): Promise<string> {
    if (!url) return '';
    
    try {
      const cache = await caches.open('retroos-covers-v2');
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      // Try to fetch and cache the image locally
      // We use our backend proxy to bypass CORS
      const proxyUrl = `/api/tunnel?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { 
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        // Cache the original URL, but return a blob URL for the image
        const cache = await caches.open('retroos-covers-v2');
        await cache.put(url, response.clone());
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      // Silently fallback to native loading to avoid console clutter with thousands of warnings
    }
    
    return url;
  }
};
