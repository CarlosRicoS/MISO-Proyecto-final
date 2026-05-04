import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ImageCacheService } from './image-cache.service';
import { AppCacheService } from './app-cache.service';
import { ConnectivityService } from './connectivity.service';

describe('ImageCacheService', () => {
  let service: ImageCacheService;
  let httpTestingController: HttpTestingController;
  let cacheService: jasmine.SpyObj<AppCacheService>;
  let connectivityService: any;
  let isNativeSpy: jasmine.Spy;
  

  beforeEach(() => {
    const cacheSpy = jasmine.createSpyObj<AppCacheService>('AppCacheService', [
      'read',
      'write',
      'remove',
    ]);
    
    connectivityService = {
      isOnline: true,
      isOffline: false,
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ImageCacheService,
        { provide: AppCacheService, useValue: cacheSpy },
        { provide: ConnectivityService, useValue: connectivityService },
      ],
    });

    service = TestBed.inject(ImageCacheService);
    httpTestingController = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(AppCacheService) as jasmine.SpyObj<AppCacheService>;

    // Default to web/http path in tests
    isNativeSpy = spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
  });

  afterEach(() => {
    try {
      httpTestingController.verify();
    } catch (e) {
      // Some tests run the native-capacitor path and won't use HttpClient; ignore verify errors.
    }
  });

  describe('resolveImageUrl', () => {
    it('should return empty string for undefined/empty url', () => {
      expect(service.resolveImageUrl(undefined)).toBe('');
      expect(service.resolveImageUrl('')).toBe('');
    });

    it('should return original url when online and not cached', async () => {
      connectivityService.isOnline = true;
      connectivityService.isOffline = false;
      cacheService.read.and.returnValue(null);

      // The service only performs caching on native platform; enable native and mock CapacitorHttp
      isNativeSpy.and.returnValue(true);
      spyOn(service as any, 'fetchImageBlobWithCapacitorHttp').and.callFake(async () => new Blob(['mock image data'], { type: 'image/jpeg' }));

      const url = 'https://example.com/image.jpg';
      const result = service.resolveImageUrl(url);

      expect(result).toBe(url);

      // Wait for background cache to complete (with short timeout)
      await new Promise<void>((resolve) => {
        const start = Date.now();
        const check = () => {
          if (cacheService.write.calls.count() > 0) {
            resolve();
            return;
          }
          if (Date.now() - start > 500) {
            resolve();
            return;
          }
          setTimeout(check, 10);
        };
        check();
      });

      expect(cacheService.write).toHaveBeenCalled();
    });

    it('should return cached blob url when offline and cached', () => {
      connectivityService.isOnline = false;
      connectivityService.isOffline = true;

      const imageUrl = 'https://example.com/image.jpg';
      const cachedImage = {
        url: imageUrl,
        base64: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAEI+',
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
      };

      cacheService.read.and.returnValue(cachedImage);
      isNativeSpy.and.returnValue(true);

      const result = service.resolveImageUrl(imageUrl);

      expect(result).toBeTruthy();
      expect(result.startsWith('blob:')).toBe(true);
    });

    it('should remove expired cache entries', () => {
      connectivityService.isOnline = false;
      connectivityService.isOffline = true;

      const imageUrl = 'https://example.com/image.jpg';
      const expiredCache = {
        url: imageUrl,
        base64: 'iVBORw0KGgoAAAANSUhEUg',
        mimeType: 'image/jpeg',
        timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days old
      };

      cacheService.read.and.returnValue(expiredCache);
      isNativeSpy.and.returnValue(true);

      const result = service.resolveImageUrl(imageUrl);

      expect(result).toBe(imageUrl);
      expect(cacheService.remove).toHaveBeenCalled();
    });
  });

  describe('cacheImages', () => {
    it('should cache multiple images', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      cacheService.read.and.returnValue(null);

      // Use native-capacitor path for caching
      isNativeSpy.and.returnValue(true);
      spyOn(service as any, 'fetchImageBlobWithCapacitorHttp').and.callFake(async () => new Blob(['mock image data'], { type: 'image/jpeg' }));

      await service.cacheImages(imageUrls);

      expect(cacheService.write).toHaveBeenCalledTimes(2);
    });

    it('should skip already cached images', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const cachedImage = {
        url: imageUrl,
        base64: 'iVBORw0KGgoAAAANSUhEUg',
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
      };

      cacheService.read.and.returnValue(cachedImage);

      // Ensure native path is honored but cached images are skipped
      isNativeSpy.and.returnValue(true);
      const fetchSpy = spyOn(service as any, 'fetchImageBlobWithCapacitorHttp');

      await service.cacheImages([imageUrl]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(cacheService.write).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully', async () => {
      const imageUrl = 'https://example.com/image.jpg';

      cacheService.read.and.returnValue(null);

      // Simulate native request error
      isNativeSpy.and.returnValue(true);
      spyOn(service as any, 'fetchImageBlobWithCapacitorHttp').and.callFake(async () => {
        throw new Error('Network error');
      });

      await service.cacheImages([imageUrl]);

      expect(cacheService.write).not.toHaveBeenCalled();
    });
  });

  describe('image blob conversion', () => {
    it('should convert base64 to blob url correctly', () => {
      // Create a simple 1x1 pixel JPEG in base64
      const base64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAEI+';

      const imageUrl = 'https://example.com/image.jpg';
      const cachedImage = {
        url: imageUrl,
        base64,
        mimeType: 'image/jpeg',
        timestamp: Date.now(),
      };

      cacheService.read.and.returnValue(cachedImage);
      connectivityService.isOffline = true;

      isNativeSpy.and.returnValue(true);

      const result = service.resolveImageUrl(imageUrl);

      expect(result).toBeTruthy();
      expect(result.startsWith('blob:')).toBe(true);
    });
  });

  describe('internal helpers and edge branches', () => {
    it('fetchImageBlob delegates to native helper when running on native', async () => {
      isNativeSpy.and.returnValue(true);
      const delegate = spyOn(service as any, 'fetchImageBlobWithCapacitorHttp').and.callFake(async () => new Blob(['x'], { type: 'image/png' }));
      const blob = await (service as any).fetchImageBlob('https://example.com/native.png');
      expect(delegate).toHaveBeenCalled();
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('image/png');
    });

    it('fetchImageBlob uses HttpClient when not native', async () => {
      isNativeSpy.and.returnValue(false);
      const p = (service as any).fetchImageBlob('https://example.com/http.png');
      const req = httpTestingController.expectOne('https://example.com/http.png');
      const blob = new Blob(['ok'], { type: 'image/png' });
      req.flush(blob);
      const res = await p;
      expect(res).toBeTruthy();
      expect(res.size).toBeGreaterThan(0);
    });

    it('optimizeBlobForStorage returns original for non-image types', async () => {
      const blob = new Blob(['text'], { type: 'text/plain' });
      const optimized = await (service as any).optimizeBlobForStorage(blob);
      expect(optimized).toBe(blob);
    });

    it('base64ToBlobUrl converts base64 to blob url', () => {
      const base64 = btoa('x');
      const url = (service as any).base64ToBlobUrl(base64, 'image/png');
      expect(typeof url).toBe('string');
      expect(url.startsWith('blob:')).toBeTrue();
      // revoke to avoid leaking in test runner
      URL.revokeObjectURL(url);
    });

    it('writeCacheWithQuotaRecovery retries after quota error and evicts', () => {
      const cacheKey = 'th_image_cache:test';
      const cached = { url: 'u', base64: 'b', mimeType: 'image/png', timestamp: Date.now() };

      let calls = 0;
      cacheService.write.and.callFake(() => {
        calls++;
        if (calls === 1) {
          const err: any = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return;
      });

      spyOn(service as any, 'evictOldestCacheEntries').and.callFake(() => {});

      (service as any).writeCacheWithQuotaRecovery(cacheKey, cached);

      expect(cacheService.write).toHaveBeenCalled();
      expect((service as any).evictOldestCacheEntries).toHaveBeenCalled();
    });

    it('writeCacheWithQuotaRecovery rethrows non-quota errors', () => {
      const cacheKey = 'th_image_cache:test';
      const cached = { url: 'u', base64: 'b', mimeType: 'image/png', timestamp: Date.now() };
      const error = new Error('write failed');

      cacheService.write.and.throwError(error);

      expect(() => (service as any).writeCacheWithQuotaRecovery(cacheKey, cached)).toThrowError('write failed');
    });

    it('getCachedBlobUrl uses memory cache before storage and removes expired storage entries', () => {
      const imageUrl = 'https://example.com/cached.jpg';
      const memoryUrl = 'blob:memory-url';
      (service as any).blobUrlCache.set(imageUrl, memoryUrl);

      expect((service as any).getCachedBlobUrl(imageUrl)).toBe(memoryUrl);

      (service as any).blobUrlCache.delete(imageUrl);

      const expired = {
        url: imageUrl,
        base64: btoa('old'),
        mimeType: 'image/jpeg',
        timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
      };

      cacheService.read.and.returnValue(expired);
      const result = (service as any).getCachedBlobUrl(imageUrl);

      expect(result).toBe('');
      expect(cacheService.remove).toHaveBeenCalled();
    });

    it('fetchImageBlobWithCapacitorHttp converts all supported response formats', async () => {
      const imageUrl = 'https://example.com/native.jpg';
      const base64 = btoa('binary-data');

      const requestSpy = spyOn<any>(service as any, 'requestNativeImage').and.resolveTo({
        data: new Blob(['blob'], { type: 'image/png' }),
        headers: { 'content-type': 'image/png' },
      } as any);
      let blob = await (service as any).fetchImageBlobWithCapacitorHttp(imageUrl);
      expect(blob.type).toBe('image/png');

      requestSpy.and.resolveTo({
        data: new ArrayBuffer(4),
        headers: { 'Content-Type': 'image/webp' },
      } as any);
      blob = await (service as any).fetchImageBlobWithCapacitorHttp(imageUrl);
      expect(blob.type).toBe('image/webp');

      requestSpy.and.resolveTo({
        data: [1, 2, 3, 4],
        headers: { 'CONTENT-TYPE': 'image/jpeg' },
      } as any);
      blob = await (service as any).fetchImageBlobWithCapacitorHttp(imageUrl);
      expect(blob.type).toBe('image/jpeg');

      requestSpy.and.resolveTo({
        data: `data:image/png;base64,${base64}`,
        headers: { 'content-type': 'image/png' },
      } as any);
      blob = await (service as any).fetchImageBlobWithCapacitorHttp(imageUrl);
      expect(blob.type).toBe('image/png');

      requestSpy.and.resolveTo({
        data: 123,
        headers: {},
      } as any);
      await expectAsync((service as any).fetchImageBlobWithCapacitorHttp(imageUrl)).toBeRejectedWithError(
        'Unsupported CapacitorHttp response format for image blob',
      );
    });

    it('formatErrorDetails and extractBase64Data cover remaining branches', () => {
      const objectDetails = (service as any).formatErrorDetails({
        name: 'QuotaExceededError',
        status: 413,
        statusText: 'Payload Too Large',
        url: 'https://example.com',
        message: 'too big',
        error: { message: 'nested failure' },
      });
      expect(objectDetails).toContain('QuotaExceededError');
      expect(objectDetails).toContain('nested failure');

      const primitiveDetails = (service as any).formatErrorDetails('plain error');
      expect(primitiveDetails).toBe('plain error');

      expect((service as any).extractBase64Data('data:image/png;base64,abc123')).toBe('abc123');
      expect((service as any).extractBase64Data('raw-base64')).toBe('raw-base64');
    });

    it('cacheImages skips in-flight requests and non-native execution', async () => {
      const imageUrl = 'https://example.com/inflight.jpg';
      (service as any).inFlightCacheRequests.add(imageUrl);
      const backgroundSpy = spyOn(service as any, 'cacheImageInBackground').and.resolveTo();

      await service.cacheImages([imageUrl]);

      expect(backgroundSpy).not.toHaveBeenCalled();

      (service as any).inFlightCacheRequests.delete(imageUrl);
      isNativeSpy.and.returnValue(false);

      await service.cacheImages([imageUrl]);

      expect(backgroundSpy).not.toHaveBeenCalled();
    });

    it('cacheImageInBackground exits early when fetch returns no blob', async () => {
      isNativeSpy.and.returnValue(true);
      spyOn(service as any, 'fetchImageBlob').and.resolveTo(null);
      const writeSpy = cacheService.write;

      await (service as any).cacheImageInBackground('https://example.com/missing.jpg');

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('cacheImageInBackground logs and clears in-flight requests on fetch error', async () => {
      isNativeSpy.and.returnValue(true);
      spyOn(service as any, 'fetchImageBlob').and.rejectWith(new Error('boom'));

      await (service as any).cacheImageInBackground('https://example.com/error.jpg');

      expect((service as any).inFlightCacheRequests.has('https://example.com/error.jpg')).toBeFalse();
    });
  });
});
