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
  private readonly logPrefix = '[NotificationService]';

  private readonly tokenSubject = new BehaviorSubject<string | null>(null);
  private readonly notificationReceivedSubject = new Subject<NotificationReceivedEvent>();
  private readonly notificationActionSubject = new Subject<NotificationActionPerformedEvent>();

  readonly token$ = this.tokenSubject.asObservable();
  readonly notificationReceived$ = this.notificationReceivedSubject.asObservable();
  readonly notificationActionPerformed$ = this.notificationActionSubject.asObservable();

  constructor(private zone: NgZone) {}

  async initialize(): Promise<void> {
    this.log('initialize() called.');

    if (this.initialized) {
      this.log('Initialization skipped: already initialized.');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      this.log('Initialization skipped: not running on a native platform.');
      return;
    }

    try {
      const support = await FirebaseMessaging.isSupported();
      this.log(`FirebaseMessaging.isSupported() => ${String(support.isSupported)}`);
      if (!support.isSupported) {
        this.log('Initialization stopped: Firebase messaging not supported in this runtime.');
        return;
      }

      const permissions = await this.ensurePermissions();
      this.log(`Permissions status after ensurePermissions() => ${permissions.receive}`);
      if (permissions.receive !== 'granted') {
        this.log('Initialization stopped: notification permission not granted.');
        return;
      }

      const tokenResult = await FirebaseMessaging.getToken();
      this.log(`Token received from getToken(). Empty=${String(!tokenResult.token)}`);
      this.handleToken(tokenResult.token);

      await this.registerListeners();
      this.initialized = true;
      this.log('Initialization completed successfully.');
    } catch (error) {
      console.error(`${this.logPrefix} Failed to initialize notifications.`, error);
    }
  }

  async teardown(): Promise<void> {
    this.log('teardown() called.');
    while (this.listenerHandles.length > 0) {
      const handle = this.listenerHandles.pop();
      await handle?.remove();
    }

    this.initialized = false;
    this.log('teardown() completed.');
  }

  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  private async ensurePermissions(): Promise<PermissionStatus> {
    const currentPermissions = await FirebaseMessaging.checkPermissions();
    this.log(`checkPermissions() => ${currentPermissions.receive}`);
    if (currentPermissions.receive === 'granted') {
      return currentPermissions;
    }

    const requestedPermissions = await FirebaseMessaging.requestPermissions();
    this.log(`requestPermissions() => ${requestedPermissions.receive}`);
    return requestedPermissions;
  }

  private async registerListeners(): Promise<void> {
    this.log('Registering Firebase messaging listeners.');
    this.listenerHandles.push(
      await FirebaseMessaging.addListener('tokenReceived', (event) => {
        this.zone.run(() => {
          this.log('tokenReceived listener fired.');
          this.handleToken(event.token);
        });
      })
    );

    this.listenerHandles.push(
      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        this.zone.run(() => {
          this.log('notificationReceived listener fired.');
          this.notificationReceivedSubject.next(event);
        });
      })
    );

    this.listenerHandles.push(
      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        this.zone.run(() => {
          this.log('notificationActionPerformed listener fired.');
          this.notificationActionSubject.next(event);
        });
      })
    );
    this.log('Firebase messaging listeners registered.');
  }

  private handleToken(token: string): void {
    if (!token || this.tokenSubject.value === token) {
      this.log('handleToken() skipped: empty token or unchanged token.');
      return;
    }

    this.log('handleToken() accepted new token.');
    this.tokenSubject.next(token);
    void this.registerTokenOnBackend(token);
  }

  private async registerTokenOnBackend(token: string): Promise<void> {
    // TODO: Replace this placeholder with your backend API call.
    console.info(`${this.logPrefix} FCM token ready for backend registration.`, token);
  }

  private log(message: string): void {
    console.info(`${this.logPrefix} ${message}`);
  }
}