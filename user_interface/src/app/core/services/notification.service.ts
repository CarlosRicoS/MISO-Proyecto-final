import { Injectable, NgZone } from '@angular/core';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Router } from '@angular/router';
import {
  FirebaseMessaging,
  type NotificationActionPerformedEvent,
  type NotificationReceivedEvent,
  type PermissionStatus,
} from '@capacitor-firebase/messaging';
import { BehaviorSubject, Subject, type Observable, map } from 'rxjs';

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_DATES_CHANGED'
  | 'PAYMENT_CONFIRMED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  message: string;
  receivedAt: string;
  iconName: string;
  iconColor: string;
  data: Record<string, unknown>;
}

export interface NotificationGroup {
  title: string;
  items: NotificationItem[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private initialized = false;
  private readonly listenerHandles: PluginListenerHandle[] = [];
  private readonly storageKey = 'th_notifications_history';
  private readonly logPrefix = '[NotificationService]';

  private readonly tokenSubject = new BehaviorSubject<string | null>(null);
  private readonly notificationReceivedSubject = new Subject<NotificationReceivedEvent>();
  private readonly notificationActionSubject = new Subject<NotificationActionPerformedEvent>();
  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>(this.readNotificationsFromSession());

  readonly token$ = this.tokenSubject.asObservable();
  readonly notificationReceived$ = this.notificationReceivedSubject.asObservable();
  readonly notificationActionPerformed$ = this.notificationActionSubject.asObservable();
  readonly notifications$ = this.notificationsSubject.asObservable();
  readonly groupedNotifications$: Observable<NotificationGroup[]> = this.notifications$.pipe(
    map((notifications) => this.buildNotificationGroups(notifications))
  );

  constructor(
    private zone: NgZone,
    private router: Router,
  ) {}

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

  getTimeLabel(receivedAt: string): string {
    return this.formatTimeLabel(new Date(receivedAt));
  }

  clearNotifications(): void {
    this.log('Clearing all stored notifications.');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    this.notificationsSubject.next([]);
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
          this.log(`notificationReceived listener fired. title=${event.notification?.title ?? 'n/a'} id=${event.notification?.id ?? 'n/a'}`);
          this.notificationReceivedSubject.next(event);
          this.storeNotificationEvent(event.notification);
        });
      })
    );

    this.listenerHandles.push(
      await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        this.zone.run(() => {
          this.log(`notificationActionPerformed listener fired. title=${event.notification?.title ?? 'n/a'} id=${event.notification?.id ?? 'n/a'}`);
          this.notificationActionSubject.next(event);
          if (event.notification) {
            this.storeNotificationEvent(event.notification);
          }
          void this.navigateFromNotification(event);
        });
      })
    );
    this.log('Firebase messaging listeners registered.');
  }

  private async navigateFromNotification(event: NotificationActionPerformedEvent): Promise<void> {
    const payload = this.readNotificationData(event.notification?.data);
    const bookingId = this.extractBookingId(payload);

    if (!bookingId) {
      this.log('Notification tap: bookingId missing, navigating to home.');
      await this.router.navigate(['/home']);
      return;
    }

    this.log(`Navigating to booking detail from notification. bookingId=${bookingId}`);
    await this.router.navigate(['/booking-detail'], {
      queryParams: { bookingId },
      state: { bookingId },
    });
  }

  private readNotificationData(data: unknown): Record<string, unknown> {
    if (!data) {
      return {};
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }

    if (typeof data === 'object') {
      return data as Record<string, unknown>;
    }

    return {};
  }

  private extractBookingId(payload: Record<string, unknown>): string {
    const directValue = payload['bookingId'] ?? payload['reservationId'] ?? payload['id'];
    const directId = typeof directValue === 'string' || typeof directValue === 'number'
      ? String(directValue).trim()
      : '';

    if (directId) {
      return directId;
    }

    const nestedRaw = payload['data'];
    const nested = this.readNotificationData(nestedRaw);
    const nestedValue = nested['bookingId'] ?? nested['reservationId'] ?? nested['id'];

    return typeof nestedValue === 'string' || typeof nestedValue === 'number'
      ? String(nestedValue).trim()
      : '';
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

  private storeNotificationEvent(notification: { id?: string; title?: string; body?: string; data?: unknown }): void {
    const item = this.createNotificationItem(notification);
    if (!item) {
      this.log('storeNotificationEvent skipped: notification item could not be created.');
      return;
    }

    const currentNotifications = this.notificationsSubject.value.filter((existing) => existing.id !== item.id);
    let nextNotifications = [item, ...currentNotifications];
    nextNotifications = this.removeOldNotifications(nextNotifications);
    this.persistNotifications(nextNotifications);
    this.notificationsSubject.next(nextNotifications);
    this.log(`Stored notification id=${item.id} type=${item.type} total=${nextNotifications.length}`);
  }

  private removeOldNotifications(notifications: NotificationItem[]): NotificationItem[] {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const filtered = notifications.filter((notification) => {
      const receivedAt = new Date(notification.receivedAt);
      return receivedAt >= sevenDaysAgo;
    });

    const removedCount = notifications.length - filtered.length;
    if (removedCount > 0) {
      this.log(`Removed ${removedCount} notifications older than 7 days.`);
    }

    return filtered;
  }

  private createNotificationItem(notification: { id?: string; title?: string; body?: string; data?: unknown }): NotificationItem | null {
    if (!notification) {
      return null;
    }

    const payload = this.readNotificationData(notification.data);
    const type = this.readNotificationType(payload);
    const title = notification.title ?? this.defaultTitleForType(type);
    const subtitle = this.readNotificationSubtitle(payload);
    const message = notification.body ?? '';
    const receivedAt = new Date().toISOString();
    const { iconName, iconColor } = this.iconForType(type);
    const id = this.notificationId(notification, payload);

    return {
      id,
      type,
      title,
      subtitle,
      message,
      receivedAt,
      iconName,
      iconColor,
      data: payload,
    };
  }

  private notificationId(notification: { id?: string; data?: unknown }, payload: Record<string, unknown>): string {
    const candidate = notification.id ?? payload['id'] ?? payload['bookingId'] ?? payload['reservationId'];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === 'number') {
      return String(candidate);
    }

    return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private readNotificationType(payload: Record<string, unknown>): NotificationType {
    const rawType = String(payload['type'] ?? payload['notificationType'] ?? '').trim().toUpperCase();
    return this.isValidNotificationType(rawType) ? rawType : 'BOOKING_CREATED';
  }

  private isValidNotificationType(value: string): value is NotificationType {
    return [
      'BOOKING_CREATED',
      'BOOKING_CONFIRMED',
      'BOOKING_REJECTED',
      'BOOKING_CANCELLED',
      'BOOKING_DATES_CHANGED',
      'PAYMENT_CONFIRMED',
    ].includes(value);
  }

  private readNotificationSubtitle(payload: Record<string, unknown>): string {
    const reservationId = payload['reservationId'] ?? payload['bookingId'] ?? payload['reference'];
    if (typeof reservationId === 'string' && reservationId.trim()) {
      return `Reservation #${reservationId.trim()}`;
    }

    if (typeof payload['subtitle'] === 'string' && payload['subtitle'].trim()) {
      return payload['subtitle'].trim();
    }

    return '';
  }

  private defaultTitleForType(type: NotificationType): string {
    switch (type) {
      case 'BOOKING_CREATED':
        return 'Booking created';
      case 'BOOKING_CONFIRMED':
        return 'Booking confirmed';
      case 'BOOKING_REJECTED':
        return 'Booking rejected';
      case 'BOOKING_CANCELLED':
        return 'Booking cancelled';
      case 'BOOKING_DATES_CHANGED':
        return 'Booking dates changed';
      case 'PAYMENT_CONFIRMED':
        return 'Payment confirmed';
    }
  }

  private iconForType(type: NotificationType): { iconName: string; iconColor: string } {
    switch (type) {
      case 'BOOKING_CREATED':
        return { iconName: 'receipt-outline', iconColor: '#2563EB' };
      case 'BOOKING_CONFIRMED':
        return { iconName: 'checkmark-circle-outline', iconColor: '#16A34A' };
      case 'BOOKING_REJECTED':
        return { iconName: 'close-circle-outline', iconColor: '#DC2626' };
      case 'BOOKING_CANCELLED':
        return { iconName: 'ban-outline', iconColor: '#F59E0B' };
      case 'BOOKING_DATES_CHANGED':
        return { iconName: 'calendar-outline', iconColor: '#F97316' };
      case 'PAYMENT_CONFIRMED':
        return { iconName: 'card-outline', iconColor: '#14B8A6' };
    }
  }

  private formatTimeLabel(date: Date): string {
    const now = new Date();
    const diffMilliseconds = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMilliseconds / 60000);

    if (minutes < 1) {
      return 'Just now';
    }
    if (minutes < 10) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (this.isToday(date, now)) {
      return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    }

    if (this.isYesterday(date, now)) {
      return `Yesterday at ${this.formatTime(date)}`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return this.formatDate(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private buildNotificationGroups(notifications: NotificationItem[]): NotificationGroup[] {
    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const thisWeekItems: NotificationItem[] = [];
    const now = new Date();

    notifications.forEach((notification) => {
      const receivedAt = new Date(notification.receivedAt);
      if (this.isToday(receivedAt, now)) {
        todayItems.push(notification);
        return;
      }
      if (this.isYesterday(receivedAt, now)) {
        yesterdayItems.push(notification);
        return;
      }
      if (this.isThisWeek(receivedAt, now)) {
        thisWeekItems.push(notification);
      }
    });

    const groups: NotificationGroup[] = [];
    if (todayItems.length) {
      groups.push({ title: 'Today', items: todayItems });
    }
    if (yesterdayItems.length) {
      groups.push({ title: 'Yesterday', items: yesterdayItems });
    }
    if (thisWeekItems.length) {
      groups.push({ title: 'This Week', items: thisWeekItems });
    }

    return groups;
  }

  private isToday(date: Date, reference: Date): boolean {
    return date.toDateString() === reference.toDateString();
  }

  private isYesterday(date: Date, reference: Date): boolean {
    const yesterday = new Date(reference);
    yesterday.setDate(reference.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  private isThisWeek(date: Date, reference: Date): boolean {
    const diffMilliseconds = reference.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(diffMilliseconds / 86400000);
    return diffDays > 1 && diffDays < 7;
  }

  private readNotificationsFromSession(): NotificationItem[] {
    if (typeof localStorage === 'undefined') {
      this.log('Local storage unavailable when reading notifications.');
      return [];
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.log('No notification history found in local storage.');
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as NotificationItem[];
      const notifications = Array.isArray(parsed) ? parsed : [];
      this.log(`Loaded ${notifications.length} stored notifications from local storage.`);
      
      // Clean up old notifications on initialization
      const cleanedNotifications = this.removeOldNotifications(notifications);
      if (cleanedNotifications.length < notifications.length) {
        this.persistNotifications(cleanedNotifications);
      }
      
      return cleanedNotifications;
    } catch (error) {
      this.log(`Failed to parse notification history from local storage: ${String(error)}`);
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  private persistNotifications(notifications: NotificationItem[]): void {
    if (typeof localStorage === 'undefined') {
      this.log('Local storage unavailable when persisting notifications.');
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(notifications));
    this.log(`Persisted ${notifications.length} notifications to local storage.`);
  }

  private async registerTokenOnBackend(token: string): Promise<void> {
    // TODO: Replace this placeholder with your backend API call.
    console.info(`${this.logPrefix} FCM token ready for backend registration.`, token);
  }

  private log(message: string): void {
    console.info(`${this.logPrefix} ${message}`);
  }
}
