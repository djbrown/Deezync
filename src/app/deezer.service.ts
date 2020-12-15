import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, expand, map, reduce, tap } from 'rxjs/operators';
import { Logger } from './logger.service';
import { Playlist, Track, User } from './model';

const API_URL = '/api';
const BACKEND_URL = 'http://localhost:3000';

interface DataWrapper<T> {
    data: T;
    next?: string;
}

@Injectable({ providedIn: 'root' })
export class DeezerService {

    constructor(
        private logger: Logger,
        private http: HttpClient,
    ) { }

    private user!: User;

    login(): void {
        window.location.href = `${BACKEND_URL}/login`;
    }

    getUser(): Observable<User> {
        if (this.user) {
            return of(this.user);
        }
        const accessToken = encodeURIComponent(this.getAccessToken());
        const $user = this.http.get<User>(`${API_URL}/user/me?access_token=${accessToken}`);
        $user.subscribe(user => this.user = user);
        return $user;
    }

    getPlaylists(): Observable<Playlist[]> {
        return this.fetchPlaylists().pipe(
            expand((res: DataWrapper<Playlist[]>) => {
                if (res.next) {
                    const next = new URL(res.next);
                    const index = Number(next.searchParams.get('index'));
                    const limit = Number(next.searchParams.get('limit'));
                    return this.fetchPlaylists(index, limit);
                }
                return EMPTY;
            }),
            reduce((acc: Playlist[], res: DataWrapper<Playlist[]>) => acc.concat(res.data), []),
            map(playlists => playlists.filter(playlist => playlist.creator.id === this.user.id)),
            map(playlists => playlists.sort((a, b) => a.title.localeCompare(b.title))),
            tap(playlists => playlists.forEach(playlist => {
                this.getTracks(playlist).subscribe(tracks => playlist.tracks = tracks);
            })),
        );
    }

    private fetchPlaylists(index = 0, limit = 100): Observable<DataWrapper<Playlist[]>> {
        const accessToken = encodeURIComponent(this.getAccessToken());
        const url = `${API_URL}/user/me/playlists?access_token=${accessToken}&limit=${limit}&index=${index}`;
        const params = new HttpParams();
        return this.http.get<DataWrapper<Playlist[]>>(url, { params }).pipe(
            catchError(this.handleError<DataWrapper<Playlist[]>>('fetchPlaylists', { data: [] }))
        );
    }

    getTracks(playlist: Playlist): Observable<Track[]> {
        return this.fetchTracks(playlist).pipe(
            expand((res: DataWrapper<Track[]>) => {
                if (res.next) {
                    const next = new URL(res.next);
                    const index = Number(next.searchParams.get('index'));
                    const limit = Number(next.searchParams.get('limit'));
                    return this.fetchTracks(playlist, index, limit);
                }
                return EMPTY;
            }),
            reduce((acc: Track[], res: DataWrapper<Track[]>) => acc.concat(res.data), []),
            map(tracks => tracks.sort((a, b) => a.title.localeCompare(b.title))),
        );
    }

    private fetchTracks(playlist: Playlist, index = 0, limit = 1000): Observable<DataWrapper<Track[]>> {
        const accessToken = encodeURIComponent(this.getAccessToken());
        const url = `${API_URL}/playlist/${playlist.id}/tracks?access_token=${accessToken}&limit=${limit}&index=${index}`;
        const params = new HttpParams();
        return this.http.get<DataWrapper<Track[]>>(url, { params }).pipe(
            catchError(this.handleError<DataWrapper<Track[]>>('fetchTracks', { data: [] }))
        );
    }

    private getAccessToken(): string {
        const accessToken = this.getCookie('accessToken');
        const expires = this.getCookie('expires');
        if (accessToken && expires) {
            const expirationMillis = Date.parse(expires.substring(3, 27));
            if (expirationMillis > Date.now()) {
                return accessToken;
            }
        }
        this.login();
        return '';
    }

    private getCookie(cookieName: string): string | null {
        const cookieLine = document.cookie.split('; ')
            .find((line: string) =>
                line.startsWith(`${cookieName}=`)
            );
        return decodeURIComponent(cookieLine?.split('=')[1] || '') || null;
    }

    private handleError<T>(operation = 'operation', result?: T): (err: any) => Observable<T> {
        return (error: any): Observable<T> => {
            if (error.type === 'OAuthException') {
                console.error('unauthorired');
                // TODO: get new accessToken
            }
            this.logger.error(error);
            this.logger.log(`${operation} failed: ${error.message}`);
            return of(result as T);
        };
    }
}
