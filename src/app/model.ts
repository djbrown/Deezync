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
    link: string;
    is_loved_track: boolean;
}

export interface Track {
    id: number;
    title: string;
    artist: Artist;
    album: Album;
    link: string;
}

export interface User {
    id: number;
    name: string;
}
