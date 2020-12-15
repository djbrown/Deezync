import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { DeezerService } from './deezer.service';
import { Playlist, Track, User } from './model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'deezync';
  user?: User;
  playlists: Playlist[];
  duplicates: [Track, Playlist[]][];

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
    this.duplicates = [];
  }

  login(): void {
    this.deezer.login();
  }

  getPlaylists(): void {
    this.deezer.getPlaylists().subscribe((playlists: Playlist[]) => {
      this.playlists = playlists;
    });
  }

  findDuplicates(): void {
    this.duplicates = [];
    const groupedByTrack: Map<number, [Track, Playlist[]]> = this.playlists
      .reduce((acc: Map<number, [Track, Playlist[]]>, playlist: Playlist) => {
        playlist.tracks.forEach(track => {
          const entry = acc.get(track.id);
          const playlists = entry ? entry[1] : [];
          playlists.push(playlist);
          acc.set(track.id, [track, playlists]);
        });
        return acc;
      }, new Map());
    this.duplicates = [...groupedByTrack.entries()]
      .filter(([, [, playlists]]) => {
        return playlists.length > 1;
      })
      .reduce((acc: [Track, Playlist[]][], entry: [number, [Track, Playlist[]]]) => {
        acc.push([entry[1][0], entry[1][1]]);
        return acc;
      }, []);

    console.log(this.duplicates);
  }
}
