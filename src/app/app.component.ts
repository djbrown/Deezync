import { Component } from '@angular/core';
import { DeezerService } from './deezer.service';
import { User } from './model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  user?: User;

  constructor(
    private deezer: DeezerService,
  ) {
    deezer.getUser().subscribe(user => this.user = user);
  }

  login(): void {
    this.deezer.login();
  }
}
