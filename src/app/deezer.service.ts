import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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
        return this.http.get<Playlist[]>(`${API_URL}/user/me/playlists`);
    }

    getAccessToken(): string {
        const accessToken = this.getCookie('accessToken');
        if (accessToken) {
            return accessToken;
        } else {
            this.login();
            throw new Error('login not working');
        }
    }

    private getCookie(cookieName: string): string | null {
        let cookieValue: string | null = null;
        document.cookie.split('; ').forEach((cookieLine: string) => {
            if (cookieLine.startsWith(`${cookieName}=`)) {
                cookieValue = cookieValue || cookieLine.split('=')[1];
            }
        });
        return cookieValue;
    }
}
