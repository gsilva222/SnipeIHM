import { Component } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-logo',
  templateUrl: 'logo.page.html',
  styleUrls: ['logo.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton],
})
export class LogoPage {
  constructor() {}
}
