import { Injectable } from '@angular/core';

export interface PendingBookingState {
  returnUrl: string;
  propertyId: string;
  checkInValue: string;
  checkOutValue: string;
  guestsValue: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class PendingBookingService {
  private readonly storageKey = 'th_pending_booking';
  private readonly ttlMs = 2 * 60 * 60 * 1000;

  setPendingBooking(state: Omit<PendingBookingState, 'createdAt'>): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const nextState: PendingBookingState = {
      ...state,
      createdAt: Date.now(),
    };

    sessionStorage.setItem(this.storageKey, JSON.stringify(nextState));
  }

  consumePendingBookingForProperty(propertyId: string): PendingBookingState | null {
    const state = this.readState();
    if (!state) {
      return null;
    }

    if (state.propertyId !== propertyId) {
      return null;
    }

    this.clearPendingBooking();
    return state;
  }

  clearPendingBooking(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.storageKey);
    }
  }

  private readState(): PendingBookingState | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as PendingBookingState;

      if (!parsed?.propertyId || !parsed?.createdAt) {
        this.clearPendingBooking();
        return null;
      }

      if (Date.now() - parsed.createdAt > this.ttlMs) {
        this.clearPendingBooking();
        return null;
      }

      return parsed;
    } catch {
      this.clearPendingBooking();
      return null;
    }
  }
}
