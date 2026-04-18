import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'portal-hoteles-grid-card',
  templateUrl: './grid-card.component.html',
  styleUrls: ['./grid-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PortalHotelesGridCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() cardClass = '';
}
