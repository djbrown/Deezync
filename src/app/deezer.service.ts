import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Logger } from './logger.service';
import { Playlist, User } from './model';

const API_URL = '/api';
const BACKEND_URL = 'http://localhost:3000';

interface DataWrapper<T> {
    data: T;
}

@Injectable({ providedIn: 'root' })
export class DeezerService {

    constructor(
        private logger: Logger,
        private http: HttpClient,
    ) { }

    login(): void {
        window.location.href = `${BACKEND_URL}/login`;
    }

    getUser(): Observable<User> {
        const accessToken = encodeURIComponent(this.getAccessToken());
        return this.http.get<User>(`${API_URL}/user/me?access_token=${accessToken}`);
    }

    getPlaylists(): Observable<Playlist[]> {
        const accessToken = encodeURIComponent(this.getAccessToken());
        return this.http.get<DataWrapper<Playlist[]>>(`${API_URL}/user/me/playlists?access_token=${accessToken}`)
            .pipe(
                map((res: DataWrapper<Playlist[]>) => {
                    this.logger.log(res.data);
                    // todo max page size
                    // todo pagination
                    return res.data.sort(this.comparePlaylists);
                }),
                catchError(this.handleError<Playlist[]>('getPlaylists', []))
            );
    }

    private comparePlaylists(a: Playlist, b: Playlist): number {
        if (a.title < b.title) {
            return -1;
        }
        if (a.title > b.title) {
            return 1;
        }
        return 0;
    }

    getAccessToken(): string {
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
