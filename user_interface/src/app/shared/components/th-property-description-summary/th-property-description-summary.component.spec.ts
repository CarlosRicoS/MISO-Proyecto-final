/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThPropertyDescriptionSummaryComponent } from './th-property-description-summary.component';

describe('ThPropertyDescriptionSummaryComponent', () => {
  it('exposes whether mobile has extra paragraphs', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThPropertyDescriptionSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThPropertyDescriptionSummaryComponent);
    const component = fixture.componentInstance;

    component.mobilePreviewParagraphCount = 2;
    component.paragraphs = ['A', 'B', 'C'];

    fixture.detectChanges();

    expect(component.hasMoreParagraphs).toBeTrue();
  });

  it('toggles expanded state', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThPropertyDescriptionSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThPropertyDescriptionSummaryComponent);
    const component = fixture.componentInstance;

    expect(component.isExpanded).toBeFalse();

    component.toggleExpanded();

    expect(component.isExpanded).toBeTrue();
  });
});
