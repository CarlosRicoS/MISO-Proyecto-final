import { TestBed } from '@angular/core/testing';
import { ThDetailsMosaicComponent } from './th-details-mosaic.component';

describe('ThDetailsMosaicComponent', () => {
  it('uses totalPhotos when provided', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [
      { src: 'one.jpg', alt: 'one' },
      { src: 'two.jpg', alt: 'two' },
    ];
    component.totalPhotos = 24;

    expect(component.effectiveTotalPhotos).toBe(24);
  });

  it('falls back to images length when totalPhotos is zero', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [
      { src: 'one.jpg', alt: 'one' },
      { src: 'two.jpg', alt: 'two' },
      { src: 'three.jpg', alt: 'three' },
    ];
    component.totalPhotos = 0;

    expect(component.effectiveTotalPhotos).toBe(3);
  });

  it('returns 0/0 when there are no images', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [];

    expect(component.currentPhotoText).toBe('0/0');
    expect(component.selectedImage).toBeNull();
  });

  it('builds current photo text with selected index and effective total', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [
      { src: 'one.jpg', alt: 'one' },
      { src: 'two.jpg', alt: 'two' },
    ];
    component.totalPhotos = 10;
    component.selectedIndex = 1;

    expect(component.currentPhotoText).toBe('2/10');
  });

  it('falls back to first image when selected index is out of range', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [
      { src: 'one.jpg', alt: 'one' },
      { src: 'two.jpg', alt: 'two' },
    ];
    component.selectedIndex = 999;

    expect(component.selectedImage).toEqual(component.images[0]);
  });

  it('updates selected index only for valid values', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;

    component.images = [
      { src: 'one.jpg', alt: 'one' },
      { src: 'two.jpg', alt: 'two' },
    ];

    component.selectImage(-1);
    expect(component.selectedIndex).toBe(0);

    component.selectImage(2);
    expect(component.selectedIndex).toBe(0);

    component.selectImage(1);
    expect(component.selectedIndex).toBe(1);
  });

  it('emits viewAll when triggerViewAll is called', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailsMosaicComponent],
    });

    const fixture = TestBed.createComponent(ThDetailsMosaicComponent);
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.viewAll, 'emit');

    component.triggerViewAll();

    expect(emitSpy).toHaveBeenCalled();
  });
});
