import { Injectable, NgZone } from '@angular/core';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  FirebaseMessaging,
  type NotificationActionPerformedEvent,
  type NotificationReceivedEvent,
  type PermissionStatus,
} from '@capacitor-firebase/messaging';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private initialized = false;
  private readonly listenerHandles: PluginListenerHandle[] = [];

  private readonly tokenSubject = new BehaviorSubject<string | null>(null);
  private readonly notificationReceivedSubject = new Subject<NotificationReceivedEvent>();
  private readonly notificationActionSubject = new Subject<NotificationActionPerformedEvent>();

  readonly token$ = this.tokenSubject.asObservable();
  readonly notificationReceived$ = this.notificationReceivedSubject.asObservable();
  readonly notificationActionPerformed$ = this.notificationActionSubject.asObservable();

  constructor(private zone: NgZone) {}

  async initialize(): Promise<void> {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const support = await FirebaseMessaging.isSupported();
      if (!support.isSupported) {
        return;
      }

      const permissions = await this.ensurePermissions();
      if (permissions.receive !== 'granted') {
        return;
      }

      const tokenResult = await FirebaseMessaging.getToken();
      this.handleToken(tokenResult.token);

      await this.registerListeners();
      this.initialized = true;
    } catch (error) {
      console.error('[NotificationService] Failed to initialize notifications.', error);
    }
  }

  async teardown(): Promise<void> {
    while (this.listenerHandles.length > 0) {
      const handle = this.listenerHandles.pop();
      await handle?.remove();
    }

    this.initialized = false;
  }

  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  private async ensurePermissions(): Promise<PermissionStatus> {
    const currentPermissions = await FirebaseMessaging.checkPermissions();
    if (currentPermissions.receive === 'granted') {
      return currentPermissions;
    }

    return FirebaseMessaging.requestPermissions();
  }

  private async registerListeners(): Promise<void> {
    this.listenerHandles.push(
      await FirebaseMessaging.addListener('tokenReceived', (event) => {
        this.zone.run(() => {
          this.handleToken(event.token);
        });
      })
    );

    this.listenerHandles.push(
      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        this.zone.run(() => {
          this.notificationReceivedSubject.next(event);
        });
      })
    );

    this.listenerHandles.push(
      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        this.zone.run(() => {
          this.notificationActionSubject.next(event);
        });
      })
    );
  }

  private handleToken(token: string): void {
    if (!token || this.tokenSubject.value === token) {
      return;
    }

    this.tokenSubject.next(token);
    void this.registerTokenOnBackend(token);
  }

  private async registerTokenOnBackend(token: string): Promise<void> {
    // TODO: Replace this placeholder with your backend API call.
    console.info('[NotificationService] FCM token ready for backend registration.', token);
  }
}