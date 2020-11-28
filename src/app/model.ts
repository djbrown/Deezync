import { Optional } from '@angular/core';

export interface Album {
    id: number;
    title: string;
    artist: Artist;
    tracks: Track[];
}

export interface Artist {
    id: number;
    name: string;
}

export interface Playlist {
    id: number;
    title: string;
    creator: User;
    tracks: Track[];
}

export interface Track {
    id: number;
    title: string;
    artist: Artist;
    album: Album;
}

export interface User {
    id: number;
    name: string;
}
