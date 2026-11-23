import { env } from '../../../config/env';

// In-memory cache for fast response and quota saving
const imageCache = new Map<string, string>();

// High quality transparent CDN assets for instant resilient fallbacks
const FALLBACK_ASSETS = {
  NINJA: 'assets/homescreensicons/ninja_trans.png',
  ACTIVA: 'assets/homescreensicons/activa_trans.png',
  SPLENDOR: 'assets/homescreensicons/splendor_trans.png',
  PULSAR: 'assets/homescreensicons/pulsar_trans.png',
  SWIFT: 'assets/homescreensicons/swift_trans.png',
  CAR: 'assets/homescreensicons/carimage.png',
};

export const vehicleImageService = {
  /**
   * Search for a vehicle image with a clear / transparent background
   * using smart keyword matching, Google Custom Search (if valid), and verified fallbacks.
   */
  async searchVehicleImage(query: string): Promise<string> {
    if (!query || !query.trim()) {
      return FALLBACK_ASSETS.CAR;
    }

    const cleanQuery = query.trim();
    const cacheKey = cleanQuery.toLowerCase();

    // 1. Check in-memory cache (prune any legacy corrupted Wikipedia/Wikimedia URLs)
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey)!;
      if (!cached.includes('wikimedia.org') && !cached.includes('wikipedia.org')) {
        return cached;
      }
      imageCache.delete(cacheKey);
    }

    // 2. Check smart keyword match FIRST - instant, 100% accurate, transparent vehicle cutout
    const smartAsset = this.getSmartFallback(cleanQuery);
    if (smartAsset) {
      imageCache.set(cacheKey, smartAsset);
      return smartAsset;
    }

    // 3. If Google Custom Search credentials exist, try Google image search
    const apiKey = process.env.Custom_Search_API || process.env.CUSTOM_SEARCH_API || env.CUSTOM_SEARCH_API;
    const engineId = process.env.ENGINE_ID || env.ENGINE_ID;

    if (apiKey && engineId) {
      try {
        const searchPrompt = `${cleanQuery} car vehicle transparent background png`;
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(engineId)}&q=${encodeURIComponent(searchPrompt)}&searchType=image&fileType=png&imgColorType=trans&safe=active&num=3`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        const data: any = await response.json();

        if (response.ok && data.items && Array.isArray(data.items) && data.items.length > 0) {
          const bestItem = data.items.find((item: any) => item.link && item.link.startsWith('http')) || data.items[0];
          if (bestItem?.link) {
            console.log(`[VehicleImageService] Successfully fetched Google image for "${cleanQuery}": ${bestItem.link}`);
            imageCache.set(cacheKey, bestItem.link);
            return bestItem.link;
          }
        }
      } catch (_) { }
    }

    // 4. Default verified fallback
    imageCache.set(cacheKey, smartAsset);
    return smartAsset;
  },

  /**
   * Determine the best transparent vehicle cutout asset based on vehicle name
   */
  getSmartFallback(name: string): string {
    const lower = name.toLowerCase();

    // Scooters (Activa, Access, Jupiter, Dio, Vespa, Ola, Ather, etc.)
    const scooterKeywords = [
      'activa', 'scooter', 'scooty', 'dio', 'jupiter', 'access', 'pleasure',
      'ntorq', 'ola', 'ather', 'chetak', 'destini', 'ray', 'grazia', 'burgman',
      'fascino', 'vespa', 'aerox', 'vida', 'iqube'
    ];
    if (scooterKeywords.some(k => lower.includes(k))) {
      return FALLBACK_ASSETS.ACTIVA;
    }

    // Commuter bikes (Splendor, Passion, Shine, Platina, HF Deluxe, etc.)
    const commuterKeywords = [
      'splendor', 'passion', 'shine', 'platina', 'hf deluxe', 'ct 100',
      'glamour', 'super splendor', 'hero', 'commuter', 'raider', 'ronin',
      'sp 125', 'cd 110', 'livo'
    ];
    if (commuterKeywords.some(k => lower.includes(k))) {
      return FALLBACK_ASSETS.SPLENDOR;
    }

    // Sports bikes & Superbikes (Ninja, Kawasaki, Hayabusa, ZX, R15, CBR, Panigale, etc.)
    const superbikeKeywords = [
      'ninja', 'kawasaki', 'hayabusa', 'zx', 'superbike', 'sports bike', 'sportbike',
      'cbr', 'panigale', 'ducati', 's1000rr', 'daytona', 'gsx', 'bmw s', 'r1', 'r6', 'yamaha r'
    ];
    if (superbikeKeywords.some(k => lower.includes(k))) {
      return FALLBACK_ASSETS.NINJA;
    }

    // Performance / cruiser bikes (Pulsar, Apache, Bullet, Classic, Duke, KTM, R15, Yamaha, etc.)
    const bikeKeywords = [
      'pulsar', 'apache', 'bullet', 'classic 350', 'royal enfield', 'duke', 'ktm',
      'r15', 'mt 15', 'fz', 'hunter', 'meteor', 'avenger', 'jaw', 'yezdi', 'bike',
      'motorcycle', 'himalayan', 'interceptor', 'continental', 'speed 400', 'scrambler',
      'thunderbird', 'dominar', 'gixxer', 'v-strom', 'xpulse'
    ];
    if (bikeKeywords.some(k => lower.includes(k))) {
      return FALLBACK_ASSETS.PULSAR;
    }

    // Hatchback cars (Swift, Baleno, i20, Alto, WagonR, Tiago, etc.)
    const hatchbackKeywords = [
      'swift', 'baleno', 'i20', 'i10', 'alto', 'wagonr', 'tiago', 'altroz', 'polo',
      'hatchback', 'glanza', 'ignis', 'celerio', 'kwid', 's-presso'
    ];
    if (hatchbackKeywords.some(k => lower.includes(k))) {
      return FALLBACK_ASSETS.SWIFT;
    }

    // Default to Car / SUV
    return FALLBACK_ASSETS.CAR;
  },
};
