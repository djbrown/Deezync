import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { DeezerService } from './deezer.service';
import { Playlist, User } from './model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'deezync';
  user?: User;
  playlists: Playlist[];

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    private deezer: DeezerService,
  ) {
    deezer.getUser().subscribe(user => this.user = user);
    this.playlists = [];
  }

  login(): void {
    this.deezer.login();
  }

  getPlaylists(): void {
    this.deezer.getPlaylists().subscribe((playlists: Playlist[]) => {
      this.playlists = playlists;
    });
  }
}
