import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface ThDetailsMosaicImage {
  src: string;
  alt?: string;
}

@Component({
  selector: 'th-details-mosaic',
  templateUrl: './th-details-mosaic.component.html',
  styleUrls: ['./th-details-mosaic.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThDetailsMosaicComponent {
  private static readonly DESKTOP_IMAGE_LIMIT = 4;

  @Input() hotelName = 'Hotel';
  @Input() images: ThDetailsMosaicImage[] = [];
  @Input() totalPhotos = 0;
  @Input() viewAllLabel = 'View all photos';
  @Output() viewAll = new EventEmitter<void>();

  selectedIndex = 0;

  get effectiveTotalPhotos(): number {
    return this.totalPhotos > 0 ? this.totalPhotos : this.images.length;
  }

  get currentPhotoText(): string {
    if (!this.images.length) {
      return '0/0';
    }

    return `${this.selectedIndex + 1}/${this.effectiveTotalPhotos}`;
  }

  get selectedImage(): ThDetailsMosaicImage | null {
    if (!this.images.length) {
      return null;
    }

    return this.images[this.selectedIndex] ?? this.images[0];
  }

  get desktopImages(): ThDetailsMosaicImage[] {
    return this.images.slice(0, ThDetailsMosaicComponent.DESKTOP_IMAGE_LIMIT);
  }

  get shouldShowDesktopViewAll(): boolean {
    return this.effectiveTotalPhotos > this.desktopImages.length;
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.images.length) {
      return;
    }

    this.selectedIndex = index;
  }

  triggerViewAll(): void {
    this.viewAll.emit();
  }
}