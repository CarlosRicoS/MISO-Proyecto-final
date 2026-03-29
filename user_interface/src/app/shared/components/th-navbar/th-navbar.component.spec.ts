import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ThNavbarComponent } from './th-navbar.component';

class RouterMock {
  url = '/search-results';
}

describe('ThNavbarComponent', () => {
  it('detects search results route', () => {
    TestBed.configureTestingModule({
      imports: [ThNavbarComponent],
      providers: [{ provide: Router, useClass: RouterMock }],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeTrue();
  });

  it('returns false for non-results routes', () => {
    TestBed.configureTestingModule({
      imports: [ThNavbarComponent],
      providers: [{ provide: Router, useValue: { url: '/home' } }],
    });

    const fixture = TestBed.createComponent(ThNavbarComponent);
    const component = fixture.componentInstance;

    expect(component.isSearchResults).toBeFalse();
  });
});
