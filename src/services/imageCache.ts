export const ImageCache = {
  async getImage(url: string): Promise<string> {
    if (!url) return '';
    
    try {
      const cache = await caches.open('retroos-covers-v1');
      const cachedResponse = await cache.match(url, { ignoreSearch: true });
      
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      // Try to fetch and cache the image locally
      // We use 'cors' by default. If it fails, we fallback to native loading.
      const response = await fetch(url, { 
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
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
