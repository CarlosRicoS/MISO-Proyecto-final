import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ThNotificationsListComponent } from './th-notifications-list.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';

class RouterMock {
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);
}

describe('ThNotificationsListComponent', () => {
  let component: ThNotificationsListComponent;
  let fixture: ComponentFixture<ThNotificationsListComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const router = new RouterMock();

    await TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThNotificationsListComponent],
      providers: [
        NotificationService,
        { provide: Router, useValue: router },
        { provide: NgZone, useValue: new NgZone({ enableLongStackTrace: false }) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThNotificationsListComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have notificationService available', () => {
    expect(component.notificationService).toBeDefined();
    expect(component.notificationService).toBe(notificationService);
  });

  it('should render notification groups from input', () => {
    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            subtitle: 'Reservation #12345',
            message: 'Your booking has been confirmed',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const sectionTitle = compiled.querySelector('.th-notifications-list__section-title');

    expect(sectionTitle?.textContent).toContain('Today');
  });

  it('should call getTimeLabel from service when rendering notifications', () => {
    spyOn(notificationService, 'getTimeLabel').and.returnValue('5 min ago');

    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            subtitle: 'Reservation #12345',
            message: 'Your booking has been confirmed',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    expect(notificationService.getTimeLabel).toHaveBeenCalledWith(today);
  });

  it('should handle empty notification groups', () => {
    component.notificationGroups = [];
    fixture.detectChanges();
    const listContainer = fixture.nativeElement.querySelector('.th-notifications-list');

    expect(listContainer).toBeTruthy();
    expect(listContainer.children.length).toBe(0);
  });

  it('should render multiple notification groups with different sections', () => {
    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking 1',
            subtitle: 'Reservation #001',
            message: 'Test 1',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
          {
            id: 'test-2',
            type: 'BOOKING_CREATED',
            title: 'Booking 2',
            subtitle: 'Reservation #002',
            message: 'Test 2',
            receivedAt: today,
            iconName: 'receipt-outline',
            iconColor: '#2563EB',
            data: {},
          },
        ],
      },
      {
        title: 'Yesterday',
        items: [
          {
            id: 'test-3',
            type: 'BOOKING_REJECTED',
            title: 'Booking 3',
            subtitle: 'Reservation #003',
            message: 'Test 3',
            receivedAt: today,
            iconName: 'close-circle-outline',
            iconColor: '#DC2626',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    const sectionTitles = fixture.nativeElement.querySelectorAll(
      '.th-notifications-list__section-title'
    );

    expect(sectionTitles.length).toBe(2);
    expect(sectionTitles[0].textContent).toContain('Today');
    expect(sectionTitles[1].textContent).toContain('Yesterday');
  });

  it('should render correct number of items per group', () => {
    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking 1',
            subtitle: 'Reservation #001',
            message: 'Test 1',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
          {
            id: 'test-2',
            type: 'BOOKING_CREATED',
            title: 'Booking 2',
            subtitle: 'Reservation #002',
            message: 'Test 2',
            receivedAt: today,
            iconName: 'receipt-outline',
            iconColor: '#2563EB',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.th-notifications-list__item');

    expect(items.length).toBe(2);
  });

  it('should pass correct receivedAt to getTimeLabel for each item', () => {
    spyOn(notificationService, 'getTimeLabel').and.callThrough();

    const timestamp1 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const timestamp2 = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking 1',
            subtitle: 'Reservation #001',
            message: 'Test 1',
            receivedAt: timestamp1,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
          {
            id: 'test-2',
            type: 'BOOKING_CREATED',
            title: 'Booking 2',
            subtitle: 'Reservation #002',
            message: 'Test 2',
            receivedAt: timestamp2,
            iconName: 'receipt-outline',
            iconColor: '#2563EB',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();

    expect(notificationService.getTimeLabel).toHaveBeenCalledWith(timestamp1);
    expect(notificationService.getTimeLabel).toHaveBeenCalledWith(timestamp2);
    // Note: getTimeLabel is called multiple times due to Angular change detection cycles
    expect(notificationService.getTimeLabel).toHaveBeenCalled();
  });

  it('should display correct message for each notification', () => {
    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed',
            subtitle: 'Reservation #12345',
            message: 'Your booking has been confirmed successfully',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    const messageElement = fixture.nativeElement.querySelector('.th-notifications-list__item-message');

    expect(messageElement?.textContent).toContain('Your booking has been confirmed successfully');
  });

  it('should render notification with different icon colors', () => {
    const today = new Date().toISOString();
    component.notificationGroups = [
      {
        title: 'Today',
        items: [
          {
            id: 'test-1',
            type: 'BOOKING_CONFIRMED',
            title: 'Confirmed',
            subtitle: 'Res #1',
            message: 'Test',
            receivedAt: today,
            iconName: 'checkmark-circle-outline',
            iconColor: '#16A34A',
            data: {},
          },
          {
            id: 'test-2',
            type: 'BOOKING_REJECTED',
            title: 'Rejected',
            subtitle: 'Res #2',
            message: 'Test',
            receivedAt: today,
            iconName: 'close-circle-outline',
            iconColor: '#DC2626',
            data: {},
          },
        ],
      },
    ];

    fixture.detectChanges();
    const avatars = fixture.nativeElement.querySelectorAll('.th-notifications-list__item-icon');

    expect(avatars[0].style.background).toBe('rgb(22, 163, 74)'); // #16A34A
    expect(avatars[1].style.background).toBe('rgb(220, 38, 38)'); // #DC2626
  });
});
