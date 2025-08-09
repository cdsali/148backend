

  const fs = require('fs');
const path = require('path');

class SimpleCache {
  constructor() {
    this.cache = {};
    this.cacheFile = path.join(__dirname, 'cache-data.json');

    this.loadCacheFromFile();
  }

  saveCacheToFile() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('[CACHE] Failed to save cache:', err.message);
    }
  }

  loadCacheFromFile() {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        console.log('[CACHE] Loaded cache from disk');
      } catch (err) {
        console.error('[CACHE] Failed to load cache:', err.message);
      }
    }
  }

  set(key, value, ttl = 3600) {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache[key] = { value, expiresAt };
    console.log(`[CACHE SET] ${key} | Expires in ${ttl} sec (~${(ttl / 3600).toFixed(2)} hours)`);
    this.saveCacheToFile();
  }

  get(key) {
    const item = this.cache[key];
    if (!item) {
      console.log(`[CACHE MISS] ${key} not found`);
      return null;
    }

    if (Date.now() > item.expiresAt) {
      console.log(`[CACHE EXPIRED] ${key}`);
      delete this.cache[key];
      this.saveCacheToFile();
      return null;
    }

    console.log(`[CACHE HIT] ${key}`);
    return item.value;
  }

  delete(key) {
    if (this.cache[key]) {
      console.log(`[CACHE DELETE] ${key}`);
      delete this.cache[key];
      this.saveCacheToFile();
    }
  }

  clear() {
    console.log(`[CACHE CLEAR] All entries removed`);
    this.cache = {};
    this.saveCacheToFile();
  }
}

module.exports = new SimpleCache();
