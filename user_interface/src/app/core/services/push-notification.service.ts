import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  constructor() {
    if (Capacitor.getPlatform() !== 'web') {
      this.registerListeners();
    }
  }

  private registerListeners() {
    console.log('PushNotificationService: Registering listeners in constructor...');

    PushNotifications.addListener('registration',
      (token) => {
        console.warn('PushNotificationService: REGISTRATION SUCCESS! Token:', token.value);
        // Guardar el token si es necesario o enviarlo al backend
      }
    );

    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('PushNotificationService: REGISTRATION ERROR:', JSON.stringify(error));
      }
    );

    PushNotifications.addListener('pushNotificationReceived',
      (notification) => {
        console.warn('PushNotificationService: NOTIFICATION RECEIVED:', JSON.stringify(notification));
      }
    );

    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification) => {
        console.warn('PushNotificationService: ACTION PERFORMED:', JSON.stringify(notification));
      }
    );
  }

  public async initPush() {
    console.log('PushNotificationService: initPush called');
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      console.log('PushNotificationService: Skipping on web');
      return;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      console.log('PushNotificationService: Current permissions:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        console.log('PushNotificationService: Calling register()');
        await PushNotifications.register();
      } else {
        console.error('PushNotificationService: Permissions not granted:', permStatus.receive);
      }

      if (platform === 'android') {
        await this.createDefaultChannel();
      }

      await this.checkDeliveredNotifications();
    } catch (error) {
      console.error('PushNotificationService: Error during init:', error);
    }
  }

  private async createDefaultChannel() {
    try {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Default',
        description: 'Default notification channel',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      console.log('PushNotificationService: Default channel created');
    } catch (error) {
      console.error('PushNotificationService: Error creating channel:', error);
    }
  }

  private async checkDeliveredNotifications() {
    const delivered = await PushNotifications.getDeliveredNotifications();
    if (delivered.notifications.length > 0) {
      console.log('Delivered notifications on start:', delivered.notifications);
    }
  }
}
