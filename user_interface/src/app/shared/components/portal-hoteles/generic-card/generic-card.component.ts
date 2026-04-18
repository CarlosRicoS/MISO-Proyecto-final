import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'portal-hoteles-generic-card',
  templateUrl: './generic-card.component.html',
  styleUrls: ['./generic-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PortalHotelesGenericCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() emptyLabel = 'Placeholder';
}
