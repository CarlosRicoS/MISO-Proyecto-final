// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowBack,
  airplaneOutline,
  logoGoogle,
  logoFacebook,
  searchOutline,
  search,
  heartOutline,
  heart,
  calendarOutline,
  personOutline,
  globeOutline,
  personCircleOutline,
  notificationsOutline,
  informationCircle,
  shareSocial,
  shareSocialOutline,
  location,
  locationOutline,
  moon,
  star,
  optionsOutline,
  swapVerticalOutline,
  createOutline,
  eyeOutline,
  eyeOffOutline,
  lockClosedOutline,
  mailOutline,
  peopleOutline,
  imagesOutline,
  chevronForward,
  wifiOutline,
  carOutline,
  waterOutline,
  barbellOutline,
  restaurantOutline,
  flowerOutline,
  snowOutline,
  cafeOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  sparklesOutline,
  receiptOutline,
  chevronDownOutline,
  shieldCheckmark,
  refreshCircle,
  pricetag,
  chevronDown,
  chevronUp,
  chevronUpOutline,
  bookOutline,
  helpOutline,
} from 'ionicons/icons';

// Register all icons used in the application for testing
addIcons({
  'arrow-back-outline': arrowBackOutline,
  'arrow-back': arrowBack,
  'airplane-outline': airplaneOutline,
  'logo-google': logoGoogle,
  'logo-facebook': logoFacebook,
  'search-outline': searchOutline,
  'search': search,
  'heart-outline': heartOutline,
  'heart': heart,
  'calendar-outline': calendarOutline,
  'person-outline': personOutline,
  'globe-outline': globeOutline,
  'person-circle-outline': personCircleOutline,
  'notifications-outline': notificationsOutline,
  'information-circle': informationCircle,
  'share-social': shareSocial,
  'share-social-outline': shareSocialOutline,
  'location': location,
  'location-outline': locationOutline,
  'moon': moon,
  'star': star,
  'options-outline': optionsOutline,
  'swap-vertical-outline': swapVerticalOutline,
  'create-outline': createOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'lock-closed-outline': lockClosedOutline,
  'mail-outline': mailOutline,
  'people-outline': peopleOutline,
  'images-outline': imagesOutline,
  'chevron-forward': chevronForward,
  'wifi-outline': wifiOutline,
  'car-outline': carOutline,
  'water-outline': waterOutline,
  'barbell-outline': barbellOutline,
  'restaurant-outline': restaurantOutline,
  'flower-outline': flowerOutline,
  'snow-outline': snowOutline,
  'cafe-outline': cafeOutline,
  'checkmark-circle': checkmarkCircle,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'sparkles-outline': sparklesOutline,
  'receipt-outline': receiptOutline,
  'chevron-down-outline': chevronDownOutline,
  'shield-checkmark': shieldCheckmark,
  'refresh-circle': refreshCircle,
  'pricetag': pricetag,
  'chevron-down': chevronDown,
  'chevron-up': chevronUp,
  'chevron-up-outline': chevronUpOutline,
  'book-outline': bookOutline,
  'spa-outline': flowerOutline,
  'icon': helpOutline,
});

const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const message = String(args[0] ?? '');
  if (message.includes('[Ionicons Warning]')) {
    return;
  }
  if (message.includes('[ion-datetime] - Unable to parse date string: null')) {
    return;
  }
  originalWarn(...args);
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
