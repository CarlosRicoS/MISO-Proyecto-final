import { Component, OnInit } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonCol, IonContent, IonGrid, IonRow } from '@ionic/angular/standalone';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonCardContent, IonContent, IonGrid, IonRow, IonCol, IonCard, IonButton, SharedModule]
})
export class LoginPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
