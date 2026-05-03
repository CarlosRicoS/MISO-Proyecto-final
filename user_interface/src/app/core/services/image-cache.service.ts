import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { AppCacheService } from './app-cache.service';
import { ConnectivityService } from './connectivity.service';

interface CachedImage {
  url: string;
  base64: string;
  mimeType: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  private readonly logPrefix = '[ImageCacheService]';
  private readonly cacheKeyPrefix = 'th_image_cache:';
  private readonly maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly maxImageDimension = 1280;
  private readonly jpegQuality = 0.72;
  private blobUrlCache = new Map<string, string>();
  private inFlightCacheRequests = new Set<string>();

  constructor(
    private http: HttpClient,
    private cache: AppCacheService,
    private connectivity: ConnectivityService,
  ) {}

  /**
   * Resolves an image URL to either a cached blob URL or the original URL.
   * On native platform when offline, tries cache first. Otherwise, prefers network.
   */
  resolveImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return '';
    }

    // Check if we should use cache
    // Debug: log cache decision
    const shouldUseCache = this.shouldUseCache();
    this.log(`[RESOLVE] URL: ${imageUrl.substring(0, 50)}... | shouldUseCache: ${shouldUseCache} | isNative: ${Capacitor.isNativePlatform()} | isOffline: ${this.connectivity.isOffline}`);
    
    if (shouldUseCache) {
      const cachedBlobUrl = this.getCachedBlobUrl(imageUrl);
      if (cachedBlobUrl) {
        this.log(`  [OK] Found blob URL from cache`);
        return cachedBlobUrl;
      }
      this.log(`  [MISS] Cache miss - image not cached while offline`);
    }

    // Return original URL and cache it in background if online
    if (this.connectivity.isOnline && Capacitor.isNativePlatform()) {
      this.log(`  [CACHE] Caching in background (online)`);
      this.cacheImageInBackground(imageUrl).catch((error) => {
        this.log(`  [ERROR] Background cache failed: ${String(error)}`);
      });
    }

    return imageUrl;
  }

  /**
   * Pre-cache multiple images (e.g., when loading property details)
   */
  async cacheImages(imageUrls: string[]): Promise<void> {
    this.log(`[CACHE-BATCH] Starting cache of ${imageUrls.length} images | isNative: ${Capacitor.isNativePlatform()}`);
    if (!Capacitor.isNativePlatform()) {
      this.log(`[CACHE-BATCH] [SKIP] Not native platform, skipping cache`);
      return;
    }

    const toCache = imageUrls.filter(
      (url) => url && !this.isCached(url) && !this.inFlightCacheRequests.has(url),
    );
    this.log(`[CACHE-BATCH] Found ${toCache.length} new images to cache (${imageUrls.length - toCache.length} already cached)`);
    
    const promises = toCache.map((url) => this.cacheImageInBackground(url));
    await Promise.all(promises);
    this.log(`[CACHE-BATCH] [OK] Finished caching batch`);
  }

  private shouldUseCache(): boolean {
    return Capacitor.isNativePlatform() && this.connectivity.isOffline;
  }

  private getCachedBlobUrl(imageUrl: string): string {
    // Check memory cache first
    if (this.blobUrlCache.has(imageUrl)) {
      return this.blobUrlCache.get(imageUrl)!;
    }

    // Check storage
    const cached = this.cache.read<CachedImage>(this.getCacheKey(imageUrl));
    if (cached && this.isCacheValid(cached)) {
      const blobUrl = this.base64ToBlobUrl(cached.base64, cached.mimeType);
      this.blobUrlCache.set(imageUrl, blobUrl);
      return blobUrl;
    }

    // Cache expired or not found
    if (cached) {
      this.cache.remove(this.getCacheKey(imageUrl));
    }

    return '';
  }

  private async cacheImageInBackground(imageUrl: string): Promise<void> {
    if (this.inFlightCacheRequests.has(imageUrl)) {
      this.log(`  [SKIP] Already caching this URL: ${imageUrl.substring(0, 60)}...`);
      return;
    }

    this.inFlightCacheRequests.add(imageUrl);

    try {
      this.log(`  [FETCH] Fetching: ${imageUrl.substring(0, 60)}...`);
      const blob = await this.fetchImageBlob(imageUrl);

      if (!blob) {
        this.log(`  [ERROR] [FETCH] Blob was null/undefined`);
        return;
      }

      this.log(`  [OK] [FETCH] Got blob (${blob.size} bytes, type: ${blob.type})`);
      const optimizedBlob = await this.optimizeBlobForStorage(blob);
      this.log(
        `  [OK] [OPTIMIZE] Blob size ${blob.size} -> ${optimizedBlob.size} bytes`,
      );

      const base64 = await this.blobToBase64(optimizedBlob);
      this.log(`  [OK] [CONVERT] Converted to base64 (${base64.length} chars)`);

      const mimeType = optimizedBlob.type || blob.type || 'image/jpeg';
      const cacheKey = this.getCacheKey(imageUrl);

      const cached: CachedImage = {
        url: imageUrl,
        base64,
        mimeType,
        timestamp: Date.now(),
      };

      this.writeCacheWithQuotaRecovery(cacheKey, cached);
      this.log(`  [OK] [STORE] Stored in cache with key: ${cacheKey}`);
    } catch (error) {
      const details = this.formatErrorDetails(error);
      this.log(`  [ERROR] Failed to cache: ${details}`);
    } finally {
      this.inFlightCacheRequests.delete(imageUrl);
    }
  }

  private async fetchImageBlob(imageUrl: string): Promise<Blob> {
    if (Capacitor.isNativePlatform()) {
      this.log('  [FETCH] Using CapacitorHttp on native platform.');
      return this.fetchImageBlobWithCapacitorHttp(imageUrl);
    }

    return firstValueFrom(this.http.get(imageUrl, { responseType: 'blob' }));
  }

  private async fetchImageBlobWithCapacitorHttp(imageUrl: string): Promise<Blob> {
    const response = await this.requestNativeImage(imageUrl);

    const headers = (response.headers ?? {}) as Record<string, string | undefined>;
    const mimeType =
      headers['content-type'] ??
      headers['Content-Type'] ??
      headers['CONTENT-TYPE'] ??
      'image/jpeg';

    const data = response.data as unknown;

    if (data instanceof Blob) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return new Blob([data], { type: mimeType });
    }

    if (Array.isArray(data)) {
      return new Blob([new Uint8Array(data)], { type: mimeType });
    }

    if (typeof data === 'string') {
      const base64 = this.extractBase64Data(data);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    }

    throw new Error('Unsupported CapacitorHttp response format for image blob');
  }

  private async requestNativeImage(imageUrl: string) {
    return CapacitorHttp.request({
      url: imageUrl,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Accept: 'image/*',
      },
    });
  }

  private extractBase64Data(value: string): string {
    if (value.startsWith('data:')) {
      const commaIndex = value.indexOf(',');
      if (commaIndex >= 0) {
        return value.substring(commaIndex + 1);
      }
    }
    return value;
  }

  private formatErrorDetails(error: unknown): string {
    if (error && typeof error === 'object') {
      const err = error as {
        status?: number;
        statusText?: string;
        url?: string;
        message?: string;
        name?: string;
        error?: unknown;
      };

      const nestedError =
        typeof err.error === 'string'
          ? err.error
          : err.error && typeof err.error === 'object' && 'message' in err.error
            ? String((err.error as { message?: unknown }).message)
            : '';

      return `name=${err.name ?? 'unknown'} status=${err.status ?? 'n/a'} statusText=${err.statusText ?? 'n/a'} url=${err.url ?? 'n/a'} message=${err.message ?? 'n/a'} nestedError=${nestedError || 'n/a'}`;
    }

    return String(error);
  }

  private async optimizeBlobForStorage(blob: Blob): Promise<Blob> {
    if (typeof document === 'undefined') {
      return blob;
    }

    if (!blob.type.startsWith('image/')) {
      return blob;
    }

    const bitmap = await this.blobToImageBitmap(blob).catch(() => null);
    if (!bitmap) {
      return blob;
    }

    const width = bitmap.width;
    const height = bitmap.height;
    const largestSide = Math.max(width, height);
    const scale = largestSide > this.maxImageDimension ? this.maxImageDimension / largestSide : 1;

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const optimized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', this.jpegQuality);
    });

    if (!optimized) {
      return blob;
    }

    return optimized.size < blob.size ? optimized : blob;
  }

  private async blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob);
    }

    const dataUrl = await this.blobToDataUrl(blob);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    ctx.drawImage(image, 0, 0);
    return createImageBitmap(canvas);
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private writeCacheWithQuotaRecovery(cacheKey: string, cached: CachedImage): void {
    try {
      this.cache.write(cacheKey, cached);
      return;
    } catch (error) {
      if (!this.isQuotaExceededError(error)) {
        throw error;
      }

      this.log('  [WARN] Storage quota exceeded. Evicting oldest cache entries and retrying.');
      this.evictOldestCacheEntries(3);
      this.cache.write(cacheKey, cached);
    }
  }

  private isQuotaExceededError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as { name?: string; message?: string };
    return (
      err.name === 'QuotaExceededError' ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('exceeded the quota'))
    );
  }

  private evictOldestCacheEntries(count: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.cacheKeyPrefix)) {
        continue;
      }

      const cached = this.cache.read<CachedImage>(key);
      if (!cached) {
        continue;
      }

      entries.push({ key, timestamp: cached.timestamp || 0 });
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.remove(entries[i].key);
      this.log(`  [EVICT] Removed old cache key: ${entries[i].key}`);
    }
  }

  private isCached(imageUrl: string): boolean {
    const cached = this.cache.read<CachedImage>(this.getCacheKey(imageUrl));
    if (!cached) {
      return false;
    }
    return this.isCacheValid(cached);
  }

  private isCacheValid(cached: CachedImage): boolean {
    const age = Date.now() - cached.timestamp;
    return age < this.maxCacheAge;
  }

  private getCacheKey(imageUrl: string): string {
    const hash = this.simpleHash(imageUrl);
    return `${this.cacheKeyPrefix}${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private base64ToBlobUrl(base64: string, mimeType: string): string {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private log(message: string): void {
    console.info(`${this.logPrefix} ${message}`);
  }
}
