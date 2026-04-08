import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: any;
  let routerMock: any;

  beforeEach(async () => {
    const activatedRouteMock = {
      snapshot: { data: {} },
      firstChild: null,
    } as unknown as ActivatedRoute;

    routerMock = {
      events: of(),
      url: '/',
    } as Partial<Router>;

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should return true for isPropertyDetailRoute when on property detail page', () => {
    routerMock.url = '/propertydetail';
    expect(component.isPropertyDetailRoute).toBe(true);
  });

  it('should return true for isPropertyDetailRoute when URL starts with /propertydetail', () => {
    routerMock.url = '/propertydetail/123';
    expect(component.isPropertyDetailRoute).toBe(true);
  });

  it('should return false for isPropertyDetailRoute when not on property detail page', () => {
    routerMock.url = '/home';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

  it('should return false for isPropertyDetailRoute when on search results page', () => {
    routerMock.url = '/search-results';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

  it('should return false for isPropertyDetailRoute when on login page', () => {
    routerMock.url = '/login';
    expect(component.isPropertyDetailRoute).toBe(false);
  });

});
