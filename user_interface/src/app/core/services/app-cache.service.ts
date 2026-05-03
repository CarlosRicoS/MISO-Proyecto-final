import { Injectable } from '@angular/core';

const memoryStorage = new Map<string, string>();

@Injectable({ providedIn: 'root' })
export class AppCacheService {
  read<T>(key: string): T | null {
    const rawValue = this.readRaw(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      this.remove(key);
      return null;
    }
  }

  write<T>(key: string, value: T): void {
    this.writeRaw(key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }

    memoryStorage.delete(key);
  }

  private readRaw(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
  }

  private writeRaw(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  }
}