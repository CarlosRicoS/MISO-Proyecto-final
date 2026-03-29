import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';

describe('AppComponent', () => {

  beforeEach(async () => {
    const activatedRouteMock = {
      root: {
        snapshot: { data: {} },
        firstChild: null,
      },
    } as unknown as ActivatedRoute;

    const routerMock = {
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

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
