import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ErrorResponse {
  error: {
    code: number;
    message: string;
    type: string;
  };
}

function instanceOfErrorResponse(object: any): object is ErrorResponse {
  return (object as ErrorResponse).error !== undefined;
}


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && instanceOfErrorResponse(event)) {
          console.error(event);
          throw new HttpErrorResponse({
            error: event.body.error,
            headers: event.headers,
            status: event.status,
            statusText: event.statusText,
            url: event.url || undefined,
          });
        }
        return event;
      })
    );
  }
}
