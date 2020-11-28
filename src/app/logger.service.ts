import { Injectable } from '@angular/core';


@Injectable({
    providedIn: 'root'
})
export class Logger {
    log(msg: any): void { console.log(msg); }
    error(msg: any): void { console.error(msg); }
    warn(msg: any): void { console.warn(msg); }
}
