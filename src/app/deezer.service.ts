import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Logger } from './logger.service';
import { Playlist, User } from './model';

const API_URL = '/api';
const BACKEND_URL = 'http://localhost:3000';


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
        return this.http.get<Playlist[]>(`${API_URL}/user/me/playlists?access_token=${accessToken}`)
            .pipe(
                tap(_ => this.logger.log('fetched playlists')),
                catchError(this.handleError<Playlist[]>('getPlaylists', []))
            );
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
