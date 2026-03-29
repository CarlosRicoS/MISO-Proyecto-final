import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type ThBadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'rating'
  | 'neutral';

@Component({
  selector: 'th-badge',
  templateUrl: './th-badge.component.html',
  styleUrls: ['./th-badge.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ThBadgeComponent {
  @Input() variant: ThBadgeVariant = 'neutral';
  @Input() icon = '';

  get badgeClasses(): string[] {
    return ['th-badge', `th-badge--${this.variant}`];
  }
}
