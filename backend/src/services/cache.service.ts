interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private store = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 min

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateTenant(companyId: string): void {
    this.invalidate(`analytics:${companyId}`);
    this.invalidate(`inventory:${companyId}`);
    this.invalidate(`forecast:${companyId}`);
    this.invalidate(`insights:${companyId}`);
  }

  invalidateKey(key: string): void {
    this.store.delete(key);
  }

  buildKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(Boolean).join(':');
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const data = await fn();
    this.set(key, data, ttlMs);
    return data;
  }

  size(): number {
    return this.store.size;
  }

  flush(): void {
    this.store.clear();
  }
}

export const cacheService = new CacheService();
