import { Component, Input } from '@angular/core';

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
  standalone: false
})
export class ThBadgeComponent {
  @Input() variant: ThBadgeVariant = 'neutral';
  @Input() icon = '';

  get badgeClasses(): string[] {
    return ['th-badge', `th-badge--${this.variant}`];
  }
}
