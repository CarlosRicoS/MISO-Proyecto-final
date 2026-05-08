import { AppCacheService } from './app-cache.service';

describe('AppCacheService', () => {
  let service: AppCacheService;
  let localStorageGetItemSpy: jasmine.Spy;
  let localStorageSetItemSpy: jasmine.Spy;
  let localStorageRemoveItemSpy: jasmine.Spy;

  beforeEach(() => {
    service = new AppCacheService();
    localStorageGetItemSpy = spyOn(localStorage, 'getItem').and.returnValue(null);
    localStorageSetItemSpy = spyOn(localStorage, 'setItem').and.stub();
    localStorageRemoveItemSpy = spyOn(localStorage, 'removeItem').and.stub();
  });

  it('returns null when the key does not exist', () => {
    expect(service.read('missing-key')).toBeNull();
    expect(localStorageGetItemSpy).toHaveBeenCalledWith('missing-key');
  });

  it('writes values as JSON to localStorage', () => {
    service.write('booking', { id: 'res-1', guests: 2 });

    expect(localStorageSetItemSpy).toHaveBeenCalledWith('booking', JSON.stringify({ id: 'res-1', guests: 2 }));
  });

  it('reads and parses JSON values from localStorage', () => {
    localStorageGetItemSpy.and.returnValue(JSON.stringify({ id: 'res-1', guests: 2 }));

    const value = service.read<{ id: string; guests: number }>('booking');

    expect(value).toEqual({ id: 'res-1', guests: 2 });
  });

  it('removes invalid JSON and returns null when parsing fails', () => {
    localStorageGetItemSpy.and.returnValue('not-json');

    const value = service.read('booking');

    expect(value).toBeNull();
    expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('booking');
  });

  it('removes entries from localStorage', () => {
    service.remove('booking');

    expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('booking');
  });
});